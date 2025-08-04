
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Pencil, Star, StarOff, Trash2, CalendarDays, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { MenuNote } from "@/app/api/entities";
import { toast } from "@/components/ui/use-toast";

export default function MenuNotes({ notes = [], onEdit, onDelete, onToggleImportant, categoryColors = {}, onNoteClick }) {
  // Remover estados locais desnecessários
  
  // Simplificar handleEditClick para apenas chamar a função do pai
  const handleEditClick = (note) => {
    if (onEdit) {
      onEdit(note);
    }
  };

  const dayNames = {
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta"
  };

  // Agrupar notas por dia
  const groupedNotes = notes.reduce((acc, note) => {
    const dayKey = note.day_of_week;
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(note);
    return acc;
  }, {});

  // Corrigir a função handleDelete para passar o ID completo
  const handleDelete = async (note) => {
    try {
      if (!window.confirm("Tem certeza que deseja excluir esta observação?")) return;
      
      if (!note || !note.id) {toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível excluir a observação"
        });
        return;
      }
      
      // Passar o ID completo para o componente pai
      if (onDelete) onDelete(note.id);
      
    } catch (error) {toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a observação"
      });
    }
  };

  return (
    <div className="space-y-2">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-gray-500" />
            Observações da Semana
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          <AnimatePresence>
            {Object.entries(groupedNotes).map(([day, dayNotes]) => (
              <motion.div 
                key={day} 
                className="mb-8 last:mb-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Cabeçalho do dia mais destacado */}
                <div className="border-b border-gray-100 pb-2 mb-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600"></div>
                    {dayNames[parseInt(day)]}
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <AnimatePresence>
                    {dayNotes.map((note) => (
                      <motion.div 
                        key={note.id} 
                        className={`
                          relative rounded-lg overflow-hidden transition-all
                          ${note.important 
                            ? 'bg-amber-50 hover:bg-amber-100/80' 
                            : 'bg-gray-50 hover:bg-gray-100/80'
                          }
                          shadow-sm hover:shadow-md
                          ${onNoteClick ? 'cursor-pointer' : ''}
                        `}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => {
                          // Não propagar o clique se vier do dropdown ou seus itens
                          if (!e.target.closest('.note-actions')) {
                            onNoteClick && onNoteClick(note);
                          }
                        }}
                      >
                        {/* Borda lateral colorida */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ 
                            backgroundColor: categoryColors[note.category_id] || '#6b7280',
                            opacity: 0.7
                          }}
                        />
                        
                        <div className="p-3 pl-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                {note.category_name && (
                                  <Badge variant="outline" className="text-xs font-normal bg-white/50">
                                    {note.category_name}
                                  </Badge>
                                )}
                                {note.recipe_name && (
                                  <Badge variant="outline" className="text-xs font-normal bg-blue-50/50 text-blue-700 border-blue-200">
                                    {note.recipe_name}
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-700 leading-relaxed break-words">
                                {note.content}
                              </p>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 hover:text-gray-600 note-actions"
                                  onClick={(e) => {
                                    // Impedir a propagação do clique
                                    e.stopPropagation();
                                  }}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent 
                                align="end"
                                className="note-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenuItem onClick={() => onToggleImportant(note)}>
                                  {note.important ? (
                                    <>
                                      <StarOff className="h-4 w-4 mr-2" />
                                      Remover destaque
                                    </>
                                  ) : (
                                    <>
                                      <Star className="h-4 w-4 mr-2" />
                                      Destacar nota
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditClick(note)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(note)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {notes.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 text-sm">
                Nenhuma observação para esta semana
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
