import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface OnlineUser {
  id: number;
  username: string;
  spreadsheetId: number;
}

export function useWebSocket(spreadsheetId: number, userId: number, username: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [realtimeUpdates, setRealtimeUpdates] = useState<WebSocketMessage[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const connect = () => {
    try {
      // Get backend URL from environment variable
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const url = new URL(backendUrl);
      const protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${url.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setSocket(ws);
        reconnectAttempts.current = 0;
        
        // Join the spreadsheet room
        ws.send(JSON.stringify({
          type: 'join',
          spreadsheetId,
          userId,
          username
        }));
        
        toast({
          title: "Connected",
          description: "Real-time collaboration enabled",
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setSocket(null);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(() => {
            connect();
          }, 1000 * reconnectAttempts.current);
        } else {
          toast({
            title: "Connection Lost",
            description: "Unable to reconnect to real-time collaboration",
            variant: "destructive",
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'online_users':
        setOnlineUsers(message.users);
        break;
        
      case 'user_joined':
        setOnlineUsers(prev => [...prev, message.user]);
        toast({
          title: "User Joined",
          description: `${message.user.username} joined the spreadsheet`,
        });
        break;
        
      case 'user_left':
        setOnlineUsers(prev => prev.filter(user => user.id !== message.user.id));
        toast({
          title: "User Left",
          description: `${message.user.username} left the spreadsheet`,
        });
        break;
        
      case 'cell_updated':
        // Update the cell data in the query cache
        queryClient.invalidateQueries({ queryKey: ["/api/sheets", message.cell.sheetId, "cells"] });
        
        // Add to realtime updates for visual feedback
        setRealtimeUpdates(prev => [...prev.slice(-4), message]);
        
        toast({
          title: "Cell Updated",
          description: `${message.user.username} updated a cell`,
        });
        break;
        
      case 'cursor_moved':
        // Handle cursor movement visualization
        setRealtimeUpdates(prev => [...prev.slice(-4), message]);
        break;
        
      case 'selection_changed':
        // Handle selection change visualization
        setRealtimeUpdates(prev => [...prev.slice(-4), message]);
        break;
        
      case 'comment_added':
        // Refresh comments
        queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
        break;
        
      case 'typing_started':
      case 'typing_stopped':
        // Handle typing indicators
        setRealtimeUpdates(prev => [...prev.slice(-4), message]);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  const sendCellUpdate = (cell: any, value: string, formula?: string) => {
    sendMessage({
      type: 'cell_update',
      cell,
      value,
      formula
    });
  };

  const sendCursorMove = (position: { row: number; column: number }) => {
    sendMessage({
      type: 'cursor_move',
      position
    });
  };

  const sendSelectionChange = (selection: any) => {
    sendMessage({
      type: 'selection_change',
      selection
    });
  };

  const sendCommentAdd = (comment: any) => {
    sendMessage({
      type: 'comment_add',
      comment
    });
  };

  const sendTypingStart = (cell: any) => {
    sendMessage({
      type: 'typing_start',
      cell
    });
  };

  const sendTypingStop = (cell: any) => {
    sendMessage({
      type: 'typing_stop',
      cell
    });
  };

  useEffect(() => {
    connect();
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [spreadsheetId, userId, username]);

  return {
    isConnected,
    onlineUsers,
    realtimeUpdates,
    sendCellUpdate,
    sendCursorMove,
    sendSelectionChange,
    sendCommentAdd,
    sendTypingStart,
    sendTypingStop,
  };
}