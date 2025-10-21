'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_DISPLAY_LENGTH = 30; // Maximum characters to display before truncating

const NoteViewer = ({ note, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  const isEmpty = !note || note.trim() === '';
  const displayNote = isEmpty
    ? "Sem observações..." // Placeholder text
    : note; // Always display full note in the span, let CSS truncate if needed

  return (
    <div className={cn(
      "flex items-center justify-between h-8 w-full border border-blue-300 rounded-md px-2", // Mimic Input styling
      isEmpty ? "text-gray-400" : "text-gray-700", // Text color for placeholder vs actual text
      className
    )}>
      <span className="text-xs truncate flex-1"> {/* Keep truncate class for visual shortening */}
        {displayNote}
      </span>
      {!isEmpty && ( // Show icon if there is any text
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-cyan-400 hover:text-cyan-500 flex-shrink-0 -mr-1 animate-pulse"
          onClick={() => setIsOpen(true)}
          aria-label="Ver observação completa"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Observação Completa</DialogTitle>
            <DialogDescription>
              Detalhes da observação do item.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{note}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NoteViewer;
