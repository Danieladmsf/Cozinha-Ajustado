import React from 'react';
import { useRecipeStore } from '@/hooks/ficha-tecnica/useRecipeStore';
import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, Textarea } from "@/components/ui";
import { Plus, Edit, Trash2 } from "lucide-react";
import AssemblySubComponents from './AssemblySubComponents';

const processColumns = {
  defrosting: { label: 'Descongelamento', fields: ['weight_frozen', 'weight_thawed'], color: 'blue' },
  cleaning: { label: 'Limpeza', fields: ['weight_raw', 'weight_clean'], color: 'green' },
  cooking: { label: 'Cocção', fields: ['weight_pre_cooking', 'weight_cooked'], color: 'orange' },
  portioning: { label: 'Porcionamento', fields: ['weight_portioned'], color: 'teal' },
};

const IngredientRow = ({ prep, ingredient, prepIndex, ingredientIndex }) => {
  const { actions, computed } = useRecipeStore();
  const { formatCurrency, formatPercentage, parseNumeric, calculateLoss, getYield, getCleanCost } = computed;

  const updateField = (field, value) => {
    actions.updateIngredient(prep.id, ingredient.id, { [field]: value });
  };

  const activeProcesses = prep.processes || [];

  return (
    <TableRow>
      <TableCell className="font-medium font-mono capitalize">{ingredient.name}</TableCell>
      <TableCell className="text-center font-mono">{formatCurrency(ingredient.price_per_kg_bruto)}</TableCell>
      <TableCell className="text-center font-semibold text-green-700 font-mono">{formatCurrency(getCleanCost(ingredient))}</TableCell>

      {Object.keys(processColumns).map(procKey => {
        if (!activeProcesses.includes(procKey)) return null;
        const proc = processColumns[procKey];
        const initialWeight = ingredient[proc.fields[0]] || '0';
        const finalWeight = ingredient[proc.fields[1]] || '0';

        return (
          <React.Fragment key={procKey}>
            <TableCell className="font-mono">
              <Input value={initialWeight} onChange={e => updateField(proc.fields[0], e.target.value)} className="w-24 text-center font-mono" />
            </TableCell>
            <TableCell className="font-mono">
              <Input value={finalWeight} onChange={e => updateField(proc.fields[1], e.target.value)} className="w-24 text-center font-mono" />
            </TableCell>
            <TableCell className="text-center font-mono">
              <span className="text-slate-600">{formatPercentage(calculateLoss(initialWeight, finalWeight))}</span>
            </TableCell>
          </React.Fragment>
        );
      })}

      <TableCell className="text-center font-bold font-mono"><span className="text-slate-700">{formatPercentage(getYield(ingredient))}</span></TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" onClick={() => actions.removeIngredient(prep.id, ingredient.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </TableCell>
    </TableRow>
  );
};

export default function IngredientTable({ prepIndex }) {
  const { preparations, actions, computed } = useRecipeStore();
  const prep = preparations[prepIndex];

  const isAssemblyOrPortioningOnly = (prep.processes.includes('assembly') || prep.processes.includes('portioning')) && prep.processes.length === 1;

  if (isAssemblyOrPortioningOnly) {
    return <AssemblySubComponents prepIndex={prepIndex} />;
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={() => actions.openModal('ingredientSelector', { prepIndex })} className="border-dashed">
        <Plus className="h-4 w-4 mr-2" /> Adicionar Ingrediente
      </Button>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={3} className="bg-gray-50 text-center">Ingrediente</TableHead>
              {prep.processes.map(p => (
                <TableHead key={p} colSpan={3} className={`bg-${processColumns[p]?.color}-50 text-center`}>{processColumns[p]?.label}</TableHead>
              ))}
              <TableHead colSpan={2} className="bg-purple-50 text-center">Totais</TableHead>
            </TableRow>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-center">Preço Bruto/kg</TableHead>
              <TableHead className="text-center">Custo Limpo/kg</TableHead>
              {prep.processes.map(p => (
                <React.Fragment key={p}>
                  <TableHead className="text-center">P. Inicial</TableHead>
                  <TableHead className="text-center">P. Final</TableHead>
                  <TableHead className="text-center">Perda</TableHead>
                </React.Fragment>
              ))}
              <TableHead className="text-center">Rendimento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prep.ingredients?.map((ing, ingIndex) => (
              <IngredientRow key={ing.id || ingIndex} prep={prep} ingredient={ing} prepIndex={prepIndex} ingredientIndex={ingIndex} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}