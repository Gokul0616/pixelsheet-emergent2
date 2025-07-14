import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PixelSheetGrid } from '@/components/spreadsheet/GoogleSheetsGrid';
import { RealTimeCollaboration } from '@/components/spreadsheet/RealTimeCollaboration';
import { FormulaBar } from '@/components/spreadsheet/FormulaBar';
import { MenuBar } from '@/components/spreadsheet/MenuBar';
import { FormattingToolbar } from '@/components/spreadsheet/FormattingToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, 
  Share2, 
  Users, 
  Download, 
  Printer, 
  Settings,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Maximize2,
  Minimize2
} from 'lucide-react';

export function SpreadsheetPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Spreadsheet state
  const [selectedCell, setSelectedCell] = useState<{ row: number; column: number; sheetId: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formulaValue, setFormulaValue] = useState('');
  const [activeSheet, setActiveSheet] = useState<number>(1);
  const [zoom, setZoom] = useState(100);
  const [gridLinesVisible, setGridLinesVisible] = useState(true);
  const [formulaBarVisible, setFormulaBarVisible] = useState(true);
  const [collaborationVisible, setCollaborationVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated]);

  // Fetch spreadsheet data
  const { data: spreadsheet, isLoading: spreadsheetLoading } = useQuery({
    queryKey: ["/api/spreadsheets", id],
    enabled: !!id && isAuthenticated,
  });

  const { data: sheets = [] } = useQuery({
    queryKey: ["/api/spreadsheets", id, "sheets"],
    enabled: !!id && isAuthenticated,
  });

  const { data: realtimeUpdates = [] } = useQuery({
    queryKey: ["/api/spreadsheets", id, "realtime"],
    enabled: !!id && isAuthenticated,
    refetchInterval: 1000, // Refresh every second for real-time updates
  });

  // Mutations
  const updateCellMutation = useMutation({
    mutationFn: async ({ row, column, value, formula }: { row: number; column: number; value: string; formula?: string }) => {
      const response = await fetch(`/api/sheets/${activeSheet}/cells`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          row,
          column,
          value,
          formula,
          dataType: formula ? 'formula' : (isNaN(Number(value)) ? 'text' : 'number')
        }),
      });
      if (!response.ok) throw new Error('Failed to update cell');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", activeSheet, "cells"] });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast({
        title: "Cell updated",
        description: "Changes saved successfully",
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  });

  const saveSpreadsheetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/spreadsheets/${id}/save`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
      });
      if (!response.ok) throw new Error('Failed to save spreadsheet');
      return response.json();
    },
    onSuccess: () => {
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast({
        title: "Saved",
        description: "Spreadsheet saved successfully",
      });
    }
  });

  // Event handlers
  const handleCellUpdate = (row: number, column: number, value: string, formula?: string) => {
    setHasUnsavedChanges(true);
    updateCellMutation.mutate({ row, column, value, formula });
  };

  const handleCellSelect = (row: number, column: number) => {
    setSelectedCell({ row, column, sheetId: activeSheet });
    setIsEditing(false);
    
    // Update formula bar with selected cell value
    // This will be implemented in the PixelSheetGrid component
  };

  const handleMenuAction = (action: string, data?: any) => {
    switch (action) {
      case 'saveSpreadsheet':
        saveSpreadsheetMutation.mutate();
        break;
      case 'shareSpreadsheet':
        handleShare();
        break;
      case 'exportData':
        handleExport();
        break;
      case 'printSpreadsheet':
        handlePrint();
        break;
      case 'newSpreadsheet':
        handleNewSpreadsheet();
        break;
      default:
        toast({
          title: "Feature coming soon",
          description: `${action} feature will be available soon`,
        });
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/spreadsheet/${id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied",
      description: "Spreadsheet link copied to clipboard",
    });
  };

  const handleExport = () => {
    const link = document.createElement('a');
    link.href = `/api/spreadsheets/${id}/export?format=xlsx`;
    link.download = `${spreadsheet?.name || 'spreadsheet'}.xlsx`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewSpreadsheet = () => {
    setLocation('/dashboard');
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.max(25, Math.min(500, newZoom)));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges) {
        saveSpreadsheetMutation.mutate();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrlKey = e.ctrlKey || e.metaKey;
      
      if (ctrlKey && e.key === 's') {
        e.preventDefault();
        saveSpreadsheetMutation.mutate();
      }
      
      if (ctrlKey && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
      
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  if (spreadsheetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading spreadsheet...</p>
        </div>
      </div>
    );
  }

  if (!spreadsheet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Spreadsheet not found</h1>
          <p className="text-gray-600 mt-2">The spreadsheet you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => setLocation('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <Grid3X3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 truncate max-w-xs">
                {spreadsheet.name}
              </h1>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                {lastSaved && (
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                )}
                {hasUnsavedChanges && (
                  <Badge variant="secondary" className="text-xs">
                    Unsaved changes
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleZoomChange(zoom - 25)}
              disabled={zoom <= 25}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-mono w-12 text-center">{zoom}%</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleZoomChange(zoom + 25)}
              disabled={zoom >= 500}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* View controls */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setGridLinesVisible(!gridLinesVisible)}
            title="Toggle grid lines"
          >
            <Grid3X3 className={`w-4 h-4 ${gridLinesVisible ? 'text-blue-600' : 'text-gray-400'}`} />
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setCollaborationVisible(!collaborationVisible)}
            title="Toggle collaboration panel"
          >
            <Users className={`w-4 h-4 ${collaborationVisible ? 'text-blue-600' : 'text-gray-400'}`} />
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {/* Action buttons */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>

          <Button 
            size="sm"
            onClick={() => saveSpreadsheetMutation.mutate()}
            disabled={saveSpreadsheetMutation.isPending}
          >
            <Save className="w-4 h-4 mr-1" />
            {saveSpreadsheetMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Menu Bar */}
      <MenuBar
        spreadsheetId={parseInt(id!)}
        selectedCell={selectedCell?.row && selectedCell?.column ? `${String.fromCharCode(64 + selectedCell.column)}${selectedCell.row}` : null}
        selectedCells={selectedCell ? [selectedCell] : []}
        onAction={handleMenuAction}
        formulaBarVisible={formulaBarVisible}
        gridLinesVisible={gridLinesVisible}
        onToggleFormulaBar={() => setFormulaBarVisible(!formulaBarVisible)}
        onToggleGridLines={() => setGridLinesVisible(!gridLinesVisible)}
        onZoomChange={handleZoomChange}
        zoom={zoom}
      />

      {/* Formatting Toolbar */}
      <FormattingToolbar
        selectedCells={selectedCell ? [selectedCell] : []}
        onFormatChange={(format) => {
          toast({
            title: "Formatting applied",
            description: "Cell formatting has been updated",
          });
        }}
      />

      {/* Formula Bar */}
      {formulaBarVisible && (
        <FormulaBar
          selectedCell={selectedCell}
          formulaValue={formulaValue}
          setFormulaValue={setFormulaValue}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onCellUpdate={handleCellUpdate}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Spreadsheet Grid */}
        <div className="flex-1 flex flex-col">
          {/* Sheet tabs */}
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
            <div className="flex items-center space-x-2">
              {sheets.map((sheet: any) => (
                <Button
                  key={sheet.id}
                  variant={activeSheet === sheet.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSheet(sheet.id)}
                  className="text-xs"
                >
                  {sheet.name}
                </Button>
              ))}
              <Button variant="ghost" size="sm" className="text-xs text-gray-500">
                + Add Sheet
              </Button>
            </div>
          </div>

          {/* Grid */}
          <PixelSheetGrid
            sheetId={activeSheet}
            selectedCell={selectedCell}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            formulaValue={formulaValue}
            setFormulaValue={setFormulaValue}
            onCellUpdate={handleCellUpdate}
            realtimeUpdates={realtimeUpdates}
            gridLinesVisible={gridLinesVisible}
            zoom={zoom}
            onCellSelect={handleCellSelect}
          />
        </div>

        {/* Collaboration Panel */}
        {collaborationVisible && (
          <RealTimeCollaboration
            spreadsheetId={parseInt(id!)}
            currentUserId={user?.id || 0}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-1 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center space-x-4">
          <span>Ready</span>
          {selectedCell && (
            <span>
              Cell: {String.fromCharCode(64 + selectedCell.column)}{selectedCell.row}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>Zoom: {zoom}%</span>
          {realtimeUpdates.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {realtimeUpdates.length} users online
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}