import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Plus, 
  FileSpreadsheet, 
  Users, 
  Calendar,
  MoreHorizontal,
  Share2,
  Download,
  Trash2,
  Settings
} from 'lucide-react';

export function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSpreadsheetName, setNewSpreadsheetName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch user's spreadsheets
  const { data: spreadsheets = [], isLoading } = useQuery({
    queryKey: ["/api/spreadsheets"],
    enabled: !!user,
  });

  // Create new spreadsheet mutation
  const createSpreadsheetMutation = useMutation({
    mutationFn: async (name: string) => {
      console.log('Creating spreadsheet with name:', name);
      const token = localStorage.getItem('accessToken');
      console.log('Using token:', token ? 'Present' : 'Missing');
      
      const response = await fetch('/api/spreadsheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create spreadsheet');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/spreadsheets"] });
      setShowCreateDialog(false);
      setNewSpreadsheetName('');
      setLocation(`/spreadsheet/${data.id}`);
      toast({
        title: "Spreadsheet created",
        description: `"${data.name}" has been created successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Creation failed",
        description: "Failed to create spreadsheet. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCreateSpreadsheet = () => {
    if (newSpreadsheetName.trim()) {
      createSpreadsheetMutation.mutate(newSpreadsheetName.trim());
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your spreadsheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">PixelSheet</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.username}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed border-2 border-gray-300 hover:border-blue-400">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Plus className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-600">Create New Spreadsheet</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Spreadsheet</DialogTitle>
                  <DialogDescription>
                    Give your new spreadsheet a name to get started.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Spreadsheet Name</Label>
                    <Input
                      id="name"
                      value={newSpreadsheetName}
                      onChange={(e) => setNewSpreadsheetName(e.target.value)}
                      placeholder="Enter spreadsheet name"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateSpreadsheet()}
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

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Download className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">Import Spreadsheet</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Settings className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">Account Settings</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Spreadsheets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Spreadsheets</h2>
            <Badge variant="secondary">
              {spreadsheets.length} {spreadsheets.length === 1 ? 'spreadsheet' : 'spreadsheets'}
            </Badge>
          </div>
          
          {spreadsheets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSpreadsheet className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No spreadsheets yet</h3>
                <p className="text-gray-500 text-center mb-4">
                  Create your first spreadsheet to get started with collaborative editing.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Spreadsheet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {spreadsheets.map((spreadsheet: any) => (
                <Card key={spreadsheet.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-base truncate">
                          {spreadsheet.name}
                        </CardTitle>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <CardDescription className="text-xs">
                      Last modified: {formatDate(spreadsheet.updatedAt)}
                      <br />
                      <span className="text-gray-400">ID: {spreadsheet.id} | Owner: {spreadsheet.ownerId}</span>
                    </CardDescription>
                    
                    <div className="flex items-center space-x-4 mt-2">
                      {spreadsheet.isPublic && (
                        <Badge variant="secondary" className="text-xs">
                          Public
                        </Badge>
                      )}
                      
                      <div className="flex items-center text-xs text-gray-500">
                        <Users className="w-3 h-3 mr-1" />
                        {spreadsheet.collaborators?.length || 0} collaborators
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-2">
                    <div className="flex space-x-2 w-full">
                      <Link href={`/spreadsheet/${spreadsheet.id}`}>
                        <Button size="sm" className="flex-1">
                          Open
                        </Button>
                      </Link>
                      
                      <Button variant="outline" size="sm">
                        <Share2 className="w-3 h-3" />
                      </Button>
                      
                      <Button variant="outline" size="sm">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}