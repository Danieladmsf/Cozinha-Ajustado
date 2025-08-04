import { useState, useCallback } from 'react';
import { toast } from "@/components/ui/use-toast";

export const useMenuNoteActions = (menuNotes, categories = [], recipes = []) => {
  // Estados para controle da interface de notas
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [currentNoteData, setCurrentNoteData] = useState(null);
  const [noteForm, setNoteForm] = useState({
    categoryId: null,
    itemIndex: null,
    dayIndex: null,
    content: '',
    important: false,
    recipeId: null
  });

  // Função para iniciar adição de nota
  const startAddingNote = useCallback((categoryId, itemIndex, dayIndex, recipeId = null) => {
    const category = categories.find(c => c.id === categoryId);
    const recipe = recipes.find(r => r.id === recipeId);
    
    setNoteForm({
      categoryId,
      itemIndex,
      dayIndex,
      content: '',
      important: false,
      recipeId
    });
    
    setCurrentNoteData({
      categoryName: category?.name || 'Categoria',
      recipeName: recipe?.name || null
    });
    
    setIsAddingNote(true);
    setIsEditingNote(false);
  }, [categories, recipes]);

  // Função para iniciar edição de nota
  const startEditingNote = useCallback((note) => {
    const category = categories.find(c => c.id === note.category_id);
    const recipe = recipes.find(r => r.id === note.recipe_id);
    
    setNoteForm({
      categoryId: note.category_id,
      itemIndex: note.item_index,
      dayIndex: note.day_of_week,
      content: note.content,
      important: note.important || false,
      recipeId: note.recipe_id
    });
    
    setCurrentNoteData({
      ...note,
      categoryName: category?.name || 'Categoria',
      recipeName: recipe?.name || null
    });
    
    setIsEditingNote(true);
    setIsAddingNote(false);
  }, [categories, recipes]);

  // Função para cancelar operação
  const cancelNoteOperation = useCallback(() => {
    setIsAddingNote(false);
    setIsEditingNote(false);
    setCurrentNoteData(null);
    setNoteForm({
      categoryId: null,
      itemIndex: null,
      dayIndex: null,
      content: '',
      important: false,
      recipeId: null
    });
  }, []);

  // Função para salvar nota (nova ou editada)
  const saveNote = useCallback(async () => {
    try {
      if (!noteForm.content.trim()) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "O conteúdo da observação é obrigatório"
        });
        return false;
      }

      const noteData = {
        day_of_week: noteForm.dayIndex,
        category_id: noteForm.categoryId,
        item_index: noteForm.itemIndex,
        recipe_id: noteForm.recipeId,
        content: noteForm.content.trim(),
        important: noteForm.important,
        category_name: currentNoteData?.categoryName,
        recipe_name: currentNoteData?.recipeName
      };

      if (isEditingNote && currentNoteData?.id) {
        // Atualizar nota existente
        await menuNotes.updateNote(currentNoteData.id, noteData);
        toast({
          title: "Sucesso",
          description: "Observação atualizada com sucesso"
        });
      } else {
        // Criar nova nota
        await menuNotes.addNote(noteData);
        toast({
          title: "Sucesso",
          description: "Observação adicionada com sucesso"
        });
      }

      cancelNoteOperation();
      return true;
    } catch (error) {
      console.error("Erro ao salvar nota:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar a observação"
      });
      return false;
    }
  }, [noteForm, currentNoteData, isEditingNote, menuNotes, cancelNoteOperation]);

  // Função para excluir nota
  const deleteNote = useCallback(async (noteId) => {
    try {
      if (!noteId) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "ID da nota não encontrado"
        });
        return false;
      }

      if (!window.confirm("Tem certeza que deseja excluir esta observação?")) {
        return false;
      }

      await menuNotes.deleteNote(noteId);
      
      toast({
        title: "Sucesso",
        description: "Observação excluída com sucesso"
      });
      
      return true;
    } catch (error) {
      console.error("Erro ao excluir nota:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a observação"
      });
      return false;
    }
  }, [menuNotes]);

  // Função para alternar importância da nota
  const toggleNoteImportance = useCallback(async (note) => {
    try {
      await menuNotes.updateNote(note.id, { 
        important: !note.important 
      });
      
      toast({
        title: "Sucesso",
        description: note.important 
          ? "Destaque removido da observação"
          : "Observação destacada com sucesso"
      });
      
      return true;
    } catch (error) {
      console.error("Erro ao alterar importância da nota:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar o destaque da observação"
      });
      return false;
    }
  }, [menuNotes]);

  // Função para atualizar conteúdo do formulário
  const updateNoteContent = useCallback((content) => {
    setNoteForm(prev => ({ ...prev, content }));
  }, []);

  // Função para alternar importância no formulário
  const toggleNoteFormImportance = useCallback(() => {
    setNoteForm(prev => ({ ...prev, important: !prev.important }));
  }, []);

  return {
    // Estados
    isAddingNote,
    isEditingNote,
    currentNoteData,
    noteForm,
    
    // Ações principais
    startAddingNote,
    startEditingNote,
    cancelNoteOperation,
    saveNote,
    deleteNote,
    toggleNoteImportance,
    
    // Ações do formulário
    updateNoteContent,
    toggleNoteFormImportance
  };
};