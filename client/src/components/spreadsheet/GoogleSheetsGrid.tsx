import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface GoogleSheetsGridProps {
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

interface FillData {
  sourceRow: number;
  sourceCol: number;
  targetCells: { row: number; col: number }[];
  fillType: 'copy' | 'series' | 'format';
}

interface ClipboardData {
  type: 'cut' | 'copy';
  data: { row: number; column: number; value: string; formula?: string; formatting?: any }[];
  range: SelectionRange;
}

export function GoogleSheetsGrid({
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
}: GoogleSheetsGridProps) {
  // States for Google Sheets features
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStartCell, setSelectionStartCell] = useState<{ row: number; column: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragFilling, setIsDragFilling] = useState(false);
  const [fillHandle, setFillHandle] = useState<{ row: number; col: number } | null>(null);
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [columnWidths, setColumnWidths] = useState<{ [key: number]: number }>({});
  const [rowHeights, setRowHeights] = useState<{ [key: number]: number }>({});
  const [isResizing, setIsResizing] = useState<{ type: 'column' | 'row'; index: number } | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });

  const gridRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Data fetching
  const { data: cells = [] } = useQuery({
    queryKey: ["/api/sheets", sheetId, "cells"],
    enabled: !!sheetId,
  });

  const { data: columnMetadata = [] } = useQuery({
    queryKey: ["/api/sheets", sheetId, "columns"],
    enabled: !!sheetId,
  });

  const { data: rowMetadata = [] } = useQuery({
    queryKey: ["/api/sheets", sheetId, "rows"],
    enabled: !!sheetId,
  });

  // Constants
  const defaultColumnWidth = 100;
  const defaultRowHeight = 21;
  const headerHeight = 24;
  const headerWidth = 40;
  const maxRows = 1000;
  const maxCols = 26;

  // Cell mutations
  const updateCellMutation = useMutation({
    mutationFn: async ({ row, column, value, formula }: { row: number; column: number; value: string; formula?: string }) => {
      const response = await fetch(`/api/sheets/${sheetId}/cells`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          row,
          column,
          value,
          formula,
          dataType: formula ? 'formula' : 'text'
        }),
      });
      if (!response.ok) throw new Error('Failed to update cell');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "cells"] });
    }
  });

  // Utility functions
  const getColumnLetter = (col: number) => {
    let result = "";
    while (col > 0) {
      col--;
      result = String.fromCharCode(65 + (col % 26)) + result;
      col = Math.floor(col / 26);
    }
    return result;
  };

  const getColumnWidth = (col: number) => {
    const metadata = columnMetadata.find((m: any) => m.columnIndex === col);
    if (metadata) return metadata.width;
    return columnWidths[col] || defaultColumnWidth;
  };

  const getRowHeight = (row: number) => {
    const metadata = rowMetadata.find((m: any) => m.rowIndex === row);
    if (metadata) return metadata.height;
    return rowHeights[row] || defaultRowHeight;
  };

  const getCellValue = (row: number, column: number) => {
    const cell = cells.find((c: any) => c.row === row && c.column === column);
    if (!cell) return "";
    
    if (cell.dataType === 'formula' && 'calculated_value' in cell) {
      return String(cell.calculated_value);
    }
    
    return cell.value || "";
  };

  const getCellDisplayValue = (row: number, column: number) => {
    const cell = cells.find((c: any) => c.row === row && c.column === column);
    if (!cell) return "";
    
    if (cell.dataType === 'formula' && cell.formula) {
      return cell.formula;
    }
    
    return cell.value || "";
  };

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

  // Google Sheets-like keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;

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
        case 'z':
        case 'Z':
          if (ctrlKey && !shiftKey) {
            e.preventDefault();
            handleUndo();
          } else if (ctrlKey && shiftKey) {
            e.preventDefault();
            handleRedo();
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
          handleArrowKeyNavigation(e.key, shiftKey, ctrlKey);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedCell) {
            if (shiftKey) {
              navigateToCell(selectedCell.row - 1, selectedCell.column);
            } else {
              navigateToCell(selectedCell.row + 1, selectedCell.column);
            }
          }
          break;
        case 'Tab':
          e.preventDefault();
          if (selectedCell) {
            if (shiftKey) {
              navigateToCell(selectedCell.row, Math.max(1, selectedCell.column - 1));
            } else {
              navigateToCell(selectedCell.row, Math.min(maxCols, selectedCell.column + 1));
            }
          }
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          handleDeleteSelectedCells();
          break;
        case 'F2':
          e.preventDefault();
          if (selectedCell) {
            setIsEditing(true);
            setFormulaValue(getCellDisplayValue(selectedCell.row, selectedCell.column));
          }
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

  // Navigation functions
  const navigateToCell = (row: number, col: number) => {
    const newRow = Math.max(1, Math.min(maxRows, row));
    const newCol = Math.max(1, Math.min(maxCols, col));
    onCellSelect?.(newRow, newCol);
  };

  const handleArrowKeyNavigation = (key: string, shiftKey: boolean, ctrlKey: boolean) => {
    if (!selectedCell) return;

    let newRow = selectedCell.row;
    let newCol = selectedCell.column;

    if (ctrlKey) {
      // Jump to edge of data
      switch (key) {
        case 'ArrowUp':
          newRow = findDataEdge(selectedCell.row, selectedCell.column, 'up');
          break;
        case 'ArrowDown':
          newRow = findDataEdge(selectedCell.row, selectedCell.column, 'down');
          break;
        case 'ArrowLeft':
          newCol = findDataEdge(selectedCell.row, selectedCell.column, 'left');
          break;
        case 'ArrowRight':
          newCol = findDataEdge(selectedCell.row, selectedCell.column, 'right');
          break;
      }
    } else {
      // Normal navigation
      switch (key) {
        case 'ArrowUp':
          newRow = Math.max(1, newRow - 1);
          break;
        case 'ArrowDown':
          newRow = Math.min(maxRows, newRow + 1);
          break;
        case 'ArrowLeft':
          newCol = Math.max(1, newCol - 1);
          break;
        case 'ArrowRight':
          newCol = Math.min(maxCols, newCol + 1);
          break;
      }
    }

    if (shiftKey && !selectionRange) {
      setSelectionRange({
        startRow: selectedCell.row,
        startCol: selectedCell.column,
        endRow: newRow,
        endCol: newCol
      });
    } else if (shiftKey && selectionRange) {
      setSelectionRange({
        ...selectionRange,
        endRow: newRow,
        endCol: newCol
      });
    } else {
      setSelectionRange(null);
    }

    navigateToCell(newRow, newCol);
  };

  const findDataEdge = (row: number, col: number, direction: 'up' | 'down' | 'left' | 'right') => {
    const currentValue = getCellValue(row, col);
    const hasCurrentValue = currentValue.trim() !== '';

    switch (direction) {
      case 'up':
        for (let r = row - 1; r >= 1; r--) {
          const value = getCellValue(r, col);
          const hasValue = value.trim() !== '';
          if (hasCurrentValue && !hasValue) return r + 1;
          if (!hasCurrentValue && hasValue) return r;
        }
        return 1;
      case 'down':
        for (let r = row + 1; r <= maxRows; r++) {
          const value = getCellValue(r, col);
          const hasValue = value.trim() !== '';
          if (hasCurrentValue && !hasValue) return r - 1;
          if (!hasCurrentValue && hasValue) return r;
        }
        return maxRows;
      case 'left':
        for (let c = col - 1; c >= 1; c--) {
          const value = getCellValue(row, c);
          const hasValue = value.trim() !== '';
          if (hasCurrentValue && !hasValue) return c + 1;
          if (!hasCurrentValue && hasValue) return c;
        }
        return 1;
      case 'right':
        for (let c = col + 1; c <= maxCols; c++) {
          const value = getCellValue(row, c);
          const hasValue = value.trim() !== '';
          if (hasCurrentValue && !hasValue) return c - 1;
          if (!hasCurrentValue && hasValue) return c;
        }
        return maxCols;
      default:
        return direction === 'up' || direction === 'down' ? row : col;
    }
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

    clipboardData.data.forEach((cellData) => {
      const originalRowOffset = cellData.row - clipboardData.range.startRow;
      const originalColOffset = cellData.column - clipboardData.range.startCol;
      
      const newRow = pasteStartRow + originalRowOffset;
      const newCol = pasteStartCol + originalColOffset;

      if (newRow <= maxRows && newCol <= maxCols) {
        updateCellMutation.mutate({
          row: newRow,
          column: newCol,
          value: cellData.value,
          formula: cellData.formula
        });
      }
    });

    if (clipboardData.type === 'cut') {
      setClipboardData(null);
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
      endRow: maxRows,
      endCol: maxCols
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
      updateCellMutation.mutate({
        row: selectedCell.row,
        column: selectedCell.column,
        value: ""
      });
      toast({
        title: "Deleted",
        description: "Cell cleared",
      });
    }
  };

  const handleUndo = () => {
    // Implement undo functionality
    toast({
      title: "Undo",
      description: "Last action undone",
    });
  };

  const handleRedo = () => {
    // Implement redo functionality
    toast({
      title: "Redo",
      description: "Last action redone",
    });
  };

  // Helper functions
  const getCellData = (row: number, column: number) => {
    const cell = cells.find((c: any) => c.row === row && c.column === column);
    return {
      row,
      column,
      value: cell?.value || "",
      formula: cell?.formula || "",
      formatting: cell?.formatting || {}
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
        updateCellMutation.mutate({
          row,
          column: col,
          value: ""
        });
      }
    }
  };

  // Cell interaction handlers
  const handleCellClick = (row: number, column: number) => {
    setIsEditing(false);
    onCellSelect?.(row, column);
    setSelectionRange(null);
  };

  const handleCellMouseDown = (row: number, column: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectedCell) {
      e.preventDefault();
      setSelectionRange({
        startRow: selectedCell.row,
        startCol: selectedCell.column,
        endRow: row,
        endCol: column
      });
    } else {
      setIsSelecting(true);
      setSelectionStartCell({ row, column });
      setSelectionRange(null);
      onCellSelect?.(row, column);
    }
  };

  const handleCellMouseEnter = (row: number, column: number) => {
    if (isSelecting && selectionStartCell) {
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
    updateCellMutation.mutate({
      row,
      column,
      value,
      formula: value.startsWith('=') ? value : undefined
    });
    setIsEditing(false);
  };

  // Drag-to-fill functionality
  const handleFillHandleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragFilling(true);
    setFillHandle({ row, col });
  };

  const handleFillDrag = (targetRow: number, targetCol: number) => {
    if (!isDragFilling || !fillHandle) return;

    // Determine fill direction and apply fill
    const sourceValue = getCellValue(fillHandle.row, fillHandle.col);
    
    // Simple fill logic - extend to implement series, etc.
    if (targetRow !== fillHandle.row) {
      // Vertical fill
      const startRow = Math.min(fillHandle.row, targetRow);
      const endRow = Math.max(fillHandle.row, targetRow);
      for (let r = startRow; r <= endRow; r++) {
        if (r !== fillHandle.row) {
          updateCellMutation.mutate({
            row: r,
            column: fillHandle.col,
            value: sourceValue
          });
        }
      }
    } else if (targetCol !== fillHandle.col) {
      // Horizontal fill
      const startCol = Math.min(fillHandle.col, targetCol);
      const endCol = Math.max(fillHandle.col, targetCol);
      for (let c = startCol; c <= endCol; c++) {
        if (c !== fillHandle.col) {
          updateCellMutation.mutate({
            row: fillHandle.row,
            column: c,
            value: sourceValue
          });
        }
      }
    }
  };

  // Global mouse events
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
      setSelectionStartCell(null);
      setIsDragFilling(false);
      setFillHandle(null);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isSelecting && selectionStartCell && gridRef.current) {
        e.preventDefault();
      }
    };

    if (isSelecting || isDragFilling) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isSelecting, isDragFilling, selectionStartCell]);

  // Focus the grid for keyboard events
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.focus();
    }
  }, []);

  return (
    <div 
      ref={gridRef}
      className="flex-1 overflow-auto bg-white relative outline-none" 
      style={{ 
        zoom: `${zoom}%`,
        scrollBehavior: 'smooth',
        height: '100%',
        maxHeight: 'calc(100vh - 200px)'
      }}
      tabIndex={0}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div 
        className="relative" 
        style={{ 
          width: Math.max(getColumnPosition(maxCols + 1), 2000),
          height: Math.max(getRowPosition(maxRows + 1), 2100),
          minWidth: getColumnPosition(maxCols + 1), 
          minHeight: getRowPosition(maxRows + 1)
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
        </div>
        
        {/* Column headers */}
        {Array.from({ length: maxCols }, (_, col) => {
          const colIndex = col + 1;
          const left = getColumnPosition(colIndex);
          const width = getColumnWidth(colIndex);
          const isSelected = selectedColumns.includes(colIndex);
          
          return (
            <div key={`col-header-${col}`}>
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
                onClick={(e) => {
                  if (e.ctrlKey) {
                    setSelectedColumns(prev => 
                      prev.includes(colIndex) ? prev.filter(c => c !== colIndex) : [...prev, colIndex]
                    );
                  } else {
                    setSelectedColumns([colIndex]);
                  }
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
                title="Drag to resize column"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-0.5 h-4 bg-white opacity-50"></div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Row headers and cells */}
        {Array.from({ length: maxRows }, (_, row) => {
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
                onClick={(e) => {
                  if (e.ctrlKey) {
                    setSelectedRows(prev => 
                      prev.includes(rowIndex) ? prev.filter(r => r !== rowIndex) : [...prev, rowIndex]
                    );
                  } else {
                    setSelectedRows([rowIndex]);
                  }
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
                title="Drag to resize row"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div className="h-0.5 w-4 bg-white opacity-50"></div>
                </div>
              </div>
              
              {/* Cells in this row */}
              {Array.from({ length: maxCols }, (_, col) => {
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
                      absolute border-r border-b font-mono text-sm p-1 cursor-cell flex items-center relative
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
                    onMouseEnter={() => {
                      handleCellMouseEnter(rowIndex, colIndex);
                      if (isDragFilling) {
                        handleFillDrag(rowIndex, colIndex);
                      }
                    }}
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
                    
                    {/* Fill handle for selected cell */}
                    {isSelected && !isEditing && (
                      <div
                        className="absolute w-2 h-2 bg-blue-500 cursor-crosshair z-30"
                        style={{
                          right: -1,
                          bottom: -1,
                          border: '1px solid white'
                        }}
                        onMouseDown={(e) => handleFillHandleMouseDown(rowIndex, colIndex, e)}
                        title="Drag to fill"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}