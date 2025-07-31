import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Calendar,
  Package2,
  AlertCircle,
  Utensils,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from "@/components/ui/use-toast"; // Para feedback de salvamento automático

// Tipos de pré-preparo disponíveis
const prePreparoTypes = [
  { id: 'descongelamento', label: 'Descongelamento', color: 'blue-500', bgColor: 'blue-50', borderColor: 'blue-200', time: '24-72h', temp: '2-4°C' },
  { id: 'limpar', label: 'Limpar', color: 'green-500', bgColor: 'green-50', borderColor: 'green-200', time: '15-30min', temp: 'Ambiente' },
  { id: 'higienizar', label: 'Higienizar', color: 'cyan-500', bgColor: 'cyan-50', borderColor: 'cyan-200', time: '10-15min', temp: 'Ambiente' },
  { id: 'picar', label: 'Picar', color: 'orange-500', bgColor: 'orange-50', borderColor: 'orange-200', time: '10-30min', temp: 'Ambiente' },
  { id: 'cortar', label: 'Cortar', color: 'amber-500', bgColor: 'amber-50', borderColor: 'amber-200', time: '15-45min', temp: 'Ambiente' },
  { id: 'ralar', label: 'Ralar', color: 'yellow-500', bgColor: 'yellow-50', borderColor: 'yellow-200', time: '5-15min', temp: 'Ambiente' },
  { id: 'fatiar', label: 'Fatiar', color: 'lime-500', bgColor: 'lime-50', borderColor: 'lime-200', time: '10-25min', temp: 'Ambiente' },
  { id: 'moer', label: 'Moer', color: 'emerald-500', bgColor: 'emerald-50', borderColor: 'emerald-200', time: '5-10min', temp: 'Ambiente' },
  { id: 'temperar', label: 'Temperar/Marinar', color: 'purple-500', bgColor: 'purple-50', borderColor: 'purple-200', time: '2-24h', temp: '2-4°C' },
  { id: 'deixar_molho', label: 'Deixar de molho', color: 'indigo-500', bgColor: 'indigo-50', borderColor: 'indigo-200', time: '8-24h', temp: 'Ambiente' },
  { id: 'empanar', label: 'Empanar', color: 'pink-500', bgColor: 'pink-50', borderColor: 'pink-200', time: '20-40min', temp: 'Ambiente' },
  { id: 'misturar', label: 'Misturar', color: 'rose-500', bgColor: 'rose-50', borderColor: 'rose-200', time: '5-15min', temp: 'Ambiente' },
  { id: 'peneirar', label: 'Peneirar', color: 'slate-500', bgColor: 'slate-50', borderColor: 'slate-200', time: '5-10min', temp: 'Ambiente' },
  { id: 'desossar', label: 'Desossar', color: 'red-500', bgColor: 'red-50', borderColor: 'red-200', time: '30-60min', temp: 'Ambiente' },
  { id: 'limpar_proteina', label: 'Limpar proteína animal', color: 'teal-500', bgColor: 'teal-50', borderColor: 'teal-200', time: '20-45min', temp: 'Ambiente' },
  { id: 'secar', label: 'Secar', color: 'gray-500', bgColor: 'gray-50', borderColor: 'gray-200', time: '10-30min', temp: 'Ambiente' },
  { id: 'separar', label: 'Separar', color: 'zinc-500', bgColor: 'zinc-50', borderColor: 'zinc-200', time: '5-15min', temp: 'Ambiente' },
  { id: 'mise_en_place', label: 'Mise en place', color: 'violet-500', bgColor: 'violet-50', borderColor: 'violet-200', time: '30-60min', temp: 'Ambiente' }
];

