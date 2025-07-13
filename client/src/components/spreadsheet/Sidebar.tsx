import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Clock, MessageSquare, Users, Activity, History, Send, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  user: string;
  message: string;
  timestamp: string;
  type: 'message' | 'system';
}

interface SidebarProps {
  activities: any[];
  collaborators: any[];
  onClose: () => void;
}

export function Sidebar({ activities, collaborators, onClose }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"activity" | "comments" | "collaborators">("activity");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      user: "User 1",
      message: "Let's review the Q1 numbers together",
      timestamp: "2:30 PM",
      type: 'message'
    },
    {
      id: 2,
      user: "User 2", 
      message: "Looks good! Should we add a chart for better visualization?",
      timestamp: "2:32 PM",
      type: 'message'
    },
    {
      id: 3,
      user: "System",
      message: "User 3 joined the collaboration",
      timestamp: "2:35 PM", 
      type: 'system'
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: messages.length + 1,
        user: "You",
        message: newMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'message'
      };
      
      setMessages(prev => [...prev, message]);
      setNewMessage("");
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the team",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      // Simulate typing indicator
      setTimeout(() => setIsTyping(false), 2000);
    }
  };

  const mockComments = [
    {
      id: 1,
      cellId: "A1",
      user: "User 1",
      content: "This data needs to be verified before we proceed with the analysis.",
      createdAt: "2 hours ago",
      isResolved: false,
      replies: [
        {
          id: 1,
          user: "User 2",
          content: "I'll verify this data by tomorrow",
          createdAt: "1 hour ago"
        }
      ]
    },
    {
      id: 2,
      cellId: "B5",
      user: "User 2",
      content: "Let's review the Q1 numbers together",
      createdAt: "1 day ago",
      isResolved: true,
      replies: []
    }
  ];

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Collaboration</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === "activity" 
              ? "text-blue-600 border-b-2 border-blue-600" 
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("activity")}
        >
          <Activity className="h-4 w-4 inline mr-1" />
          Activity
        </button>
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === "comments" 
              ? "text-blue-600 border-b-2 border-blue-600" 
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("comments")}
        >
          <MessageSquare className="h-4 w-4 inline mr-1" />
          Comments
        </button>
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === "collaborators" 
              ? "text-blue-600 border-b-2 border-blue-600" 
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("collaborators")}
        >
          <Users className="h-4 w-4 inline mr-1" />
          Team
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "activity" && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-900 mb-3">Recent Activity</div>
            {activities && activities.length > 0 ? (
              activities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 bg-gray-50 rounded-lg">
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.createdAt}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-900 mb-3">Comments</div>
            {mockComments.map((comment) => (
              <Card key={comment.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{comment.user}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {comment.cellId}
                      </Badge>
                      {comment.isResolved && (
                        <Badge variant="secondary" className="text-xs">
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs">{comment.createdAt}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-700">{comment.content}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Button variant="ghost" size="sm" className="text-xs h-6">
                      Reply
                    </Button>
                    {!comment.isResolved && (
                      <Button variant="ghost" size="sm" className="text-xs h-6">
                        Resolve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "collaborators" && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-900 mb-3">Team Chat</div>
            
            {/* Online Collaborators */}
            <div className="mb-6">
              <div className="text-xs font-medium text-gray-500 mb-2">Online Now</div>
              {collaborators && collaborators.length > 0 ? (
                collaborators.map((collaborator, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg mb-2">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      {collaborator.username?.charAt(0)?.toUpperCase() || (index + 1)}
                    </div>
                    <span className="text-sm text-gray-700">{collaborator.username || `User ${index + 1}`}</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full ml-auto"></div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No collaborators online</p>
              )}
            </div>

            {/* Team Chat */}
            <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
              {mockTeamChat.map((message) => (
                <div key={message.id} className="mb-3 last:mb-0">
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      {message.user.charAt(message.user.length - 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-900">{message.user}</span>
                        <span className="text-xs text-gray-500">{message.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{message.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="mt-4">
              <input
                type="text"
                placeholder="Type a message..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Real-time collaboration enabled</span>
        </div>
      </div>
    </div>
  );
}