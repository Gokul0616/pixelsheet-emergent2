import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ResizableGridProps {
  sheetId: number;
  selectedCell: { row: number; column: number; sheetId: number } | null;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  formulaValue: string;
  setFormulaValue: (value: string) => void;
  onCellUpdate: (row: number, column: number, value: string, formula?: string) => void;
  realtimeUpdates: any[];
  gridLinesVisible: boolean;
  zoom: number;
  onCellSelect?: (row: number, column: number) => void;
}

interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface DragData {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  data: any[];
}

interface ColumnWidth {
  [key: number]: number;
}

interface RowHeight {
  [key: number]: number;
}

interface ClipboardData {
  type: 'cut' | 'copy';
  data: { row: number; column: number; value: string; formula?: string }[];
  range: SelectionRange;
}

export function ResizableGrid({
  sheetId,
  selectedCell,
  isEditing,
  setIsEditing,
  formulaValue,
  setFormulaValue,
  onCellUpdate,
  realtimeUpdates,
  gridLinesVisible,
  zoom,
  onCellSelect
}: ResizableGridProps) {
  const [columnWidths, setColumnWidths] = useState<ColumnWidth>({});
  const [rowHeights, setRowHeights] = useState<RowHeight>({});
  const [isResizing, setIsResizing] = useState<{ type: 'column' | 'row'; index: number } | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [showManualResize, setShowManualResize] = useState<{ type: 'column' | 'row'; index: number } | null>(null);
  const [manualSize, setManualSize] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  
  // Enhanced selection states
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStartCell, setSelectionStartCell] = useState<{ row: number; column: number } | null>(null);
  
  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);
  const [dragData, setDragData] = useState<DragData | null>(null);
  
  // Clipboard functionality
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: cells } = useQuery({
    queryKey: ["/api/sheets", sheetId, "cells"],
    enabled: !!sheetId,
  });

  const { data: columnMetadata } = useQuery({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: !!sheetId,
  });

  const { data: rowMetadata } = useQuery({
    queryKey: ["/api/sheets", sheetId, "rows"],
    enabled: !!sheetId,
  });

  // Mutations for saving resize data
  const updateColumnMutation = useMutation({
    mutationFn: async ({ columnIndex, updates }: { columnIndex: number; updates: any }) => {
      const response = await fetch(`/api/sheets/${sheetId}/columns/${columnIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update column');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "columns"] });
    }
  });

  const updateRowMutation = useMutation({
    mutationFn: async ({ rowIndex, updates }: { rowIndex: number; updates: any }) => {
      const response = await fetch(`/api/sheets/${sheetId}/rows/${rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update row');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "rows"] });
    }
  });

  const defaultColumnWidth = 100;
  const defaultRowHeight = 21;
  const headerHeight = 24;
  const headerWidth = 40;

  // Enhanced selection functions
  const isCellInSelection = useCallback((row: number, col: number) => {
    if (!selectionRange) return false;
    return row >= Math.min(selectionRange.startRow, selectionRange.endRow) &&
           row <= Math.max(selectionRange.startRow, selectionRange.endRow) &&
           col >= Math.min(selectionRange.startCol, selectionRange.endCol) &&
           col <= Math.max(selectionRange.startCol, selectionRange.endCol);
  }, [selectionRange]);

  const isCellSelected = useCallback((row: number, col: number) => {
    return selectedCell?.row === row && selectedCell?.column === col;
  }, [selectedCell]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return; // Don't interfere with cell editing

      const ctrlKey = e.ctrlKey || e.metaKey;
      const shiftKey = e.shiftKey;

      switch (e.key) {
        case 'c':
        case 'C':
          if (ctrlKey) {
            e.preventDefault();
            handleCopy();
          }
          break;
        case 'x':
        case 'X':
          if (ctrlKey) {
            e.preventDefault();
            handleCut();
          }
          break;
        case 'v':
        case 'V':
          if (ctrlKey) {
            e.preventDefault();
            handlePaste();
          }
          break;
        case 'a':
        case 'A':
          if (ctrlKey) {
            e.preventDefault();
            handleSelectAll();
          }
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault();
          handleArrowKeyNavigation(e.key, shiftKey);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedCell) {
            setIsEditing(true);
            setFormulaValue(getCellDisplayValue(selectedCell.row, selectedCell.column));
          }
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          handleDeleteSelectedCells();
          break;
        case 'Escape':
          e.preventDefault();
          setSelectionRange(null);
          setSelectedColumns([]);
          setSelectedRows([]);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, selectedCell, selectionRange]);

  // Arrow key navigation
  const handleArrowKeyNavigation = (key: string, shiftKey: boolean) => {
    if (!selectedCell) return;

    let newRow = selectedCell.row;
    let newCol = selectedCell.column;

    switch (key) {
      case 'ArrowUp':
        newRow = Math.max(1, newRow - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(100, newRow + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(1, newCol - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(26, newCol + 1);
        break;
    }

    if (shiftKey && !selectionRange) {
      // Start range selection
      setSelectionRange({
        startRow: selectedCell.row,
        startCol: selectedCell.column,
        endRow: newRow,
        endCol: newCol
      });
    } else if (shiftKey && selectionRange) {
      // Extend range selection
      setSelectionRange({
        ...selectionRange,
        endRow: newRow,
        endCol: newCol
      });
    } else {
      // Normal navigation
      setSelectionRange(null);
    }

    onCellSelect?.(newRow, newCol);
  };

  // Clipboard operations
  const handleCopy = () => {
    if (selectionRange) {
      const data = getCellDataInRange(selectionRange);
      setClipboardData({ type: 'copy', data, range: selectionRange });
      toast({
        title: "Copied",
        description: `${data.length} cells copied to clipboard`,
      });
    } else if (selectedCell) {
      const cellData = getCellData(selectedCell.row, selectedCell.column);
      setClipboardData({
        type: 'copy',
        data: [cellData],
        range: {
          startRow: selectedCell.row,
          startCol: selectedCell.column,
          endRow: selectedCell.row,
          endCol: selectedCell.column
        }
      });
      toast({
        title: "Copied",
        description: "Cell copied to clipboard",
      });
    }
  };

  const handleCut = () => {
    if (selectionRange) {
      const data = getCellDataInRange(selectionRange);
      setClipboardData({ type: 'cut', data, range: selectionRange });
      // Clear the cells after cutting
      clearCellsInRange(selectionRange);
      toast({
        title: "Cut",
        description: `${data.length} cells cut to clipboard`,
      });
    } else if (selectedCell) {
      const cellData = getCellData(selectedCell.row, selectedCell.column);
      setClipboardData({
        type: 'cut',
        data: [cellData],
        range: {
          startRow: selectedCell.row,
          startCol: selectedCell.column,
          endRow: selectedCell.row,
          endCol: selectedCell.column
        }
      });
      onCellUpdate(selectedCell.row, selectedCell.column, "");
      toast({
        title: "Cut",
        description: "Cell cut to clipboard",
      });
    }
  };

  const handlePaste = () => {
    if (!clipboardData || !selectedCell) return;

    const pasteStartRow = selectedCell.row;
    const pasteStartCol = selectedCell.column;

    clipboardData.data.forEach((cellData, index) => {
      const originalRowOffset = cellData.row - clipboardData.range.startRow;
      const originalColOffset = cellData.column - clipboardData.range.startCol;
      
      const newRow = pasteStartRow + originalRowOffset;
      const newCol = pasteStartCol + originalColOffset;

      if (newRow <= 100 && newCol <= 26) {
        onCellUpdate(newRow, newCol, cellData.value, cellData.formula);
      }
    });

    if (clipboardData.type === 'cut') {
      setClipboardData(null); // Clear clipboard after cutting
    }

    toast({
      title: "Pasted",
      description: `${clipboardData.data.length} cells pasted`,
    });
  };

  const handleSelectAll = () => {
    setSelectionRange({
      startRow: 1,
      startCol: 1,
      endRow: 100,
      endCol: 26
    });
    toast({
      title: "Select All",
      description: "All cells selected",
    });
  };

  const handleDeleteSelectedCells = () => {
    if (selectionRange) {
      clearCellsInRange(selectionRange);
      const cellCount = (Math.abs(selectionRange.endRow - selectionRange.startRow) + 1) * 
                       (Math.abs(selectionRange.endCol - selectionRange.startCol) + 1);
      toast({
        title: "Deleted",
        description: `${cellCount} cells cleared`,
      });
    } else if (selectedCell) {
      onCellUpdate(selectedCell.row, selectedCell.column, "");
      toast({
        title: "Deleted",
        description: "Cell cleared",
      });
    }
  };

  // Helper functions
  const getCellData = (row: number, column: number) => {
    const cell = cells?.find(c => c.row === row && c.column === column);
    return {
      row,
      column,
      value: cell?.value || "",
      formula: cell?.formula || ""
    };
  };

  const getCellDataInRange = (range: SelectionRange) => {
    const data = [];
    for (let row = Math.min(range.startRow, range.endRow); row <= Math.max(range.startRow, range.endRow); row++) {
      for (let col = Math.min(range.startCol, range.endCol); col <= Math.max(range.startCol, range.endCol); col++) {
        data.push(getCellData(row, col));
      }
    }
    return data;
  };

  const clearCellsInRange = (range: SelectionRange) => {
    for (let row = Math.min(range.startRow, range.endRow); row <= Math.max(range.startRow, range.endRow); row++) {
      for (let col = Math.min(range.startCol, range.endCol); col <= Math.max(range.startCol, range.endCol); col++) {
        onCellUpdate(row, col, "");
      }
    }
  };

  // Get width/height from metadata or local state
  const getColumnWidth = useCallback((col: number) => {
    const metadata = columnMetadata?.find((m: any) => m.columnIndex === col);
    if (metadata) return metadata.width;
    return columnWidths[col] || defaultColumnWidth;
  }, [columnMetadata, columnWidths]);

  const getRowHeight = useCallback((row: number) => {
    const metadata = rowMetadata?.find((m: any) => m.rowIndex === row);
    if (metadata) return metadata.height;
    return rowHeights[row] || defaultRowHeight;
  }, [rowMetadata, rowHeights]);

  const getCellValue = (row: number, column: number) => {
    const cell = cells?.find(c => c.row === row && c.column === column);
    if (!cell) return "";
    
    // Use calculated_value for formulas, otherwise use value
    if (cell.dataType === 'formula' && 'calculated_value' in cell) {
      return String(cell.calculated_value);
    }
    
    return cell.value || "";
  };

  const getCellDisplayValue = (row: number, column: number) => {
    const cell = cells?.find(c => c.row === row && c.column === column);
    if (!cell) return "";
    
    // For editing, always show the original formula or value
    if (cell.dataType === 'formula' && cell.formula) {
      return cell.formula;
    }
    
    return cell.value || "";
  };

  const handleCellClick = (row: number, column: number) => {
    setIsEditing(false);
    onCellSelect?.(row, column);
    setSelectionRange(null); // Clear range selection on single cell click
  };

  const handleCellMouseDown = (row: number, column: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectedCell) {
      // Range selection with Shift+Click
      e.preventDefault();
      setSelectionRange({
        startRow: selectedCell.row,
        startCol: selectedCell.column,
        endRow: row,
        endCol: column
      });
    } else if (e.ctrlKey || e.metaKey) {
      // Multi-selection with Ctrl+Click (for future implementation)
      e.preventDefault();
      // TODO: Implement multi-selection
    } else {
      // Start potential drag selection
      setIsSelecting(true);
      setSelectionStartCell({ row, column });
      setSelectionRange(null);
      onCellSelect?.(row, column);
    }
  };

  const handleCellMouseEnter = (row: number, column: number) => {
    if (isSelecting && selectionStartCell) {
      // Update selection range during drag
      setSelectionRange({
        startRow: selectionStartCell.row,
        startCol: selectionStartCell.column,
        endRow: row,
        endCol: column
      });
    }
  };

  const handleCellMouseUp = () => {
    setIsSelecting(false);
    setSelectionStartCell(null);
  };

  const handleCellDoubleClick = (row: number, column: number) => {
    setIsEditing(true);
    setFormulaValue(getCellDisplayValue(row, column));
  };

  const handleCellChange = (row: number, column: number, value: string) => {
    onCellUpdate(row, column, value);
    setIsEditing(false);
  };

  const getColumnLetter = (col: number) => {
    let result = "";
    while (col > 0) {
      col--;
      result = String.fromCharCode(65 + (col % 26)) + result;
      col = Math.floor(col / 26);
    }
    return result;
  };

  const handleResizeStart = (e: React.MouseEvent, type: 'column' | 'row', index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing({ type, index });
    setResizeStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;

    if (isResizing.type === 'column') {
      const currentWidth = getColumnWidth(isResizing.index);
      const newWidth = Math.max(50, currentWidth + deltaX);
      setColumnWidths(prev => ({
        ...prev,
        [isResizing.index]: newWidth
      }));
    } else {
      const currentHeight = getRowHeight(isResizing.index);
      const newHeight = Math.max(15, currentHeight + deltaY);
      setRowHeights(prev => ({
        ...prev,
        [isResizing.index]: newHeight
      }));
    }

    setResizeStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeEnd = () => {
    if (isResizing) {
      // Save to backend
      if (isResizing.type === 'column') {
        const width = getColumnWidth(isResizing.index);
        updateColumnMutation.mutate({
          columnIndex: isResizing.index,
          updates: { width }
        });
      } else {
        const height = getRowHeight(isResizing.index);
        updateRowMutation.mutate({
          rowIndex: isResizing.index,
          updates: { height }
        });
      }
    }
    setIsResizing(null);
  };

  const handleDoubleClickResize = (type: 'column' | 'row', index: number) => {
    if (type === 'column') {
      // Auto-fit column width based on content
      let maxWidth = 60;
      for (let row = 1; row <= 100; row++) {
        const value = getCellValue(row, index);
        const textWidth = value.length * 8 + 16; // Rough calculation
        maxWidth = Math.max(maxWidth, textWidth);
      }
      const autoWidth = Math.min(maxWidth, 300);
      setColumnWidths(prev => ({
        ...prev,
        [index]: autoWidth
      }));
      
      // Save to backend
      updateColumnMutation.mutate({
        columnIndex: index,
        updates: { width: autoWidth, autoFit: true }
      });
      
      toast({
        title: "Auto-fit Applied",
        description: `Column ${getColumnLetter(index)} resized to fit content`,
      });
    } else {
      // Auto-fit row height
      const autoHeight = 21; // For now, keep default
      setRowHeights(prev => ({
        ...prev,
        [index]: autoHeight
      }));
      
      updateRowMutation.mutate({
        rowIndex: index,
        updates: { height: autoHeight, autoFit: true }
      });
    }
  };

  // Manual resize dialog
  const handleManualResize = () => {
    if (!showManualResize) return;
    
    const size = parseInt(manualSize);
    if (isNaN(size) || size < 10) {
      toast({
        title: "Invalid Size",
        description: "Please enter a valid size (minimum 10)",
        variant: "destructive"
      });
      return;
    }

    if (showManualResize.type === 'column') {
      setColumnWidths(prev => ({
        ...prev,
        [showManualResize.index]: size
      }));
      updateColumnMutation.mutate({
        columnIndex: showManualResize.index,
        updates: { width: size }
      });
    } else {
      setRowHeights(prev => ({
        ...prev,
        [showManualResize.index]: size
      }));
      updateRowMutation.mutate({
        rowIndex: showManualResize.index,
        updates: { height: size }
      });
    }

    setShowManualResize(null);
    setManualSize('');
    toast({
      title: "Size Updated",
      description: `${showManualResize.type === 'column' ? 'Column' : 'Row'} resized to ${size}px`,
    });
  };

  // Uniform sizing for selected columns/rows
  const handleUniformSize = (type: 'column' | 'row') => {
    const size = type === 'column' ? defaultColumnWidth : defaultRowHeight;
    const selected = type === 'column' ? selectedColumns : selectedRows;
    
    selected.forEach(index => {
      if (type === 'column') {
        setColumnWidths(prev => ({ ...prev, [index]: size }));
        updateColumnMutation.mutate({
          columnIndex: index,
          updates: { width: size }
        });
      } else {
        setRowHeights(prev => ({ ...prev, [index]: size }));
        updateRowMutation.mutate({
          rowIndex: index,
          updates: { height: size }
        });
      }
    });

    toast({
      title: "Uniform Size Applied",
      description: `${selected.length} ${type}s resized uniformly`,
    });
  };

  // Column/Row selection handlers
  const handleColumnHeaderClick = (col: number, ctrlKey: boolean, shiftKey: boolean) => {
    if (shiftKey && selectedColumns.length > 0) {
      // Range selection
      const start = Math.min(...selectedColumns);
      const end = Math.max(col, start);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      setSelectedColumns(range);
    } else if (ctrlKey) {
      // Multi-selection
      setSelectedColumns(prev => 
        prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
      );
    } else {
      // Single selection
      setSelectedColumns([col]);
    }
  };

  const handleRowHeaderClick = (row: number, ctrlKey: boolean, shiftKey: boolean) => {
    if (shiftKey && selectedRows.length > 0) {
      // Range selection
      const start = Math.min(...selectedRows);
      const end = Math.max(row, start);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      setSelectedRows(range);
    } else if (ctrlKey) {
      // Multi-selection
      setSelectedRows(prev => 
        prev.includes(row) ? prev.filter(r => r !== row) : [...prev, row]
      );
    } else {
      // Single selection
      setSelectedRows([row]);
    }
  };

  // Global mouse events for selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
      setSelectionStartCell(null);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isSelecting && selectionStartCell && gridRef.current) {
        // Prevent default selection behavior
        e.preventDefault();
      }
    };

    if (isSelecting) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isSelecting, selectionStartCell]);

  // Focus the grid for keyboard events
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.focus();
    }
  }, []);

  const getColumnPosition = (col: number) => {
    let position = headerWidth;
    for (let i = 1; i < col; i++) {
      position += getColumnWidth(i);
    }
    return position;
  };

  const getRowPosition = (row: number) => {
    let position = headerHeight;
    for (let i = 1; i < row; i++) {
      position += getRowHeight(i);
    }
    return position;
  };

  return (
    <div 
      ref={gridRef}
      className="flex-1 overflow-auto bg-white relative outline-none" 
      style={{ 
        zoom: `${zoom}%`,
        scrollBehavior: 'smooth',
        willChange: 'scroll-position',
        height: '100%',
        maxHeight: 'calc(100vh - 200px)'
      }}
      tabIndex={0}
      onMouseMove={handleResizeMove}
      onMouseUp={handleResizeEnd}
      onMouseLeave={handleResizeEnd}
      onContextMenu={(e) => e.preventDefault()} // Prevent default context menu
    >
      <div 
        className="relative" 
        style={{ 
          width: Math.max(getColumnPosition(27), 2000), // Ensure minimum width
          height: Math.max(getRowPosition(101), 2100), // Ensure minimum height
          minWidth: getColumnPosition(27), 
          minHeight: getRowPosition(101)
        }}
      >
        {/* Selection Range Overlay */}
        {selectionRange && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20 pointer-events-none z-5"
            style={{
              left: getColumnPosition(Math.min(selectionRange.startCol, selectionRange.endCol)),
              top: getRowPosition(Math.min(selectionRange.startRow, selectionRange.endRow)),
              width: Math.abs(selectionRange.endCol - selectionRange.startCol + 1) * defaultColumnWidth,
              height: Math.abs(selectionRange.endRow - selectionRange.startRow + 1) * defaultRowHeight
            }}
          />
        )}
        {/* Top-left corner */}
        <div 
          className="absolute bg-gray-50 border-r border-b border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-500 select-none"
          style={{
            left: 0,
            top: 0,
            width: headerWidth,
            height: headerHeight,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="w-2 h-2 border border-gray-400 rounded-sm"></div>
        />
        
        {/* Column headers */}
        {Array.from({ length: 26 }, (_, col) => {
          const colIndex = col + 1;
          const left = getColumnPosition(colIndex);
          const width = getColumnWidth(colIndex);
          const isSelected = selectedColumns.includes(colIndex);
          
          return (
            <div key={`col-header-${col}`}>
              {/* Column header */}
              <div
                className={`
                  absolute border-r border-b border-gray-300 flex items-center justify-center text-xs font-semibold cursor-pointer
                  transition-colors duration-150 select-none
                  ${isSelected ? 'bg-blue-200 text-blue-800 border-blue-400' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-300'}
                `}
                style={{
                  left,
                  top: 0,
                  width,
                  height: headerHeight,
                  boxShadow: isSelected ? '0 1px 3px rgba(59, 130, 246, 0.3)' : 'inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
                onClick={(e) => handleColumnHeaderClick(colIndex, e.ctrlKey, e.shiftKey)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowManualResize({ type: 'column', index: colIndex });
                  setManualSize(String(width));
                }}
              >
                <span className="font-medium tracking-wide">{getColumnLetter(colIndex)}</span>
              </div>
              
              {/* Column resize handle */}
              <div
                className="absolute bg-gray-300 hover:bg-blue-500 cursor-col-resize z-10 opacity-70 hover:opacity-100 transition-all duration-150"
                style={{
                  left: left + width - 3,
                  top: 0,
                  width: 6,
                  height: headerHeight
                }}
                onMouseDown={(e) => handleResizeStart(e, 'column', colIndex)}
                onDoubleClick={() => handleDoubleClickResize('column', colIndex)}
                title="Drag to resize, double-click to auto-fit"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-0.5 h-4 bg-white opacity-50"></div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Row headers and cells */}
        {Array.from({ length: 100 }, (_, row) => {
          const rowIndex = row + 1;
          const top = getRowPosition(rowIndex);
          const height = getRowHeight(rowIndex);
          const isSelected = selectedRows.includes(rowIndex);
          
          return (
            <div key={`row-${row}`}>
              {/* Row header */}
              <div
                className={`
                  absolute border-r border-b border-gray-300 flex items-center justify-center text-xs font-semibold cursor-pointer
                  transition-colors duration-150 select-none
                  ${isSelected ? 'bg-blue-200 text-blue-800 border-blue-400' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-300'}
                `}
                style={{
                  left: 0,
                  top,
                  width: headerWidth,
                  height,
                  boxShadow: isSelected ? '0 1px 3px rgba(59, 130, 246, 0.3)' : 'inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
                onClick={(e) => handleRowHeaderClick(rowIndex, e.ctrlKey, e.shiftKey)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowManualResize({ type: 'row', index: rowIndex });
                  setManualSize(String(height));
                }}
              >
                <span className="font-medium">{rowIndex}</span>
              </div>
              
              {/* Row resize handle */}
              <div
                className="absolute bg-gray-300 hover:bg-blue-500 cursor-row-resize z-10 opacity-70 hover:opacity-100 transition-all duration-150"
                style={{
                  left: 0,
                  top: top + height - 3,
                  width: headerWidth,
                  height: 6
                }}
                onMouseDown={(e) => handleResizeStart(e, 'row', rowIndex)}
                onDoubleClick={() => handleDoubleClickResize('row', rowIndex)}
                title="Drag to resize, double-click to auto-fit"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div className="h-0.5 w-4 bg-white opacity-50"></div>
                </div>
              />
              
              {/* Cells in this row */}
              {Array.from({ length: 26 }, (_, col) => {
                const colIndex = col + 1;
                const left = getColumnPosition(colIndex);
                const width = getColumnWidth(colIndex);
                const cellValue = getCellValue(rowIndex, colIndex);
                const isSelected = isCellSelected(rowIndex, colIndex);
                const isInSelection = isCellInSelection(rowIndex, colIndex);
                const isEditingCell = isSelected && isEditing;
                const isCopied = clipboardData?.data.some(d => d.row === rowIndex && d.column === colIndex);
                
                return (
                  <div
                    key={`cell-${row}-${col}`}
                    className={`
                      absolute border-r border-b font-mono text-sm p-1 cursor-cell flex items-center
                      ${gridLinesVisible ? 'border-gray-200' : 'border-transparent'}
                      ${isSelected ? 'bg-blue-100 border-blue-500 border-2 z-20' : ''}
                      ${isInSelection && !isSelected ? 'bg-blue-50 border-blue-300 z-10' : ''}
                      ${!isSelected && !isInSelection ? 'hover:bg-gray-50' : ''}
                      ${isEditingCell ? 'bg-white border-blue-500 border-2 z-30' : ''}
                      ${isCopied && clipboardData?.type === 'cut' ? 'border-dashed border-orange-300 bg-orange-50' : ''}
                      ${isCopied && clipboardData?.type === 'copy' ? 'border-dashed border-green-300 bg-green-50' : ''}
                    `}
                    style={{
                      left,
                      top,
                      width,
                      height
                    }}
                    onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                    onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                    onMouseUp={handleCellMouseUp}
                    onClick={() => !isSelecting && handleCellClick(rowIndex, colIndex)}
                    onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                  >
                    {isEditingCell ? (
                      <input
                        type="text"
                        value={formulaValue}
                        onChange={(e) => setFormulaValue(e.target.value)}
                        onBlur={() => handleCellChange(rowIndex, colIndex, formulaValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCellChange(rowIndex, colIndex, formulaValue);
                          }
                          if (e.key === 'Escape') {
                            setIsEditing(false);
                          }
                        }}
                        className="w-full h-full bg-transparent border-none outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="block truncate w-full">{cellValue}</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      
      {/* Manual Resize Dialog */}
      <Dialog open={!!showManualResize} onOpenChange={() => setShowManualResize(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Resize {showManualResize?.type === 'column' ? 'Column' : 'Row'} {
                showManualResize?.type === 'column' 
                  ? getColumnLetter(showManualResize.index)
                  : showManualResize?.index
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-size">
                {showManualResize?.type === 'column' ? 'Width' : 'Height'} (pixels)
              </Label>
              <Input
                id="manual-size"
                type="number"
                value={manualSize}
                onChange={(e) => setManualSize(e.target.value)}
                placeholder="Enter size in pixels"
                min={10}
                max={1000}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={handleManualResize} className="flex-1">
                Apply Size
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDoubleClickResize(
                  showManualResize?.type || 'column', 
                  showManualResize?.index || 1
                )}
              >
                Auto-fit
              </Button>
            </div>
            
            {(selectedColumns.length > 1 && showManualResize?.type === 'column') || 
             (selectedRows.length > 1 && showManualResize?.type === 'row') ? (
              <div className="pt-2 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleUniformSize(showManualResize?.type || 'column')}
                >
                  Apply to All Selected ({
                    showManualResize?.type === 'column' ? selectedColumns.length : selectedRows.length
                  } {showManualResize?.type}s)
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}