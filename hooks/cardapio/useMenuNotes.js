import { useState, useEffect, useCallback } from 'react';
import { startOfWeek, getWeek } from "date-fns";
import { MenuNote } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";

export const useMenuNotes = (currentDate) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadNotes = useCallback(async (date = currentDate) => {
    try {
      setLoading(true);
      setError(null);
      
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekKey = `${weekStart.getFullYear()}-W${getWeek(date, { weekStartsOn: 1 })}`;

      const notesData = await MenuNote.query([
        { field: 'user_id', operator: '==', value: mockUserId },
        { field: 'week_key', operator: '==', value: weekKey }
      ]);

      setNotes(notesData || []);
    } catch (error) {
      setError("Erro ao carregar notas do menu");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const addNote = useCallback(async (noteData) => {
    try {
      setLoading(true);
      
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekKey = `${weekStart.getFullYear()}-W${getWeek(currentDate, { weekStartsOn: 1 })}`;

      const newNote = await MenuNote.create({
        user_id: mockUserId,
        week_key: weekKey,
        ...noteData
      });

      setNotes(prev => [...prev, newNote]);
      return newNote;
    } catch (error) {
      setError("Erro ao adicionar nota");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const updateNote = useCallback(async (noteId, updates) => {
    try {
      setLoading(true);
      
      const updatedNote = await MenuNote.update(noteId, updates);
      
      setNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, ...updates } : note
      ));
      
      return updatedNote;
    } catch (error) {
      setError("Erro ao atualizar nota");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteNote = useCallback(async (noteId) => {
    try {
      setLoading(true);
      
      await MenuNote.delete(noteId);
      
      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      setError("Erro ao deletar nota");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getNotesForDay = useCallback((dayIndex) => {
    return notes.filter(note => note.day_index === dayIndex);
  }, [notes]);

  const getNotesForCategory = useCallback((dayIndex, categoryId) => {
    return notes.filter(note => 
      note.day_index === dayIndex && note.category_id === categoryId
    );
  }, [notes]);

  const getNotesForItem = useCallback((dayIndex, categoryId, itemIndex) => {
    return notes.filter(note => 
      note.day_index === dayIndex && 
      note.category_id === categoryId && 
      note.item_index === itemIndex
    );
  }, [notes]);

  // Carregar notas quando a data atual mudar
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return {
    notes,
    loading,
    error,
    loadNotes,
    addNote,
    updateNote,
    deleteNote,
    getNotesForDay,
    getNotesForCategory,
    getNotesForItem,
    setNotes // Para compatibilidade com MenuNotes component
  };
};