import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ClipboardData {
  type: 'cut' | 'copy';
  data: { row: number; column: number; value: string; formula?: string }[];
  range: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  };
}

export function useClipboard() {
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (data: ClipboardData['data'], range: ClipboardData['range']) => {
    setClipboardData({ type: 'copy', data, range });
    
    // Also copy to system clipboard as text
    const textData = formatDataAsText(data, range);
    navigator.clipboard?.writeText(textData).catch(() => {
      // Fallback for browsers without clipboard API
    });

    toast({
      title: "Copied",
      description: `${data.length} cells copied to clipboard`,
    });
  };

  const cutToClipboard = (data: ClipboardData['data'], range: ClipboardData['range']) => {
    setClipboardData({ type: 'cut', data, range });
    
    // Also copy to system clipboard as text
    const textData = formatDataAsText(data, range);
    navigator.clipboard?.writeText(textData).catch(() => {
      // Fallback for browsers without clipboard API
    });

    toast({
      title: "Cut",
      description: `${data.length} cells cut to clipboard`,
    });
  };

  const clearClipboard = () => {
    setClipboardData(null);
  };

  const formatDataAsText = (data: ClipboardData['data'], range: ClipboardData['range']) => {
    const rows = Math.abs(range.endRow - range.startRow) + 1;
    const cols = Math.abs(range.endCol - range.startCol) + 1;
    
    const grid: string[][] = Array(rows).fill(null).map(() => Array(cols).fill(''));
    
    data.forEach(cell => {
      const rowIndex = cell.row - Math.min(range.startRow, range.endRow);
      const colIndex = cell.column - Math.min(range.startCol, range.endCol);
      if (rowIndex >= 0 && rowIndex < rows && colIndex >= 0 && colIndex < cols) {
        grid[rowIndex][colIndex] = cell.value;
      }
    });
    
    return grid.map(row => row.join('\t')).join('\n');
  };

  return {
    clipboardData,
    copyToClipboard,
    cutToClipboard,
    clearClipboard
  };
}