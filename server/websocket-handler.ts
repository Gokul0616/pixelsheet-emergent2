import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  username?: string;
  spreadsheetId?: number;
  isAlive?: boolean;
}

interface ConnectedUser {
  userId: number;
  username: string;
  ws: AuthenticatedWebSocket;
  currentCell?: { row: number; column: number };
  color: string;
  lastSeen: Date;
}

class WebSocketManager {
  private connections = new Map<number, Map<number, ConnectedUser>>(); // spreadsheetId -> userId -> ConnectedUser
  private userColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];

  constructor() {
    // Heartbeat to detect disconnected clients
    setInterval(() => {
      this.connections.forEach((spreadsheetUsers) => {
        spreadsheetUsers.forEach((user) => {
          if (user.ws.isAlive === false) {
            this.removeUser(user.userId, user.ws.spreadsheetId!);
            return;
          }
          
          user.ws.isAlive = false;
          user.ws.ping();
        });
      });
    }, 30000); // 30 seconds
  }

  async handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage) {
    console.log('New WebSocket connection attempt');

    ws.isAlive = true;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data);
        await this.handleMessage(ws, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });

    ws.on('close', () => {
      if (ws.userId && ws.spreadsheetId) {
        this.removeUser(ws.userId, ws.spreadsheetId);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (ws.userId && ws.spreadsheetId) {
        this.removeUser(ws.userId, ws.spreadsheetId);
      }
    });
  }

  private async handleMessage(ws: AuthenticatedWebSocket, message: any) {
    const { type } = message;

    switch (type) {
      case 'join':
        await this.handleJoin(ws, message);
        break;
      case 'cursor_update':
        this.handleCursorUpdate(ws, message);
        break;
      case 'cell_update':
        this.handleCellUpdate(ws, message);
        break;
      case 'selection_update':
        this.handleSelectionUpdate(ws, message);
        break;
      case 'typing_start':
        this.handleTypingStart(ws, message);
        break;
      case 'typing_stop':
        this.handleTypingStop(ws, message);
        break;
      case 'formula_help':
        this.handleFormulaHelp(ws, message);
        break;
      default:
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: `Unknown message type: ${type}` 
        }));
    }
  }

  private async handleJoin(ws: AuthenticatedWebSocket, message: any) {
    const { userId, spreadsheetId, token } = message;

    if (!userId || !spreadsheetId) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'userId and spreadsheetId required' 
      }));
      return;
    }

    try {
      // Verify user access to spreadsheet
      const user = await storage.getUserById(userId);
      if (!user) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'User not found' 
        }));
        return;
      }

      // Check if user has access to the spreadsheet
      const hasAccess = await this.checkSpreadsheetAccess(userId, spreadsheetId);
      if (!hasAccess) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Access denied to spreadsheet' 
        }));
        return;
      }

      ws.userId = userId;
      ws.username = user.username;
      ws.spreadsheetId = spreadsheetId;

      // Add user to connections
      this.addUser(ws, user);

      // Send confirmation
      ws.send(JSON.stringify({ 
        type: 'joined',
        message: 'Successfully joined spreadsheet collaboration'
      }));

      // Notify other users
      this.broadcastToSpreadsheet(spreadsheetId, {
        type: 'user_joined',
        user: {
          id: userId,
          username: user.username,
          color: this.getUserColor(userId),
          isOnline: true
        }
      }, userId);

      // Send current online users to the new user
      const onlineUsers = this.getOnlineUsers(spreadsheetId);
      ws.send(JSON.stringify({
        type: 'online_users',
        users: onlineUsers
      }));

    } catch (error) {
      console.error('Join error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to join collaboration' 
      }));
    }
  }

  private handleCursorUpdate(ws: AuthenticatedWebSocket, message: any) {
    if (!ws.userId || !ws.spreadsheetId) return;

    const { cell } = message;
    
    // Update user's current cell
    const spreadsheetUsers = this.connections.get(ws.spreadsheetId);
    if (spreadsheetUsers) {
      const user = spreadsheetUsers.get(ws.userId);
      if (user) {
        user.currentCell = cell;
        user.lastSeen = new Date();
      }
    }

    // Broadcast cursor position to other users
    this.broadcastToSpreadsheet(ws.spreadsheetId, {
      type: 'user_cursor',
      userId: ws.userId,
      username: ws.username,
      cell,
      color: this.getUserColor(ws.userId)
    }, ws.userId);
  }

  private async handleCellUpdate(ws: AuthenticatedWebSocket, message: any) {
    if (!ws.userId || !ws.spreadsheetId) return;

    const { details } = message;
    
    // Log activity
    await storage.createActivity({
      action: 'cell_updated',
      spreadsheetId: ws.spreadsheetId,
      userId: ws.userId,
      details
    });

    // Broadcast cell update to other users
    this.broadcastToSpreadsheet(ws.spreadsheetId, {
      type: 'cell_updated',
      userId: ws.userId,
      username: ws.username,
      details
    }, ws.userId);
  }

  private handleSelectionUpdate(ws: AuthenticatedWebSocket, message: any) {
    if (!ws.userId || !ws.spreadsheetId) return;

    const { selection } = message;
    
    // Broadcast selection to other users
    this.broadcastToSpreadsheet(ws.spreadsheetId, {
      type: 'user_selection',
      userId: ws.userId,
      username: ws.username,
      selection,
      color: this.getUserColor(ws.userId)
    }, ws.userId);
  }

  private handleTypingStart(ws: AuthenticatedWebSocket, message: any) {
    if (!ws.userId || !ws.spreadsheetId) return;

    const { cell } = message;
    
    this.broadcastToSpreadsheet(ws.spreadsheetId, {
      type: 'user_typing_start',
      userId: ws.userId,
      username: ws.username,
      cell,
      color: this.getUserColor(ws.userId)
    }, ws.userId);
  }

  private handleTypingStop(ws: AuthenticatedWebSocket, message: any) {
    if (!ws.userId || !ws.spreadsheetId) return;

    const { cell } = message;
    
    this.broadcastToSpreadsheet(ws.spreadsheetId, {
      type: 'user_typing_stop',
      userId: ws.userId,
      username: ws.username,
      cell
    }, ws.userId);
  }

  private handleFormulaHelp(ws: AuthenticatedWebSocket, message: any) {
    if (!ws.userId || !ws.spreadsheetId) return;

    const { formula, cell } = message;
    
    // Provide formula suggestions or help
    const suggestions = this.getFormulaSuggestions(formula);
    
    ws.send(JSON.stringify({
      type: 'formula_suggestions',
      suggestions,
      cell
    }));
  }

  private addUser(ws: AuthenticatedWebSocket, user: any) {
    if (!ws.spreadsheetId || !ws.userId) return;

    if (!this.connections.has(ws.spreadsheetId)) {
      this.connections.set(ws.spreadsheetId, new Map());
    }

    const connectedUser: ConnectedUser = {
      userId: ws.userId,
      username: ws.username!,
      ws,
      color: this.getUserColor(ws.userId),
      lastSeen: new Date()
    };

    this.connections.get(ws.spreadsheetId)!.set(ws.userId, connectedUser);
  }

  private removeUser(userId: number, spreadsheetId: number) {
    const spreadsheetUsers = this.connections.get(spreadsheetId);
    if (spreadsheetUsers && spreadsheetUsers.has(userId)) {
      const user = spreadsheetUsers.get(userId)!;
      spreadsheetUsers.delete(userId);

      // If no more users in spreadsheet, remove the spreadsheet entry
      if (spreadsheetUsers.size === 0) {
        this.connections.delete(spreadsheetId);
      }

      // Notify other users
      this.broadcastToSpreadsheet(spreadsheetId, {
        type: 'user_left',
        userId,
        username: user.username
      }, userId);
    }
  }

  private broadcastToSpreadsheet(spreadsheetId: number, message: any, excludeUserId?: number) {
    const spreadsheetUsers = this.connections.get(spreadsheetId);
    if (!spreadsheetUsers) return;

    const messageStr = JSON.stringify(message);
    
    spreadsheetUsers.forEach((user) => {
      if (excludeUserId && user.userId === excludeUserId) return;
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(messageStr);
      }
    });
  }

  private getOnlineUsers(spreadsheetId: number) {
    const spreadsheetUsers = this.connections.get(spreadsheetId);
    if (!spreadsheetUsers) return [];

    return Array.from(spreadsheetUsers.values()).map(user => ({
      id: user.userId,
      username: user.username,
      color: user.color,
      currentCell: user.currentCell,
      isOnline: true,
      lastSeen: user.lastSeen
    }));
  }

  private getUserColor(userId: number): string {
    return this.userColors[userId % this.userColors.length];
  }

  private async checkSpreadsheetAccess(userId: number, spreadsheetId: number): Promise<boolean> {
    try {
      // Check if user is owner or collaborator
      const spreadsheet = await storage.getSpreadsheetById(spreadsheetId);
      if (!spreadsheet) return false;

      if (spreadsheet.ownerId === userId) return true;

      const collaboration = await storage.getCollaboration(spreadsheetId, userId);
      return !!collaboration;
    } catch (error) {
      console.error('Access check error:', error);
      return false;
    }
  }

  private getFormulaSuggestions(formula: string): string[] {
    const commonFunctions = [
      'SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN',
      'IF', 'VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH',
      'CONCATENATE', 'LEFT', 'RIGHT', 'MID', 'LEN',
      'TODAY', 'NOW', 'DATE', 'TIME', 'YEAR', 'MONTH', 'DAY',
      'ROUND', 'CEILING', 'FLOOR', 'ABS', 'SQRT',
      'AND', 'OR', 'NOT', 'TRUE', 'FALSE'
    ];

    if (!formula || !formula.startsWith('=')) {
      return commonFunctions.slice(0, 10);
    }

    const partial = formula.slice(1).toUpperCase();
    return commonFunctions
      .filter(func => func.startsWith(partial))
      .slice(0, 10);
  }

  // Public methods for external use
  public notifySpreadsheetUpdate(spreadsheetId: number, update: any) {
    this.broadcastToSpreadsheet(spreadsheetId, {
      type: 'spreadsheet_update',
      ...update
    });
  }

  public notifyNewMessage(spreadsheetId: number, message: any) {
    this.broadcastToSpreadsheet(spreadsheetId, {
      type: 'new_message',
      message
    });
  }

  public notifyCollaboratorAdded(spreadsheetId: number, collaborator: any) {
    this.broadcastToSpreadsheet(spreadsheetId, {
      type: 'collaborator_added',
      collaborator
    });
  }

  public getConnectionStats() {
    const stats = {
      totalConnections: 0,
      activeSpreadsheets: this.connections.size,
      usersBySpreadsheet: {} as Record<number, number>
    };

    this.connections.forEach((users, spreadsheetId) => {
      stats.totalConnections += users.size;
      stats.usersBySpreadsheet[spreadsheetId] = users.size;
    });

    return stats;
  }
}

export const wsManager = new WebSocketManager();