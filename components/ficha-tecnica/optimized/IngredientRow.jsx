import React, { useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";
import { formatCurrency } from '@/lib/formatUtils';

const IngredientRow = ({
  ingredient,
  prepIndex,
  ingredientIndex,
  prep,
  onUpdateIngredient,
  onRemoveIngredient,
}) => {
  const processes = prep.processes || [];
  const hasProcess = (processName) => processes.includes(processName);

  const parseNumericValue = (value) => {
    if (!value) return 0;
    const cleaned = String(value).replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculatedValues = useMemo(() => {
    const calculateLoss = (initial, final) => {
      const initialNum = parseNumericValue(initial);
      const finalNum = parseNumericValue(final);
      if (initialNum === 0) return 0;
      return ((initialNum - finalNum) / initialNum) * 100;
    };

    const calculateYield = () => {
      let initialWeight = 0;
      let finalWeight = 0;

      if (hasProcess('defrosting')) {
        initialWeight = parseNumericValue(ingredient.weight_frozen);
      } else if (hasProcess('cleaning')) {
        initialWeight = parseNumericValue(ingredient.weight_raw);
      } else if (hasProcess('cooking')) {
        initialWeight = parseNumericValue(ingredient.weight_pre_cooking) ||
          parseNumericValue(ingredient.weight_raw);
      } else if (hasProcess('portioning')) {
        initialWeight = parseNumericValue(ingredient.weight_raw);
      }

      if (hasProcess('portioning')) {
        finalWeight = parseNumericValue(ingredient.weight_portioned);
      } else if (hasProcess('cooking')) {
        finalWeight = parseNumericValue(ingredient.weight_cooked);
      } else if (hasProcess('cleaning')) {
        finalWeight = parseNumericValue(ingredient.weight_clean);
      } else if (hasProcess('defrosting')) {
        finalWeight = parseNumericValue(ingredient.weight_thawed);
      }

      if (initialWeight === 0) return 0;

      return (finalWeight / initialWeight) * 100;
    };

    const defrostingLoss = calculateLoss(ingredient.weight_frozen, ingredient.weight_thawed);
    
    let cleaningInitialWeight = 0;
    if (hasProcess('defrosting')) {
      cleaningInitialWeight = parseNumericValue(ingredient.weight_thawed);
    } else {
      cleaningInitialWeight = parseNumericValue(ingredient.weight_raw);
    }
    const cleaningLoss = calculateLoss(cleaningInitialWeight, parseNumericValue(ingredient.weight_clean));

    let cookingInitialWeight = parseNumericValue(ingredient.weight_pre_cooking);
    if (cookingInitialWeight === 0) {
      cookingInitialWeight = parseNumericValue(ingredient.weight_clean) ||
        parseNumericValue(ingredient.weight_thawed) ||
        parseNumericValue(ingredient.weight_raw);
    }
    const cookingLoss = calculateLoss(cookingInitialWeight, parseNumericValue(ingredient.weight_cooked));
    
    const portioningLoss = calculateLoss(
      ingredient.weight_raw || ingredient.weight_cooked || ingredient.weight_clean,
      ingredient.weight_portioned
    );

    const yieldPercentage = calculateYield();

    return {
      defrostingLoss,
      cleaningLoss,
      cookingLoss,
      portioningLoss,
      yieldPercentage,
    };
  }, [ingredient, prep.processes]);

  const updateIngredientField = (field, value) => {
    onUpdateIngredient(
      prepIndex,
      ingredientIndex,
      field,
      value
    );
  };

  return (
    <TableRow className="border-b border-gray-50 hover:bg-gray-50/50">
      <TableCell className="font-medium px-4 py-2">
        {ingredient.name}
      </TableCell>

      <TableCell className="text-center px-4 py-2">
        {formatCurrency(parseNumericValue(ingredient.current_price))}
      </TableCell>

      <TableCell className="text-center px-4 py-2">
        {formatCurrency(parseNumericValue(ingredient.current_price))}
      </TableCell>

      {hasProcess('defrosting') && (
        <>
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={ingredient.weight_frozen || ''}
              onChange={(e) => updateIngredientField('weight_frozen', e.target.value)}
              className="w-24 h-8 text-center text-xs"
              placeholder="0,000"
            />
          </TableCell>
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={ingredient.weight_thawed || ''}
              onChange={(e) => updateIngredientField('weight_thawed', e.target.value)}
              className="w-24 h-8 text-center text-xs"
              placeholder="0,000"
            />
          </TableCell>
          <TableCell className="text-center px-4 py-2">
            <Badge variant="secondary">
              {calculatedValues.defrostingLoss.toFixed(1)}%
            </Badge>
          </TableCell>
        </>
      )}

      {hasProcess('cleaning') && (
        <>
          {!hasProcess('defrosting') && (
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={ingredient.weight_raw || ''}
                onChange={(e) => updateIngredientField('weight_raw', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
              />
            </TableCell>
          )}
          {hasProcess('defrosting') && (
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={ingredient.weight_thawed || ''}
                readOnly
                className="w-24 h-8 text-center text-xs bg-gray-50 cursor-not-allowed"
                placeholder="0,000"
                title="Valor vem do processo de descongelamento"
              />
            </TableCell>
          )}
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={ingredient.weight_clean || ''}
              onChange={(e) => updateIngredientField('weight_clean', e.target.value)}
              className="w-24 h-8 text-center text-xs"
              placeholder="0,000"
            />
          </TableCell>
          <TableCell className="text-center px-4 py-2">
            <Badge variant="secondary">
              {calculatedValues.cleaningLoss.toFixed(1)}%
            </Badge>
          </TableCell>
        </>
      )}

      {hasProcess('cooking') && (
        <>
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={ingredient.weight_pre_cooking || ''}
              onChange={(e) => updateIngredientField('weight_pre_cooking', e.target.value)}
              className="w-24 h-8 text-center text-xs"
              placeholder="0,000"
              title="Peso antes da cocção"
            />
          </TableCell>
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={ingredient.weight_cooked || ''}
              onChange={(e) => updateIngredientField('weight_cooked', e.target.value)}
              className="w-24 h-8 text-center text-xs"
              placeholder="0,000"
              title="Peso depois da cocção"
            />
          </TableCell>
          <TableCell className="text-center px-4 py-2">
            <Badge variant="secondary">
              {calculatedValues.cookingLoss.toFixed(1)}%
            </Badge>
          </TableCell>
        </>
      )}

      {hasProcess('portioning') && (
        <>
          {!hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking') && (
            <TableCell className="px-4 py-2">
              <Input
                type="text"
                value={ingredient.weight_raw || ''}
                onChange={(e) => updateIngredientField('weight_raw', e.target.value)}
                className="w-24 h-8 text-center text-xs"
                placeholder="0,000"
              />
            </TableCell>
          )}
          <TableCell className="px-4 py-2">
            <Input
              type="text"
              value={ingredient.weight_portioned || ''}
              onChange={(e) => updateIngredientField('weight_portioned', e.target.value)}
              className="w-24 h-8 text-center text-xs"
              placeholder="0,000"
            />
          </TableCell>
          <TableCell className="text-center px-4 py-2">
            <Badge variant="secondary">
              {calculatedValues.portioningLoss.toFixed(1)}%
            </Badge>
          </TableCell>
        </>
      )}

      <TableCell className="text-center px-4 py-2">
        <Badge variant="default">
          {calculatedValues.yieldPercentage.toFixed(1)}%
        </Badge>
      </TableCell>

      <TableCell className="px-4 py-2">
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-blue-50"
            title="Editar ingrediente"
          >
            <Edit className="h-3 w-3 text-blue-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemoveIngredient(
              prepIndex,
              ingredientIndex
            )}
            className="h-7 w-7 rounded-full hover:bg-red-50"
            title="Remover ingrediente"
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(IngredientRow);
