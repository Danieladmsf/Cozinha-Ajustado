
export class RecipeCalculator {
  static DEBUG_MODE = false;

  static log(message, data = null) {
    if (RecipeCalculator.DEBUG_MODE) {
    }
  }

  static parseNumericValue(value) {
    if (value === null || value === undefined || typeof value === 'number' && isNaN(value)) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const cleanedValue = value.replace(/[^\d,.-]/g, '').replace(',', '.');
      const num = parseFloat(cleanedValue);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    }
    return 0;
  }

  static formatWeight(weightInKgValue, unit = 'kg') {
    const weightInKg = RecipeCalculator.parseNumericValue(weightInKgValue);
    if (unit === 'kg') {
      return `${weightInKg.toFixed(3).replace('.', ',')} kg`;
    } else if (unit === 'g') {
      return `${(weightInKg * 1000).toFixed(0)} g`;
    }
    return `${weightInKg.toFixed(3).replace('.', ',')} ${unit}`;
  }

  static formatPercent(value) {
    const numericValue = RecipeCalculator.parseNumericValue(value);
    return `${numericValue.toFixed(2).replace('.', ',')}`;
  }

  static calculateLossPercentage(initialWeight, finalWeight) {
    const initial = RecipeCalculator.parseNumericValue(initialWeight);
    const final = RecipeCalculator.parseNumericValue(finalWeight);
    if (initial === 0) {
      return 0;
    }
    return ((initial - final) / initial) * 100;
  }

  static calculateThawingLoss(item) {
    const frozenWeight = RecipeCalculator.parseNumericValue(item.weight_frozen);
    const thawedWeight = RecipeCalculator.parseNumericValue(item.weight_thawed);
    return RecipeCalculator.calculateLossPercentage(frozenWeight, thawedWeight);
  }

  static calculateCleaningLoss(item) {
    const initialWeight = RecipeCalculator.parseNumericValue(item.weight_thawed || item.weight_raw);
    const cleanWeight = RecipeCalculator.parseNumericValue(item.weight_clean);
    return RecipeCalculator.calculateLossPercentage(initialWeight, cleanWeight);
  }

  static calculateCookingLoss(item) {
    const preCookWeight = RecipeCalculator.parseNumericValue(item.weight_pre_cooking);
    const cookedWeight = RecipeCalculator.parseNumericValue(item.weight_cooked);
    return RecipeCalculator.calculateLossPercentage(preCookWeight, cookedWeight);
  }

  static calculateTotalYield(item) {
    const initialWeight = RecipeCalculator.parseNumericValue(
      item.weight_frozen || 
      item.weight_raw || 
      item.weight_thawed || 
      item.weight_clean || 
      item.weight_pre_cooking
    );

    const finalWeight = RecipeCalculator.parseNumericValue(
      item.weight_portioned || 
      item.weight_cooked || 
      item.weight_clean || 
      item.weight_thawed || 
      item.weight_raw || 
      item.weight_frozen
    );

    if (initialWeight === 0) return 100;
    return (finalWeight / initialWeight) * 100;
  }

  static calculateItemNetPricePerKg(item) {
    const currentPriceKg = RecipeCalculator.parseNumericValue(item.current_price);
    const yieldPercent = RecipeCalculator.calculateTotalYield(item);
    
    if (yieldPercent === 0 || yieldPercent === 100) return currentPriceKg;
    return (currentPriceKg * 100) / yieldPercent;
  }

  static getInitialWeight(item) {
    return RecipeCalculator.parseNumericValue(
      item.weight_frozen || 
      item.weight_raw || 
      item.weight_thawed || 
      item.weight_clean || 
      item.weight_pre_cooking
    );
  }

  static getFinalWeight(item) {
    return RecipeCalculator.parseNumericValue(
      item.weight_portioned || 
      item.weight_cooked || 
      item.weight_clean || 
      item.weight_thawed || 
      item.weight_raw || 
      item.weight_frozen
    );
  }

  static calculateItemYieldPercent(item) {
    const initialWeight = RecipeCalculator.getInitialWeight(item);
    if (initialWeight === 0) return 100;
    
    const finalWeight = RecipeCalculator.getFinalWeight(item);
    
    const yieldPercent = (finalWeight / initialWeight) * 100;
    return isNaN(yieldPercent) ? 100 : yieldPercent;
  }

  static calculatePortioningLoss(item) {
    const prePortion = RecipeCalculator.parseNumericValue(
      item.weight_cooked || 
      item.weight_clean || 
      item.weight_thawed || 
      item.weight_raw || 
      item.weight_frozen
    );
    const portionedWeight = RecipeCalculator.parseNumericValue(item.weight_portioned);
    return RecipeCalculator.calculateLossPercentage(prePortion, portionedWeight);
  }

  static getThawingLossStatus(loss, frozenWeight, thawedWeight) {
    const absLoss = Math.abs(loss);
    if (absLoss < 0.01) {
      // Se a perda é zero, verificar se foi devido a inputs zero
      return (frozenWeight > 0 && thawedWeight > 0) ? "success" : "neutral";
    }
    if (loss <= 5) return "success";
    if (loss <= 10) return "warning";
    return "destructive";
  }

  static getCleaningLossStatus(loss, initialWeightForCleaning, cleanWeight) {
    const absLoss = Math.abs(loss);
    if (absLoss < 0.01) {
      return (initialWeightForCleaning > 0 && cleanWeight > 0) ? "success" : "neutral";
    }
    if (loss <= 10) return "success";
    if (loss <= 15) return "warning";
    return "destructive";
  }

  static getCookingLossStatus(loss, preCookWeight, cookedWeight) {
    const absLoss = Math.abs(loss);
    if (absLoss < 0.01) {
      return (preCookWeight > 0 && cookedWeight > 0) ? "success" : "neutral";
    }
    if (loss <= 15) return "success";
    if (loss <= 25) return "warning";
    return "destructive";
  }

  static getPortioningLossStatus(loss, prePortionWeight, portionedWeight) {
    const absLoss = Math.abs(loss);
    if (absLoss < 0.01) {
      return (prePortionWeight > 0 && portionedWeight > 0) ? "success" : "neutral";
    }
    if (loss <= 5) return "success";
    if (loss <= 10) return "warning";
    return "destructive";
  }

  static getYieldStatus(yield_percent, initialWeight, finalWeight) {
    if (Math.abs(yield_percent - 100) < 0.01 && yield_percent !== 0) {
      // Se o rendimento é 100%, verificar se foi devido a inputs zero
      return (initialWeight > 0 && finalWeight > 0 && initialWeight === finalWeight) ? "success" : "neutral";
    }
    if (yield_percent === 0 && initialWeight > 0) return "destructive"; // Rendimento zero com input é ruim
    if (yield_percent === 0 && initialWeight === 0) return "neutral"; // Rendimento zero com input zero é neutro
    if (yield_percent >= 70) return "success";
    if (yield_percent >= 60) return "warning";
    return "destructive";
  }

  static calculateAndClassifyThawingLoss(item) {
    const frozenWeight = RecipeCalculator.parseNumericValue(item.weight_frozen);
    const thawedWeight = RecipeCalculator.parseNumericValue(item.weight_thawed);
    const loss = RecipeCalculator.calculateLossPercentage(frozenWeight, thawedWeight);
    return {
      value: loss,
      status: RecipeCalculator.getThawingLossStatus(loss, frozenWeight, thawedWeight)
    };
  }

  static calculateAndClassifyCleaningLoss(item) {
    const initialWeightForCleaning = RecipeCalculator.parseNumericValue(item.weight_thawed || item.weight_raw);
    const cleanWeight = RecipeCalculator.parseNumericValue(item.weight_clean);
    const loss = RecipeCalculator.calculateLossPercentage(initialWeightForCleaning, cleanWeight);
    return {
      value: loss,
      status: RecipeCalculator.getCleaningLossStatus(loss, initialWeightForCleaning, cleanWeight)
    };
  }

  static calculateAndClassifyCookingLoss(item) {
    const preCookWeight = RecipeCalculator.parseNumericValue(item.weight_pre_cooking || item.weight_clean || item.weight_thawed || item.weight_raw || item.weight_frozen);
    const cookedWeight = RecipeCalculator.parseNumericValue(item.weight_cooked);
    const loss = RecipeCalculator.calculateLossPercentage(preCookWeight, cookedWeight);
    return {
      value: loss,
      status: RecipeCalculator.getCookingLossStatus(loss, preCookWeight, cookedWeight)
    };
  }

  static calculateAndClassifyPortioningLoss(item) {
    const prePortionWeight = RecipeCalculator.parseNumericValue(
      item.weight_cooked || 
      item.weight_clean || 
      item.weight_thawed || 
      item.weight_raw || 
      item.weight_frozen
    );
    const portionedWeight = RecipeCalculator.parseNumericValue(item.weight_portioned);
    const loss = RecipeCalculator.calculateLossPercentage(prePortionWeight, portionedWeight);
    return {
      value: loss,
      status: RecipeCalculator.getPortioningLossStatus(loss, prePortionWeight, portionedWeight)
    };
  }

  static calculateAndClassifyYield(item) {
    const initialWeight = RecipeCalculator.getInitialWeight(item);
    const finalWeight = RecipeCalculator.calculateItemYieldPercent(item) / 100 * initialWeight; // Use the calculated yield percentage to find final weight if not directly available

    const yieldPercent = (initialWeight > 0) ? (finalWeight / initialWeight) * 100 : (finalWeight > 0 ? 0 : 100) ; // Evita NaN, se initialWeight é 0 e final também, rendimento é 100% (neutro). Se final > 0 e initial 0, rendimento é 0 (ruim)
    
    let status;
    if (initialWeight === 0 && finalWeight === 0) {
      status = "neutral"; // Nenhum input, nenhum output
    } else if (initialWeight > 0 && finalWeight === 0) {
      status = "destructive"; // Houve input, mas nenhum output
    } else if (Math.abs(yieldPercent - 100) < 0.01 && initialWeight > 0) {
        status = "success"; // Rendimento de 100% com inputs válidos
    } else if (yieldPercent >= 70) {
        status = "success";
    } else if (yieldPercent >= 60) {
        status = "warning";
    } else {
        status = "destructive";
    }
    
    return {
      value: (initialWeight === 0 && finalWeight === 0) ? 0 : yieldPercent, // Mostra 0 se não houve processamento
      status: status
    };
  }

  static formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return "R$ 0,00";
    }
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  }

  static calculateProcessLosses(item, processType) {
    switch (processType) {
      case 'defrosting': {
        const frozen = this.parseNumericValue(item.weight_frozen);
        const thawed = this.parseNumericValue(item.weight_thawed);
        return frozen > 0 ? ((frozen - thawed) / frozen) * 100 : 0;
      }
      case 'cleaning': {
        const initial = this.parseNumericValue(item.weight_thawed || item.weight_raw);
        const clean = this.parseNumericValue(item.weight_clean);
        return initial > 0 ? ((initial - clean) / initial) * 100 : 0;
      }
      case 'cooking': {
        const preCooked = this.parseNumericValue(item.weight_pre_cooking || item.weight_clean);
        const cooked = this.parseNumericValue(item.weight_cooked);
        return preCooked > 0 ? ((preCooked - cooked) / preCooked) * 100 : 0;
      }
      default:
        return 0;
    }
  }

  static calculateLiquidPrice(item) {
    const brutPrice = this.parseNumericValue(item.current_price);
    if (!brutPrice) return 0;

    const initialWeight = this.parseNumericValue(
      item.weight_frozen || 
      item.weight_raw || 
      item.quantity
    );

    const finalWeight = this.parseNumericValue(
      item.weight_cooked || 
      item.weight_clean || 
      item.weight_thawed || 
      item.weight_raw || 
      item.weight_frozen
    );

    if (!initialWeight || !finalWeight) return brutPrice;

    const yieldRate = finalWeight / initialWeight;
    return brutPrice / yieldRate;
  }

  static calculateIngredientTotals(ingredient) {
    const initialWeight = this.parseNumericValue(
      ingredient.weight_frozen || 
      ingredient.weight_raw || 
      ingredient.quantity
    );

    const finalWeight = this.parseNumericValue(
      ingredient.weight_cooked || 
      ingredient.weight_clean || 
      ingredient.weight_thawed || 
      ingredient.weight_raw || 
      ingredient.weight_frozen
    );

    const unitPrice = this.parseNumericValue(ingredient.current_price);
    const totalCost = initialWeight * unitPrice;

    return {
      initialWeight,
      finalWeight,
      totalCost,
      yieldRate: initialWeight > 0 ? (finalWeight / initialWeight) * 100 : 100
    };
  }

  static calculateRecipeMetrics(recipeData, preparationsData, debug = false) {
    RecipeCalculator.DEBUG_MODE = debug;
    this.log('========== INICIANDO CÁLCULO COM LÓGICA DE MONTAGEM ==========');

    const updatedRecipe = { ...recipeData };
    const updatedPreparations = JSON.parse(JSON.stringify(preparationsData));

    // Identificar etapa de MONTAGEM
    const montagemEtapa = updatedPreparations.find(prep => 
      prep.processes && prep.processes.includes('assembly')
    );

    if (!montagemEtapa) {
      this.log('Nenhuma etapa de montagem encontrada - usando lógica padrão');
      return this.calculateWithoutAssembly(updatedRecipe, updatedPreparations);
    }

    // PASSO 1: Calcular custos e pesos das etapas normais PRIMEIRO
    this.log('========== CALCULANDO ETAPAS NORMAIS PRIMEIRO ==========');
    
    let custoTotalConvertido = 0;
    let pesoTotalBrutoConvertido = 0;
    let pesoTotalRendimentoConvertido = 0;

    // Processar etapas SEM montagem primeiro
    const etapasSemMontagem = updatedPreparations.filter(prep => 
      !prep.processes || !prep.processes.includes('assembly')
    );

    etapasSemMontagem.forEach((prep, prepIndex) => {
      this.log(`\nCalculando etapa ${prepIndex + 1}: "${prep.title}"`);
      
      let pesoBrutoEtapa = 0;
      let pesoRendimentoEtapa = 0;
      let custoEtapa = 0;

      if (prep.ingredients && prep.ingredients.length > 0) {
        prep.ingredients.forEach((ing, ingIdx) => {
          this.log(`  Processando ingrediente ${ingIdx + 1}: ${ing.name}`);
          
          // CORREÇÃO: Garantir que quantity é número
          const quantityOriginal = this.parseNumericValue(ing.quantity || 0);
          const precoUnitario = this.parseNumericValue(ing.current_price || ing.unit_price || 0);
          
          this.log(`    Quantity: ${quantityOriginal}kg, Preço: R$ ${precoUnitario}`);

          // Calcular custo do ingrediente
          const custoIngrediente = quantityOriginal * precoUnitario;
          ing.total_cost = custoIngrediente;
          ing.unit_price = precoUnitario;

          this.log(`    Custo calculado: R$ ${custoIngrediente.toFixed(2)}`);

          // CORREÇÃO: Calcular peso final baseado nos processos
          let pesoFinal = quantityOriginal; // Peso inicial

          // Se tem processo de cocção, aplicar os pesos de cocção
          if (prep.processes && prep.processes.includes('cooking')) {
            // Usar weight_pre_cooking se definido, senão usar quantity
            const pesoPreCoccao = this.parseNumericValue(ing.weight_pre_cooking || quantityOriginal);
            const pesoCozido = this.parseNumericValue(ing.weight_cooked || pesoPreCoccao);
            
            // Se weight_pre_cooking não está definido, definir como quantity
            if (!ing.weight_pre_cooking) {
              ing.weight_pre_cooking = quantityOriginal;
            }
            
            // Se weight_cooked não está definido, usar um fator padrão baseado no tipo de ingrediente
            if (!ing.weight_cooked) {
              // Para arroz, aplicar fator de expansão (arroz dobra de volume quando cozido)
              if (ing.name && ing.name.toLowerCase().includes('arroz')) {
                ing.weight_cooked = quantityOriginal * 2; // Arroz dobra quando cozido
                this.log(`    Arroz detectado - aplicando fator de expansão 2x: ${ing.weight_cooked}kg`);
              } else {
                // Para outros ingredientes, usar 100% (sem perda)
                ing.weight_cooked = pesoPreCoccao;
              }
            }
            
            pesoFinal = this.parseNumericValue(ing.weight_cooked);
          }

          // Se tem outros processos, aplicar em sequência
          if (prep.processes && prep.processes.includes('portioning')) {
            const pesoPortioned = this.parseNumericValue(ing.weight_portioned || pesoFinal);
            if (!ing.weight_portioned) {
              ing.weight_portioned = pesoFinal; // Sem perda por default
            }
            pesoFinal = this.parseNumericValue(ing.weight_portioned);
          }

          this.log(`    Peso inicial: ${quantityOriginal}kg → Peso final: ${pesoFinal}kg`);

          pesoBrutoEtapa += quantityOriginal;
          pesoRendimentoEtapa += pesoFinal;
          custoEtapa += custoIngrediente;
        });
      }

      prep.total_raw_weight_prep = pesoBrutoEtapa;
      prep.total_yield_weight_prep = pesoRendimentoEtapa;
      prep.total_cost_prep = custoEtapa;

      this.log(`  Totais da etapa "${prep.title}":`, {
        peso_bruto: pesoBrutoEtapa,
        peso_rendimento: pesoRendimentoEtapa,
        custo: custoEtapa
      });

      // Somar aos totais da receita
      pesoTotalBrutoConvertido += pesoBrutoEtapa;
      pesoTotalRendimentoConvertido += pesoRendimentoEtapa;
      custoTotalConvertido += custoEtapa;
    });

    // PASSO 2: Processar etapa de montagem
    this.log('\n========== PROCESSANDO ETAPA DE MONTAGEM ==========');
    
    // Encontrar peso alvo da montagem
    let pesoAlvoMontagem = this.parseNumericValue(montagemEtapa.assembly_config?.total_weight);
    
    // Se não tem peso definido, calcular automaticamente baseado nos sub_components
    if (pesoAlvoMontagem === 0 && montagemEtapa.sub_components) {
      pesoAlvoMontagem = montagemEtapa.sub_components.reduce((total, sc) => {
        return total + this.parseNumericValue(sc.assembly_weight_kg || 0);
      }, 0);
      this.log(`Peso da montagem calculado automaticamente a partir dos subcomponentes: ${pesoAlvoMontagem}kg`);
    }

    // Se ainda é 0, usar o peso total de rendimento das etapas anteriores
    if (pesoAlvoMontagem === 0) {
      pesoAlvoMontagem = pesoTotalRendimentoConvertido;
      this.log(`Usando peso total das etapas anteriores como alvo para montagem: ${pesoAlvoMontagem}kg`);
    }

    // Processar montagem
    montagemEtapa.total_yield_weight_prep = pesoAlvoMontagem;
    montagemEtapa.total_cost_prep = 0; // Custo da montagem é a soma dos custos proporcionais dos subcomponentes

    if (montagemEtapa.sub_components && montagemEtapa.sub_components.length > 0) {
      let custoMontagem = 0;
      
      montagemEtapa.sub_components.forEach((sc, scIdx) => {
        const pesoMontagem = this.parseNumericValue(sc.assembly_weight_kg || sc.yield_weight || 0);
        sc.yield_weight = pesoMontagem;
        
        // Buscar etapa fonte
        const etapaFonte = updatedPreparations.find(p => p.id === sc.source_id);
        if (etapaFonte && etapaFonte.total_cost_prep > 0) {
          const proporcao = etapaFonte.total_yield_weight_prep > 0 ? 
            (pesoMontagem / etapaFonte.total_yield_weight_prep) : 0;
          const custoProporcional = etapaFonte.total_cost_prep * proporcao;
          sc.total_cost = custoProporcional;
          custoMontagem += custoProporcional;
          
          this.log(`Componente ${scIdx + 1} (${sc.name}):`, {
            peso: pesoMontagem,
            custo: custoProporcional,
            proporcao: proporcao
          });
        } else {
          sc.total_cost = 0;
          this.log(`Etapa fonte não encontrada ou sem custo para: ${sc.name}`);
        }
      });
      
      montagemEtapa.total_cost_prep = custoMontagem;
    }

    // USAR VALORES DA MONTAGEM para a receita final
    updatedRecipe.total_weight = pesoTotalBrutoConvertido;
    updatedRecipe.yield_weight = pesoAlvoMontagem; // Peso de rendimento final da receita é o peso da montagem
    updatedRecipe.total_cost = custoTotalConvertido; // Custo total da receita é a soma dos custos dos ingredientes de todas as etapas (já incluídos os subcomponentes)
    updatedRecipe.cost_per_kg_raw = pesoTotalBrutoConvertido > 0 ? custoTotalConvertido / pesoTotalBrutoConvertido : 0;
    updatedRecipe.cost_per_kg_yield = pesoAlvoMontagem > 0 ? custoTotalConvertido / pesoAlvoMontagem : 0;

    // Calcular cuba_cost
    const cubaWeightNumeric = this.parseNumericValue(updatedRecipe.cuba_weight);
    updatedRecipe.cuba_cost = cubaWeightNumeric * updatedRecipe.cost_per_kg_yield;

    this.log('\n========== CÁLCULO FINALIZADO ==========');
    this.log('Métricas finais da receita:', {
      total_weight: updatedRecipe.total_weight,
      yield_weight: updatedRecipe.yield_weight,
      total_cost: updatedRecipe.total_cost,
      cost_per_kg_raw: updatedRecipe.cost_per_kg_raw,
      cost_per_kg_yield: updatedRecipe.cost_per_kg_yield,
      cuba_cost: updatedRecipe.cuba_cost
    });

    return { updatedRecipe, updatedPreparations };
  }

  // Método auxiliar para casos sem montagem (lógica antiga)
  static calculateWithoutAssembly(updatedRecipe, updatedPreparations) {
    this.log('Calculando sem etapa de montagem (lógica padrão)');
    
    let recipeTotalRawWeight = 0;
    let recipeTotalYieldWeight = 0;
    let recipeTotalCost = 0;

    // Identify preparations that are consumed as sub-components
    const consumedPrepIds = new Set();
    updatedPreparations.forEach(outerPrep => {
      if (Array.isArray(outerPrep.sub_components)) {
        outerPrep.sub_components.forEach(sc => {
          if (sc.type === 'internal_process' && sc.source_id) {
            consumedPrepIds.add(sc.source_id);
          }
        });
      }
    });
    this.log('IDs das preparações consumidas como sub-componentes (sem montagem):', consumedPrepIds);

    updatedPreparations.forEach(prep => {
      let prepTotalRawWeight = 0;
      let prepTotalYieldWeight = 0;
      let prepTotalCost = 0;

      if (prep.ingredients && prep.ingredients.length > 0) {
        prep.ingredients.forEach(ing => {
          const initialWeight = this.parseNumericValue(
            ing.weight_frozen || ing.weight_raw || ing.quantity || 0
          );
          const finalWeight = this.getItemLastWeight(ing, prep.processes);
          const unitPrice = this.parseNumericValue(ing.current_price || ing.unit_price);
          const itemCost = initialWeight * unitPrice;

          ing.total_cost = itemCost;
          ing.yield_weight = finalWeight;

          prepTotalRawWeight += initialWeight;
          prepTotalYieldWeight += finalWeight;
          prepTotalCost += itemCost;
        });
      }

      // Important: The outline for calculateWithoutAssembly only sums ingredients for prep totals.
      // It does not include logic for sub_components influencing prepTotalRaw/Yield/Cost.
      // If sub_components were supposed to contribute to prep totals in non-assembly steps,
      // this outline simplifies that away. Sticking to the outline.

      prep.total_raw_weight_prep = prepTotalRawWeight;
      prep.total_yield_weight_prep = prepTotalYieldWeight;
      prep.total_cost_prep = prepTotalCost;

      // Only sum to recipe totals if the preparation is not consumed by another
      if (!consumedPrepIds.has(prep.id)) {
        recipeTotalRawWeight += prepTotalRawWeight;
        recipeTotalYieldWeight += prepTotalYieldWeight;
        recipeTotalCost += prepTotalCost;
      } else {
        this.log(`NÃO adicionando ao total da receita (pois é consumida) - Prep: ${prep.title} (ID: ${prep.id})`);
      }
    });

    updatedRecipe.total_weight = recipeTotalRawWeight;
    updatedRecipe.yield_weight = recipeTotalYieldWeight;
    updatedRecipe.total_cost = recipeTotalCost;
    updatedRecipe.cost_per_kg_raw = recipeTotalRawWeight > 0 ? recipeTotalCost / recipeTotalRawWeight : 0;
    updatedRecipe.cost_per_kg_yield = recipeTotalYieldWeight > 0 ? recipeTotalCost / recipeTotalYieldWeight : 0;

    // CRITICAL: Preserve original cuba_weight from user input, do not auto-set or overwrite.
    this.log('Mantendo cuba_weight original do usuário (em calculateWithoutAssembly):', updatedRecipe.cuba_weight);
    const cubaWeightNumeric = this.parseNumericValue(updatedRecipe.cuba_weight);
    updatedRecipe.cuba_cost = cubaWeightNumeric * updatedRecipe.cost_per_kg_yield;

    this.log('Métricas finais da receita (sem montagem):', {
      total_weight: updatedRecipe.total_weight,
      yield_weight: updatedRecipe.yield_weight,
      total_cost: updatedRecipe.total_cost,
      cost_per_kg_raw: updatedRecipe.cost_per_kg_raw,
      cost_per_kg_yield: updatedRecipe.cost_per_kg_yield,
      cuba_weight: updatedRecipe.cuba_weight,
      cuba_cost: updatedRecipe.cuba_cost
    });

    return { updatedRecipe, updatedPreparations };
  }

  static getItemLastWeight(item, processes = []) {
    let lastWeight = 0;

    if (processes.includes('portioning') && item.weight_portioned) {
        lastWeight = this.parseNumericValue(item.weight_portioned);
    } else if (item.weight_cooked) {
        lastWeight = this.parseNumericValue(item.weight_cooked);
    } else if (item.weight_clean) {
        lastWeight = this.parseNumericValue(item.weight_clean);
    } else if (item.weight_thawed) {
        lastWeight = this.parseNumericValue(item.weight_thawed);
    } else if (item.weight_raw) {
        lastWeight = this.parseNumericValue(item.weight_raw);
    } else if (item.weight_frozen) {
        lastWeight = this.parseNumericValue(item.weight_frozen);
    }

    return lastWeight;
  }
    
  static validateAndFixRecipeMetrics(recipe, preparations) {
    const issues = [];
    const correctedRecipe = { ...recipe };
    
    let totalBrutWeight = 0;
    let totalYieldWeight = 0;
    let totalCost = 0;
    
    preparations.forEach(prep => {
      if (!Array.isArray(prep.ingredients)) return;
      
      prep.ingredients.forEach(ing => {
        const initialWeight = this.parseNumericValue(
          ing.weight_frozen || ing.weight_raw || ing.quantity || 0
        );
        
        const unitPrice = this.parseNumericValue(ing.current_price || ing.unit_price);
        const itemCost = initialWeight * unitPrice;
        
        totalBrutWeight += initialWeight;
        totalCost += itemCost;
      });
    });
    
    let rendimentoReal = 0;
    const montagemPrep = preparations.find(p => 
      p.title?.toLowerCase().includes('montagem')
    );
    
    if (montagemPrep) {
      if (Array.isArray(montagemPrep.sub_components)) {
        montagemPrep.sub_components.forEach(sc => {
          rendimentoReal += this.parseNumericValue(sc.yield_weight);
        });
      }
    } else {
      const processedIds = new Set();
      preparations.forEach(prep => {
        if (Array.isArray(prep.ingredients)) {
          prep.ingredients.forEach(ing => {
            const finalWeight = this.parseNumericValue(
              ing.weight_cooked || 
              ing.weight_clean || 
              ing.weight_thawed || 
              ing.weight_raw
            );
            rendimentoReal += finalWeight;
          });
        }
        
        if (Array.isArray(prep.sub_components) && !processedIds.has(prep.id)) {
          prep.sub_components.forEach(sc => {
            if (!sc.source_id || !processedIds.has(sc.source_id)) {
              rendimentoReal += this.parseNumericValue(sc.yield_weight);
              if (sc.source_id) processedIds.add(sc.source_id);
            }
          });
          processedIds.add(prep.id);
        }
      });
    }
    
    if (rendimentoReal > totalBrutWeight * 1.05) {
      issues.push({
        type: 'error',
        message: `Rendimento impossível: ${rendimentoReal.toFixed(3)}kg a partir de ${totalBrutWeight.toFixed(3)}kg de ingredientes`,
        fix: `Ajustado rendimento para valor realista baseado nos ingredientes finais`
      });
      
      const largePrepIngredients = [];
      preparations.forEach(prep => {
        if (Array.isArray(prep.ingredients)) {
          prep.ingredients.forEach(ing => {
            const initialWeight = this.parseNumericValue(ing.quantity || ing.weight_raw || ing.weight_frozen);
            const finalWeight = this.parseNumericValue(ing.weight_cooked || ing.weight_clean);
            
            if (finalWeight > initialWeight * 1.1) {
              largePrepIngredients.push({
                name: ing.name,
                initialWeight,
                finalWeight
              });
            }
          });
        }
      });
      
      if (largePrepIngredients.length > 0) {
        issues.push({
          type: 'warning',
          message: `Ingredientes com ganho de peso suspeito: ${largePrepIngredients.map(i => i.name).join(', ')}`,
          details: largePrepIngredients
        });
      }
      totalYieldWeight = rendimentoReal;
    } else {
      totalYieldWeight = rendimentoReal;
    }
    
    const costPerKgRaw = totalBrutWeight > 0 ? totalCost / totalBrutWeight : 0;
    const costPerKgYield = totalYieldWeight > 0 ? totalCost / totalYieldWeight : 0;
    
    if (Math.abs(costPerKgRaw - recipe.cost_per_kg_raw) > costPerKgRaw * 0.1) {
      issues.push({
        type: 'error',
        message: `Custo por kg bruto incorreto: R$${recipe.cost_per_kg_raw.toFixed(2)} ≠ R$${costPerKgRaw.toFixed(2)}`,
        fix: `Corrigido para R$${costPerKgRaw.toFixed(2)}`
      });
    }
    
    if (Math.abs(costPerKgYield - recipe.cost_per_kg_yield) > costPerKgYield * 0.1) {
      issues.push({
        type: 'error',
        message: `Custo por kg rendimento incorreto: R$${recipe.cost_per_kg_yield.toFixed(2)} ≠ R$${costPerKgYield.toFixed(2)}`,
        fix: `Corrigido para R$${costPerKgYield.toFixed(2)}`
      });
    }
    
    correctedRecipe.total_weight = totalBrutWeight;
    correctedRecipe.yield_weight = totalYieldWeight;
    correctedRecipe.total_cost = totalCost;
    correctedRecipe.cost_per_kg_raw = costPerKgRaw;
    correctedRecipe.cost_per_kg_yield = costPerKgYield;
    
    return {
      recipe: correctedRecipe,
      issues
    };
  }

  static calculatePreciseMetrics(recipe, preparations) {
    let totalBrutWeight = 0;
    let totalYieldWeight = 0;
    let totalCost = 0;
    const ingredientDetails = [];

    preparations.forEach(prep => {
      if (!Array.isArray(prep.ingredients)) return;
      
      prep.ingredients.forEach(ing => {
        const initialWeight = this.parseNumericValue(
          ing.weight_frozen || 
          ing.weight_raw || 
          ing.quantity || 
          0
        );
        
        const unitPrice = this.parseNumericValue(ing.unit_price || ing.current_price);
        const ingredientCost = initialWeight * unitPrice;
        
        let finalWeight = 0;
        if (ing.weight_cooked) {
          finalWeight = this.parseNumericValue(ing.weight_cooked);
        } else if (ing.weight_clean) {
          finalWeight = this.parseNumericValue(ing.weight_clean);
        } else if (ing.weight_thawed) {
          finalWeight = this.parseNumericValue(ing.weight_thawed);
        } else {
          finalWeight = initialWeight;
        }
        
        const yieldRate = initialWeight > 0 ? finalWeight / initialWeight * 100 : 100;
        
        ingredientDetails.push({
          name: ing.name,
          initialWeight,
          finalWeight,
          unitPrice,
          cost: ingredientCost,
          yieldRate
        });
        
        totalBrutWeight += initialWeight;
        totalYieldWeight += finalWeight;
        totalCost += ingredientCost;
      });
    });
    
    const costPerKgRaw = totalBrutWeight > 0 ? totalCost / totalBrutWeight : 0;
    const costPerKgYield = totalYieldWeight > 0 ? totalCost / totalYieldWeight : 0;
    
    const cubaWeight = this.parseNumericValue(recipe.cuba_weight || 3.5);
    const cubaCost = cubaWeight * costPerKgYield;
    
    return {
      totalBrutWeight,
      totalYieldWeight,
      totalCost,
      costPerKgRaw,
      costPerKgYield,
      cubaCost,
      cubaWeight,
      ingredientDetails
    };
  }

  static validateAndFixValues(recipe, preparations) {
    const metrics = this.calculatePreciseMetrics(recipe, preparations);
    
    return {
      ...recipe,
      total_weight: metrics.totalBrutWeight,
      yield_weight: metrics.totalYieldWeight,
      total_cost: metrics.totalCost,
      cost_per_kg_raw: metrics.costPerKgRaw,
      cost_per_kg_yield: metrics.costPerKgYield,
      cuba_cost: metrics.cubaCost
    };
  }
}
