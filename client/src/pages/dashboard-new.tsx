import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  MoreVertical, 
  Star,
  Clock,
  Grid3X3,
  Filter,
  SortAsc,
  Folder,
  Share2,
  Download,
  Trash2,
  Settings,
  User,
  Menu,
  Bell,
  HelpCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export function DashboardNew() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for creating new spreadsheet
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSpreadsheetName, setNewSpreadsheetName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch user's spreadsheets
  const { data: spreadsheets = [], isLoading } = useQuery({
    queryKey: ['/api/spreadsheets'],
  });

  // Create spreadsheet mutation
  const createSpreadsheetMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await fetch('/api/spreadsheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create spreadsheet');
      }
      
      return response.json();
    },
    onSuccess: (newSpreadsheet) => {
      queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets'] });
      setShowCreateDialog(false);
      setNewSpreadsheetName('');
      toast({
        title: "Spreadsheet created",
        description: `"${newSpreadsheet.name}" has been created successfully.`,
      });
      setLocation(`/spreadsheet/${newSpreadsheet.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create spreadsheet. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateSpreadsheet = () => {
    if (!newSpreadsheetName.trim()) return;
    createSpreadsheetMutation.mutate({ name: newSpreadsheetName.trim() });
  };

  const handleCreateBlank = () => {
    const name = `Untitled spreadsheet`;
    createSpreadsheetMutation.mutate({ name });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const filteredSpreadsheets = spreadsheets.filter((spreadsheet: any) =>
    spreadsheet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and title */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-medium text-gray-900">PixelSheet</h1>
                </div>
              </div>
            </div>

            {/* Center - Search */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search spreadsheets"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-100 border-0 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Right side - User menu */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <HelpCircle className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={user?.username} />
                      <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{user?.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Start a new spreadsheet section */}
        <div className="mb-8">
          <h2 className="text-base font-medium text-gray-900 mb-4">Start a new spreadsheet</h2>
          <div className="flex space-x-4">
            {/* Blank template */}
            <div className="group cursor-pointer" onClick={handleCreateBlank}>
              <div className="w-32 h-40 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors flex flex-col items-center justify-center group-hover:shadow-md">
                <div className="w-16 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center mb-2">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <span className="text-xs text-gray-600 text-center">Blank</span>
              </div>
            </div>

            {/* Template gallery */}
            <div className="group cursor-pointer" onClick={() => setShowCreateDialog(true)}>
              <div className="w-32 h-40 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors flex flex-col items-center justify-center group-hover:shadow-md">
                <div className="w-16 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-2">
                  <Grid3X3 className="w-8 h-8 text-white" />
                </div>
                <span className="text-xs text-gray-600 text-center">Template gallery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent spreadsheets section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-gray-900">Recent spreadsheets</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <SortAsc className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search for mobile */}
          <div className="md:hidden mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search spreadsheets"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Spreadsheets list/grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : filteredSpreadsheets.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No spreadsheets found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'Try adjusting your search terms.' : 'Create your first spreadsheet to get started.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Spreadsheet
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredSpreadsheets.map((spreadsheet: any) => (
                <Card 
                  key={spreadsheet.id} 
                  className="group hover:shadow-md transition-shadow cursor-pointer border-gray-200"
                  onClick={() => setLocation(`/spreadsheet/${spreadsheet.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <FileSpreadsheet className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <CardTitle className="text-sm truncate">
                          {spreadsheet.name}
                        </CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Star className="mr-2 h-4 w-4" />
                            Add to starred
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center text-xs text-gray-500 space-x-4">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(spreadsheet.updatedAt)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      ID: {spreadsheet.id} | Owner: {spreadsheet.ownerId}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Spreadsheet Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new spreadsheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newSpreadsheetName}
                onChange={(e) => setNewSpreadsheetName(e.target.value)}
                placeholder="Enter spreadsheet name"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSpreadsheet()}
                autoFocus
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSpreadsheet}
              disabled={!newSpreadsheetName.trim() || createSpreadsheetMutation.isPending}
            >
              {createSpreadsheetMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}