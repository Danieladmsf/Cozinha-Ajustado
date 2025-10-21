
import React, { useState, useEffect } from "react";
import { User } from "@/app/api/entities";
import { MenuConfig as MenuConfigEntity } from "@/app/api/entities";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
// Card components removed to reduce card bloat
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Paintbrush, 
  Layout,
  Check,
  Grid,
  Palette,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Power } from "lucide-react";

// Componente ColorPalette para seleção de cores
const ColorPalette = ({ onSelect }) => {
  const colors = [
    "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
    "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
    "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800",
    "#ff5722", "#795548", "#9e9e9e", "#607d8b", "#000000"
  ];

  return (
    <div className="grid grid-cols-10 gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className="w-6 h-6 rounded-full hover:scale-110 transition-transform border border-gray-300"
          style={{ backgroundColor: color }}
          onClick={() => onSelect(color)}
        />
      ))}
    </div>
  );
};

export default function MenuConfig({ categories, onConfigChange }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("layout");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para configurações
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [categoryColors, setCategoryColors] = useState({});
  const [fixedDropdowns, setFixedDropdowns] = useState({});
  const [availableDays, setAvailableDays] = useState([1, 2, 3, 4, 5]); // Segunda a sexta por padrão
  const [configId, setConfigId] = useState(null);
  
  // Adicionar estado para ordem das categorias
  const [categoryOrder, setCategoryOrder] = useState([]);

  // Adicionar estado para categorias ativas/inativas
  const [activeCategories, setActiveCategories] = useState({});

  // Melhorar carregamento de configurações
  useEffect(() => {
    if (categories.length > 0) { // Só carrega se tiver categorias
      loadConfig();
    }
  }, [categories]); // Dependência nas categorias
  
  // Carregar ordem das categorias
  useEffect(() => {
    if (Array.isArray(categories)) {
      // Criar ordem inicial baseada nas categorias existentes
      const initialOrder = categories.map(cat => cat.id);
      setCategoryOrder(initialOrder);

      const initialActiveState = {};
      categories.forEach(category => {
        // Por padrão, todas as categorias são ativas
        initialActiveState[category.id] = true;
      });
      
      setActiveCategories(initialActiveState);
    }
  }, [categories]);

  // Carregar configurações do usuário
  const loadConfig = async () => {
    try {
      setLoading(true);
      
      // Use mock user ID for development without authentication
      const mockUserId = 'mock-user-id';
      
      // Filtrar para pegar apenas a configuração padrão do usuário
      const configs = await MenuConfigEntity.filter({ 
        user_id: mockUserId,
        is_default: true
      });
      
      if (configs && configs.length > 0) {
        const config = configs[0];// Configurar estados com valores carregados
        setExpandedCategories(config.expanded_categories || []);
        setCategoryColors(config.category_colors || {});
        setFixedDropdowns(config.fixed_dropdowns || {});
        setAvailableDays(config.available_days || [1, 2, 3, 4, 5]);
        setCategoryOrder(config.category_order || []);
        
        // Inicializar o estado de categorias ativas
        // Se não houver configuração, assume todas ativas
        if (config.active_categories) {
          setActiveCategories(config.active_categories);
        } else {
          // Se não tiver configuração, inicializa todas como ativas
          const initialActiveState = {};
          categories.forEach(category => {
            initialActiveState[category.id] = true;
          });
          setActiveCategories(initialActiveState);
        }
      } else {
        // Se não tiver configuração, inicializa padrões
        const initialActiveState = {};
        categories.forEach(category => {
          initialActiveState[category.id] = true;
        });
        setActiveCategories(initialActiveState);
      }
    } catch (error) {setError("Não foi possível carregar as configurações do cardápio.");
    } finally {
      setLoading(false);
    }
  };

  // Função para criar configuração padrão
  const createDefaultConfig = async () => {
    try {
      // Use mock user ID for development without authentication
      const mockUserId = 'mock-user-id';
      
      const defaultConfig = {
        user_id: mockUserId,
        expanded_categories: [],
        category_colors: {},
        fixed_dropdowns: {},
        available_days: [1, 2, 3, 4, 5],
        category_order: categories.map(cat => cat.id),
        is_default: true,
        active_categories: categories.reduce((obj, category) => {
          obj[category.id] = true; // Todas as categorias ativas por padrão
          return obj;
        }, {})
      };
      
      // Lógica de criação de configuração removida
      
      // Atualizar estado local
      setConfigId(newConfig.id);
      setExpandedCategories([]);
      setCategoryColors({});
      setFixedDropdowns({});
      setAvailableDays([1, 2, 3, 4, 5]);
      setCategoryOrder(categories.map(cat => cat.id));
      setActiveCategories(categories.reduce((obj, category) => {
        obj[category.id] = true; // Todas as categorias ativas por padrão
        return obj;
      }, {}));
      
      // Notificar componente pai
      if (typeof onConfigChange === 'function') {
        onConfigChange({
          expandedCategories: [],
          categoryColors: {},
          fixedDropdowns: {},
          availableDays: [1, 2, 3, 4, 5],
          categoryOrder: categories.map(cat => cat.id),
          activeCategories: categories.reduce((obj, category) => {
            obj[category.id] = true;
            return obj;
          }, {})
        });
      }} catch (error) {setError("Não foi possível criar a configuração padrão.");
    }
  };

    // Função para lidar com drag and drop
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(categoryOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCategoryOrder(items);
  };

  // Função para salvar configurações
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use mock user ID for development without authentication
      const mockUserId = 'mock-user-id';
      
      // Montar dados para salvar
      const configData = {
        user_id: mockUserId,
        expanded_categories: Array.isArray(expandedCategories) ? expandedCategories : [],
        category_colors: categoryColors || {},
        fixed_dropdowns: fixedDropdowns || {},
        available_days: Array.isArray(availableDays) ? availableDays : [1, 2, 3, 4, 5],
        category_order: categoryOrder || [],
        active_categories: activeCategories || {},
        is_default: true
      };// Debug log
      
      // Verificar se já existe uma configuração padrão
      const configs = await MenuConfigEntity.filter({ 
        user_id: user.id,
        is_default: true
      });
      
      // Lógica de salvamento de configuração removida
      
      toast({
        description: "Configurações salvas com sucesso",
      });
      
      // Notificar componente pai sobre mudanças
      if (typeof onConfigChange === 'function') {
        onConfigChange({
          expandedCategories: expandedCategories,
          categoryColors: categoryColors,
          fixedDropdowns: fixedDropdowns,
          availableDays: availableDays,
          category_order: categoryOrder,
          activeCategories: activeCategories
        });
      }
      
      setOpen(false); // Fechar o modal
    } catch (error) {setError("Não foi possível salvar as configurações.");
    } finally {
      setLoading(false);
    }
  };
  
  // Função para alternar categoria ativa/inativa
  const toggleCategoryActive = (categoryId) => {
    setActiveCategories(prev => {
      const newState = { ...prev };
      // Garantir que o valor seja explicitamente um booleano
      newState[categoryId] = !Boolean(prev[categoryId]);return newState;
    });
  };

  // Toggle para dia da semana
  const toggleDay = (day) => {
    if (availableDays.includes(day)) {
      // Se já existir, remover (mas manter pelo menos um dia)
      if (availableDays.length > 1) {
        setAvailableDays(availableDays.filter(d => d !== day));
      }
    } else {
      // Se não existir, adicionar
      setAvailableDays([...availableDays, day].sort((a, b) => a - b));
    }
  };

  // Toggle para categoria expandida
  const toggleExpandedCategory = (categoryId) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter(id => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  // Atualizar cor da categoria
  const updateCategoryColor = (categoryId, color) => {
    setCategoryColors({
      ...categoryColors,
      [categoryId]: color
    });
  };

  // Atualizar número de dropdowns fixos
  const updateFixedDropdowns = (categoryId, value) => {
    const numValue = parseInt(value) || 0;
    setFixedDropdowns({
      ...fixedDropdowns,
      [categoryId]: Math.max(0, Math.min(10, numValue)) // Limitar entre 0 e 10
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Settings className="h-4 w-4" />
        )}
        <span className="hidden md:inline">Configurar Cardápio</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações do Cardápio
            </DialogTitle>
            <DialogDescription>
              Configure as categorias visíveis, cores, número de dropdowns fixos e dias disponíveis para o cardápio.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="layout">
                <Layout className="h-4 w-4 mr-2" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="colors">
                <Paintbrush className="h-4 w-4 mr-2" />
                Cores
              </TabsTrigger>
              <TabsTrigger value="days">
                <Calendar className="h-4 w-4 mr-2" />
                Dias da Semana
              </TabsTrigger>
            </TabsList>

            <TabsContent value="layout" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Coluna 1: Ordem e Ativar/Desativar Categorias */}
                <div className="space-y-4">
                  {/* Ordem das Categorias */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <GripVertical className="h-4 w-4" />
                      Ordem das Categorias
                    </h3>
                    <p className="text-sm text-gray-500">
                      Arraste para reordenar as categorias no cardápio:
                    </p>

                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="categories">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2 max-h-[400px] overflow-y-auto pr-2"
                          >
                            {categoryOrder.map((categoryId, index) => {
                              const category = categories.find(c => c.id === categoryId);
                              if (!category) return null;
                              
                              return (
                                <Draggable 
                                  key={category.id} 
                                  draggableId={category.id} 
                                  index={index}
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="flex items-center gap-2 p-2 bg-white border rounded shadow-sm"
                                    >
                                      <div 
                                        {...provided.dragHandleProps}
                                        className="cursor-grab hover:text-blue-600"
                                      >
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded-full"
                                          style={{ 
                                            backgroundColor: categoryColors[category.id] || category.color || '#808080' 
                                          }}
                                        />
                                        <span>{category.name}</span>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                  
                  {/* Ativar/Desativar Categorias - NOVA SEÇÃO */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Power className="h-4 w-4" />
                      Ativar/Desativar Categorias
                    </h3>
                    <p className="text-sm text-gray-500">
                      Defina quais categorias estarão visíveis no cardápio:
                    </p>
                    
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      {categories.map(category => (
                        <div 
                          key={category.id} 
                          className={`flex items-center justify-between p-2 border rounded ${
                            activeCategories[category.id] ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full opacity-75"
                              style={{ 
                                backgroundColor: categoryColors[category.id] || category.color || '#808080',
                                opacity: activeCategories[category.id] ? 1 : 0.5 
                              }}
                            />
                            <span className={activeCategories[category.id] ? '' : 'text-gray-400'}>
                              {category.name}
                            </span>
                          </div>
                          <Switch
                            checked={activeCategories[category.id]}
                            onCheckedChange={() => toggleCategoryActive(category.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Coluna 2: Categorias Expandidas e Dropdowns Fixos */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Grid className="h-4 w-4" />
                      Categorias Expandidas
                    </h3>
                    <p className="text-sm text-gray-500">
                      Escolha quais categorias devem mostrar os locais por padrão:
                    </p>

                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {categories.map(category => (
                          <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center">
                              <Switch
                                checked={expandedCategories.includes(category.id)}
                                onCheckedChange={() => toggleExpandedCategory(category.id)}
                              />
                              <Label className="ml-2">{category.name}</Label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Dropdowns Fixos */}
                  <div className="space-y-2 mt-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Grid className="h-4 w-4" />
                      Dropdowns Fixos
                    </h3>
                    <p className="text-sm text-gray-500">
                      Defina a quantidade mínima de dropdowns para cada categoria:
                    </p>

                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {categories.map(category => (
                          <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                            <Label>{category.name}</Label>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              className="w-20"
                              value={fixedDropdowns[category.id] || 0}
                              onChange={(e) => updateFixedDropdowns(category.id, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="colors" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Cores das Categorias
                </h3>
                <p className="text-sm text-gray-500">
                  Personalize as cores para cada categoria:
                </p>

                <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                  {categories.map(category => {
                    // Usar cor personalizada ou cor padrão da categoria
                    const categoryColor = categoryColors[category.id] || category.color || "#808080";
                    
                    return (
                      <div key={category.id} className="p-3 bg-white border rounded shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: categoryColor }}
                              ></div>
                              <span className="font-medium">{category.name}</span>
                            </div>
                            <Badge variant="outline" style={{ borderColor: categoryColor, color: categoryColor }}>
                              {categoryColor}
                            </Badge>
                          </div>
                          <div className="mt-1">
                            <ColorPalette onSelect={(color) => updateCategoryColor(category.id, color)} />
                          </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="days" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Dias da Semana Disponíveis
                </h3>
                <p className="text-sm text-gray-500">
                  Escolha quais dias da semana serão exibidos no cardápio:
                </p>

                <div className="grid grid-cols-7 gap-2">
                  {[
                    { day: 0, label: "Dom" },
                    { day: 1, label: "Seg" },
                    { day: 2, label: "Ter" },
                    { day: 3, label: "Qua" },
                    { day: 4, label: "Qui" },
                    { day: 5, label: "Sex" },
                    { day: 6, label: "Sáb" },
                  ].map(({ day, label }) => (
                    <button
                      key={day}
                      type="button"
                      className={`p-3 rounded border flex flex-col items-center justify-center transition-colors ${
                        availableDays.includes(day)
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-gray-50 border-gray-200 text-gray-400"
                      }`}
                      onClick={() => toggleDay(day)}
                      disabled={availableDays.length === 1 && availableDays.includes(day)}
                    >
                      <span className="font-medium">{label}</span>
                      <div className="mt-2 h-5">
                        {availableDays.includes(day) && (
                          <Check className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Configurações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
