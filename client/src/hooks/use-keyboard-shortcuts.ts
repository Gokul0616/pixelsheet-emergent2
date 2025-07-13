import { useEffect } from 'react';

interface KeyboardShortcuts {
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  onSave?: () => void;
  onNewFile?: () => void;
  onOpenFile?: () => void;
  onPrint?: () => void;
  onFindReplace?: () => void;
  onBold?: () => void;
  onItalic?: () => void;
  onUnderline?: () => void;
  onDelete?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowKey?: (direction: 'up' | 'down' | 'left' | 'right', shiftKey: boolean) => void;
  isEditingMode?: boolean;
}

export function useKeyboardShortcuts({
  onCopy,
  onCut,
  onPaste,
  onUndo,
  onRedo,
  onSelectAll,
  onSave,
  onNewFile,
  onOpenFile,
  onPrint,
  onFindReplace,
  onBold,
  onItalic,
  onUnderline,
  onDelete,
  onEnter,
  onEscape,
  onArrowKey,
  isEditingMode = false
}: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields when in editing mode
      if (isEditingMode) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            onEnter?.();
            break;
          case 'Escape':
            e.preventDefault();
            onEscape?.();
            break;
        }
        return;
      }

      const ctrlKey = e.ctrlKey || e.metaKey;
      const shiftKey = e.shiftKey;

      // Prevent default browser shortcuts for our custom ones
      if (ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault();
            onCopy?.();
            break;
          case 'x':
            e.preventDefault();
            onCut?.();
            break;
          case 'v':
            e.preventDefault();
            onPaste?.();
            break;
          case 'z':
            e.preventDefault();
            if (shiftKey) {
              onRedo?.();
            } else {
              onUndo?.();
            }
            break;
          case 'y':
            e.preventDefault();
            onRedo?.();
            break;
          case 'a':
            e.preventDefault();
            onSelectAll?.();
            break;
          case 's':
            e.preventDefault();
            onSave?.();
            break;
          case 'n':
            e.preventDefault();
            onNewFile?.();
            break;
          case 'o':
            e.preventDefault();
            onOpenFile?.();
            break;
          case 'p':
            e.preventDefault();
            onPrint?.();
            break;
          case 'h':
            e.preventDefault();
            onFindReplace?.();
            break;
          case 'b':
            e.preventDefault();
            onBold?.();
            break;
          case 'i':
            e.preventDefault();
            onItalic?.();
            break;
          case 'u':
            e.preventDefault();
            onUnderline?.();
            break;
        }
      }

      // Non-Ctrl shortcuts
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          onDelete?.();
          break;
        case 'Enter':
          e.preventDefault();
          onEnter?.();
          break;
        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          onArrowKey?.('up', shiftKey);
          break;
        case 'ArrowDown':
          e.preventDefault();
          onArrowKey?.('down', shiftKey);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onArrowKey?.('left', shiftKey);
          break;
        case 'ArrowRight':
          e.preventDefault();
          onArrowKey?.('right', shiftKey);
          break;
        case 'F7':
          e.preventDefault();
          // Spell check functionality would go here
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    onCopy, onCut, onPaste, onUndo, onRedo, onSelectAll, onSave,
    onNewFile, onOpenFile, onPrint, onFindReplace, onBold, onItalic,
    onUnderline, onDelete, onEnter, onEscape, onArrowKey, isEditingMode
  ]);
}

// Utility function to get shortcut display text
export function getShortcutText(shortcut: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return shortcut.replace('Ctrl', isMac ? '⌘' : 'Ctrl');
}