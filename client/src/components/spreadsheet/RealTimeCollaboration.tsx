import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  MessageSquare, 
  Activity, 
  Send, 
  UserPlus, 
  Settings,
  Eye,
  Edit,
  MessageCircle,
  Crown
} from "lucide-react";

interface RealTimeCollaborationProps {
  spreadsheetId: number;
  currentUserId: number;
}

interface Collaborator {
  id: number;
  username: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  isOnline: boolean;
  lastSeen: Date;
  currentCell?: { row: number; column: number };
  color: string;
}

interface Message {
  id: number;
  content: string;
  userId: number;
  username: string;
  timestamp: Date;
  cellReference?: string;
}

interface Activity {
  id: number;
  action: string;
  userId: number;
  username: string;
  timestamp: Date;
  details: any;
}

export function RealTimeCollaboration({ spreadsheetId, currentUserId }: RealTimeCollaborationProps) {
  const [newMessage, setNewMessage] = useState("");
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Collaborator[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch collaborators
  const { data: collaborators = [] } = useQuery({
    queryKey: ["/api/spreadsheets", spreadsheetId, "collaborators"],
    enabled: !!spreadsheetId,
  });

  // Fetch chat messages
  const { data: chatMessages = [] } = useQuery({
    queryKey: ["/api/spreadsheets", spreadsheetId, "messages"],
    enabled: !!spreadsheetId,
  });

  // Fetch activities
  const { data: recentActivities = [] } = useQuery({
    queryKey: ["/api/spreadsheets", spreadsheetId, "activities"],
    enabled: !!spreadsheetId,
  });

  // WebSocket connection for real-time features
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/spreadsheet/${spreadsheetId}`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
      
      // Send join message
      websocket.send(JSON.stringify({
        type: 'join',
        userId: currentUserId,
        spreadsheetId
      }));
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'user_joined':
          setOnlineUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user]);
          toast({
            title: "User joined",
            description: `${data.user.username} joined the spreadsheet`,
          });
          break;
          
        case 'user_left':
          setOnlineUsers(prev => prev.filter(u => u.id !== data.userId));
          break;
          
        case 'user_cursor':
          setOnlineUsers(prev => prev.map(u => 
            u.id === data.userId 
              ? { ...u, currentCell: data.cell }
              : u
          ));
          break;
          
        case 'cell_updated':
          // Invalidate cell data to refetch
          queryClient.invalidateQueries({ queryKey: ["/api/sheets", spreadsheetId, "cells"] });
          
          // Add to activities
          setActivities(prev => [{
            id: Date.now(),
            action: 'cell_updated',
            userId: data.userId,
            username: data.username,
            timestamp: new Date(),
            details: data.details
          }, ...prev.slice(0, 99)]);
          break;
          
        case 'new_message':
          setMessages(prev => [...prev, data.message]);
          queryClient.invalidateQueries({ queryKey: ["/api/spreadsheets", spreadsheetId, "messages"] });
          break;
          
        case 'collaborator_added':
          queryClient.invalidateQueries({ queryKey: ["/api/spreadsheets", spreadsheetId, "collaborators"] });
          toast({
            title: "New collaborator",
            description: `${data.collaborator.username} was added to the spreadsheet`,
          });
          break;
          
        default:
          console.log('Unknown WebSocket message type:', data.type);
      }
    };
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (websocket.readyState === WebSocket.CLOSED) {
          // Reconnect
        }
      }, 3000);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => {
      websocket.close();
    };
  }, [spreadsheetId, currentUserId]);

  // Send cursor position updates
  const sendCursorUpdate = (row: number, column: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'cursor_update',
        userId: currentUserId,
        cell: { row, column }
      }));
    }
  };

  // Send cell update notification
  const sendCellUpdate = (row: number, column: number, value: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'cell_update',
        userId: currentUserId,
        details: { row, column, value }
      }));
    }
  };

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/spreadsheets/${spreadsheetId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/spreadsheets", spreadsheetId, "messages"] });
    }
  });

  const addCollaboratorMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const response = await fetch(`/api/spreadsheets/${spreadsheetId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!response.ok) throw new Error('Failed to add collaborator');
      return response.json();
    },
    onSuccess: () => {
      setNewCollaboratorEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/spreadsheets", spreadsheetId, "collaborators"] });
      toast({
        title: "Collaborator added",
        description: "New collaborator has been added to the spreadsheet",
      });
    }
  });

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleAddCollaborator = () => {
    if (newCollaboratorEmail.trim()) {
      addCollaboratorMutation.mutate({
        email: newCollaboratorEmail.trim(),
        role: 'editor'
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'editor':
        return <Edit className="w-3 h-3 text-blue-500" />;
      case 'commenter':
        return <MessageCircle className="w-3 h-3 text-green-500" />;
      case 'viewer':
        return <Eye className="w-3 h-3 text-gray-500" />;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Collaboration
        </h3>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">
            {onlineUsers.length} online
          </span>
        </div>
      </div>

      <Tabs defaultValue="team" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
          <TabsTrigger value="team" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            Team
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">
            <MessageSquare className="w-3 h-3 mr-1" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            <Activity className="w-3 h-3 mr-1" />
            Activity
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="team" className="h-full m-0 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Email address"
                    value={newCollaboratorEmail}
                    onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCollaborator()}
                    className="text-sm"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleAddCollaborator}
                    disabled={!newCollaboratorEmail.trim()}
                  >
                    <UserPlus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 px-4">
                <div className="space-y-3">
                  {/* Online Users */}
                  {onlineUsers.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Online Now
                      </h4>
                      {onlineUsers.map((user) => (
                        <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <div className="relative">
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={`/avatars/${user.id}.jpg`} />
                              <AvatarFallback className="text-xs">
                                {user.username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.username}
                              </p>
                              {getRoleIcon(user.role)}
                            </div>
                            {user.currentCell && (
                              <p className="text-xs text-gray-500">
                                Editing {String.fromCharCode(64 + user.currentCell.column)}{user.currentCell.row}
                              </p>
                            )}
                          </div>
                          <div 
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: user.color }}
                          ></div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* All Collaborators */}
                  {collaborators.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        All Members
                      </h4>
                      {collaborators.map((collaborator: any) => (
                        <div key={collaborator.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={`/avatars/${collaborator.userId}.jpg`} />
                            <AvatarFallback className="text-xs">
                              {collaborator.user?.username?.slice(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {collaborator.user?.username || 'Unknown'}
                              </p>
                              {getRoleIcon(collaborator.role)}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {collaborator.user?.email || 'No email'}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {collaborator.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="h-full m-0 p-0">
            <div className="flex flex-col h-full">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {chatMessages.map((message: any) => (
                    <div key={message.id} className="flex gap-2">
                      <Avatar className="w-6 h-6 mt-1">
                        <AvatarFallback className="text-xs">
                          {message.user?.username?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {message.user?.username || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimestamp(message.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="text-sm"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="h-full m-0 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-3">
                {recentActivities.map((activity: any) => (
                  <div key={activity.id} className="flex gap-2 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user?.username}</span>
                        {' '}
                        {activity.action === 'cell_updated' && 'updated a cell'}
                        {activity.action === 'sheet_created' && 'created a sheet'}
                        {activity.action === 'collaborator_added' && 'added a collaborator'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(activity.createdAt)}
                      </p>
                      {activity.details && (
                        <p className="text-xs text-gray-600 mt-1">
                          {JSON.stringify(activity.details)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}