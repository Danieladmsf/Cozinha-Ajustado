import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Star, X } from "lucide-react";

const MenuNoteDialog = ({ 
  isOpen, 
  onClose, 
  onSave, 
  isEditing, 
  noteData, 
  formData, 
  onContentChange, 
  onToggleImportant 
}) => {
  const dayNames = {
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta"
  };

  const handleSave = async () => {
    const success = await onSave();
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            {isEditing ? "Editar Observação" : "Adicionar Observação"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contexto da nota */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {dayNames[formData.dayIndex]}
              </Badge>
              {noteData?.categoryName && (
                <Badge variant="outline" className="text-xs bg-blue-50">
                  {noteData.categoryName}
                </Badge>
              )}
              {noteData?.recipeName && (
                <Badge variant="outline" className="text-xs bg-green-50">
                  {noteData.recipeName}
                </Badge>
              )}
            </div>
          </div>

          {/* Campo de conteúdo */}
          <div className="space-y-2">
            <Label htmlFor="note-content">Observação *</Label>
            <Textarea
              id="note-content"
              placeholder="Digite sua observação..."
              value={formData.content}
              onChange={(e) => onContentChange(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Switch para marcar como importante */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className={`h-4 w-4 ${formData.important ? 'text-amber-500' : 'text-gray-400'}`} />
              <Label htmlFor="important-toggle">Observação importante</Label>
            </div>
            <Switch
              id="important-toggle"
              checked={formData.important}
              onCheckedChange={onToggleImportant}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.content.trim()}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {isEditing ? "Atualizar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MenuNoteDialog;