export default function IngredientPrePreparoItem({ ingredient, recipe, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prePreparoData, setPrePreparoData] = useState({
    tasks: [],
    days_advance: 0,
    notes: '',
    estimated_time: '',
    temperature: 'Ambiente',
    ingredient_name: ingredient.name,
    updated_at: new Date().toISOString()
  });
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();
  const saveTimeoutRef = React.useRef(null);

  // Carregar dados existentes do pré-preparo
  useEffect(() => {
    if (recipe.pre_preparo && recipe.pre_preparo[ingredient.id]) {
      const existingData = recipe.pre_preparo[ingredient.id];
      setPrePreparoData({
        tasks: existingData.tasks || [],
        days_advance: existingData.days_advance || 0,
        notes: existingData.notes || '',
        estimated_time: existingData.estimated_time || '',
        temperature: existingData.temperature || 'Ambiente',
        ingredient_name: ingredient.name,
        updated_at: existingData.updated_at || new Date().toISOString()
      });
      
      // Auto-expandir se já tem dados e não foi explicitamente fechado
      if (existingData.tasks && existingData.tasks.length > 0 && !sessionStorage.getItem(`prePreparoExpanded_${ingredient.id}`)) {
        setIsExpanded(true);
      }
    } else {
      // Resetar para estado inicial se não há dados
      setPrePreparoData({
        tasks: [], days_advance: 0, notes: '', estimated_time: '', temperature: 'Ambiente',
        ingredient_name: ingredient.name, updated_at: new Date().toISOString()
      });
    }
  }, [ingredient.id, recipe.pre_preparo, ingredient.name]);

  // Salvamento automático com debounce
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (isDirty) {
        const dataToSave = {
          ...prePreparoData,
          updated_at: new Date().toISOString()
        };
        onUpdate(ingredient.id, dataToSave);
        setIsDirty(false);
        // toast({
        //   title: "Pré-preparo salvo!",
        //   description: `Configurações de ${ingredient.name} atualizadas.`,
        //   duration: 2000,
        // });
      }
    }, 1500); // Salva após 1.5 segundos de inatividade
  }, [prePreparoData, onUpdate, ingredient.id, ingredient.name, isDirty, toast]);

  useEffect(() => {
    if (isDirty) {
      debouncedSave();
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [prePreparoData, isDirty, debouncedSave]);

  const handleInputChange = (field, value) => {
    setPrePreparoData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };
  
  const handleTaskToggle = (taskId) => {
    const newTasks = prePreparoData.tasks.includes(taskId)
      ? prePreparoData.tasks.filter(id => id !== taskId)
      : [...prePreparoData.tasks, taskId];
    
    handleInputChange('tasks', newTasks);
  };
  
  const handleToggleExpand = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    if (newExpandedState) {
      sessionStorage.removeItem(`prePreparoExpanded_${ingredient.id}`);
    } else {
      sessionStorage.setItem(`prePreparoExpanded_${ingredient.id}`, 'false');
    }
  };

  const getDaysAdvanceColor = (days) => {
    if (days === 0) return "bg-gray-100 text-gray-600 border-gray-300";
    if (days <= 1) return "bg-green-100 text-green-700 border-green-300";
    if (days <= 3) return "bg-blue-100 text-blue-700 border-blue-300";
    return "bg-purple-100 text-purple-700 border-purple-300";
  };

  const getTaskBadgeStyle = (taskId) => {
    const task = prePreparoTypes.find(t => t.id === taskId);
    if (!task) return { color: 'gray-500', bgColor: 'gray-50', borderColor: 'gray-200' };
    return { color: task.color, bgColor: task.bgColor, borderColor: task.borderColor };
  };

  const hasPrePreparoData = prePreparoData.tasks.length > 0 || prePreparoData.days_advance > 0 || prePreparoData.notes.trim() || prePreparoData.estimated_time.trim();

  return (
    <div className="border-l-4 border-transparent hover:border-indigo-300 transition-colors duration-200 group">
      {/* Header do Ingrediente - Sempre Visível */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/80 transition-colors duration-200"
        onClick={handleToggleExpand}
      >
        <div className="flex items-center gap-4 flex-grow min-w-0">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-500 group-hover:text-indigo-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-indigo-500" />
          )}
          
          <div className="flex items-center gap-3 flex-shrink-0">
            <Package2 className="h-6 w-6 text-indigo-500" />
          </div>
          
          <div className="flex-grow min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 truncate group-hover:text-indigo-600">
              {ingredient.name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
              <span>Etapa FT: {ingredient.prep_step}</span>
              <span>Unidade: {ingredient.unit}</span>
              {prePreparoData.tasks.length > 0 && (
                <div className="flex items-center gap-1">
                  <Utensils className="h-3 w-3 text-purple-500" />
                  <span>{prePreparoData.tasks.length} tarefa{prePreparoData.tasks.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Indicadores Visuais no Header */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {prePreparoData.days_advance > 0 && (
            <Badge variant="outline" className={`px-2.5 py-1 text-xs font-medium border ${getDaysAdvanceColor(prePreparoData.days_advance)}`}>
              <Calendar className="h-3 w-3 mr-1.5" />
              {prePreparoData.days_advance} {prePreparoData.days_advance === 1 ? 'dia' : 'dias'} antes
            </Badge>
          )}
          {prePreparoData.estimated_time && (
            <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50 px-2.5 py-1 text-xs">
              <Clock className="h-3 w-3 mr-1.5" />
              {prePreparoData.estimated_time}
            </Badge>
          )}
           {hasPrePreparoData ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 px-2.5 py-1 text-xs">
              Configurado
            </Badge>
          ) : (
             <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 px-2.5 py-1 text-xs">
              Pendente
            </Badge>
          )}
        </div>
      </div>

      {/* Conteúdo Expandido */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "circOut" }}
            className="overflow-hidden border-t bg-slate-50"
          >
            <div className="p-6 space-y-6">
              {/* Configurações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <Label htmlFor={`days-${ingredient.id}`} className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Dias Antecedência
                  </Label>
                  <Input
                    id={`days-${ingredient.id}`}
                    type="number"
                    min="0"
                    max="30"
                    value={prePreparoData.days_advance}
                    onChange={(e) => handleInputChange('days_advance', parseInt(e.target.value) || 0)}
                    className="w-full h-9 text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor={`time-${ingredient.id}`} className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Tempo Estimado (Total)
                  </Label>
                  <Input
                    id={`time-${ingredient.id}`}
                    type="text"
                    value={prePreparoData.estimated_time}
                    onChange={(e) => handleInputChange('estimated_time', e.target.value)}
                    className="w-full h-9 text-sm"
                    placeholder="Ex: 2h, 30min, 24h"
                  />
                </div>

                <div>
                  <Label htmlFor={`temp-${ingredient.id}`} className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Temperatura Principal
                  </Label>
                  <Select
                    value={prePreparoData.temperature}
                    onValueChange={(value) => handleInputChange('temperature', value)}
                  >
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ambiente">Ambiente</SelectItem>
                      <SelectItem value="2-4°C">Geladeira (2-4°C)</SelectItem>
                      <SelectItem value="0°C">Refrigerador (0°C)</SelectItem>
                      <SelectItem value="-18°C">Congelador (-18°C)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seleção de Tarefas */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Tarefas de Pré-Preparo para <span className="text-indigo-600">{ingredient.name}</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {prePreparoTypes.map(task => {
                    const isSelected = prePreparoData.tasks.includes(task.id);
                    const styles = getTaskBadgeStyle(task.id);
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-150 
                                    ${isSelected ? `border-${styles.color} bg-${styles.bgColor} shadow-sm` 
                                                : `border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm`}`}
                        onClick={() => handleTaskToggle(task.id)}
                        title={`${task.label}: ${task.time} @ ${task.temp}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Checkbox 
                            checked={isSelected}
                            className={`pointer-events-none border-${styles.color} data-[state=checked]:bg-${styles.color} data-[state=checked]:text-white`}
                          />
                          <span className={`text-xs font-medium ${isSelected ? `text-${styles.color}` : 'text-gray-700'}`}>
                            {task.label}
                          </span>
                        </div>
                        {/* <div className="text-xs text-gray-500">
                          <div>{task.time} / {task.temp}</div>
                        </div> */}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instruções */}
              <div>
                <Label htmlFor={`notes-${ingredient.id}`} className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Instruções Detalhadas
                </Label>
                <Textarea
                  id={`notes-${ingredient.id}`}
                  value={prePreparoData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full min-h-[80px] resize-none text-sm"
                  placeholder="Descreva como executar o pré-preparo deste ingrediente..."
                />
              </div>

              {/* Feedback de salvamento */}
              {/* <div className="text-xs text-gray-500 italic text-right">
                {isDirty ? "Alterações pendentes..." : "Salvo automaticamente"}
              </div> */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}