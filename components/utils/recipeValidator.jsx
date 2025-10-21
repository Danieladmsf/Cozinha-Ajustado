/**
 * Classe para validação e correção de receitas
 * Identifica e previne inconsistências lógicas nos cálculos
 */
export class RecipeValidator {

  /**
   * Verifica e corrige as inconsistências de uma receita
   * @param {Object} recipe - A receita completa
   * @param {Array} preparations - As preparações/etapas da receita
   * @returns {Object} Receita corrigida e relatório de inconsistências
   */
  static validateAndCorrect(recipe, preparations) {
    const issues = [];
    let correctedRecipe = { ...recipe };
    let correctedPreparations = JSON.parse(JSON.stringify(preparations)); // deep copy

    // CRÍTICO: Verificar e corrigir pesos brutos dos ingredientes
    correctedPreparations = this.correctIngredientInitialWeights(correctedPreparations, issues);

    // Calcular totais com base nos valores corrigidos
    const { 
      brutWeight, 
      yieldWeight, 
      totalCost,
      ingredientIssues 
    } = this.validateIngredientsAndCalculateTotals(correctedPreparations);
    
    issues.push(...ingredientIssues);

    // CRÍTICO: Verificar se o peso bruto total é pelo menos igual ao maior ingrediente
    const largestIngredient = this.findLargestIngredient(correctedPreparations);
    if (largestIngredient && largestIngredient.weight > 0 && brutWeight < largestIngredient.weight) {
      issues.push({
        severity: 'error',
        message: `O peso total bruto (${brutWeight.toFixed(3)} kg) é menor que o peso do ingrediente ${largestIngredient.name} (${largestIngredient.weight.toFixed(3)} kg)`,
        correction: `Peso total bruto corrigido para incluir todos os ingredientes: ${largestIngredient.weight.toFixed(3)} kg`
      });
      correctedRecipe.total_weight = largestIngredient.weight;
    } else {
      correctedRecipe.total_weight = brutWeight;
    }

    // CRÍTICO: Verificar se o rendimento faz sentido em relação às etapas
    const stageYields = this.sumStageYields(correctedPreparations);
    if (Math.abs(stageYields - yieldWeight) > yieldWeight * 0.1) {
      issues.push({
        severity: 'error',
        message: `Rendimento total (${yieldWeight.toFixed(3)} kg) é inconsistente com a soma das etapas (${stageYields.toFixed(3)} kg)`,
        correction: `Rendimento ajustado para refletir a soma das etapas: ${stageYields.toFixed(3)} kg`
      });
      correctedRecipe.yield_weight = stageYields;
    } else {
      correctedRecipe.yield_weight = yieldWeight;
    }

    // CRÍTICO: Verificar se o rendimento é maior que o bruto sem justificativa
    if (correctedRecipe.yield_weight > correctedRecipe.total_weight * 1.1) {
      issues.push({
        severity: 'error',
        message: `O rendimento (${correctedRecipe.yield_weight.toFixed(3)} kg) é significativamente maior que o peso bruto (${correctedRecipe.total_weight.toFixed(3)} kg) sem justificativa clara`,
        suggestion: "Verifique se todos os ingredientes adicionados estão com seus pesos brutos corretos"
      });
    }

    // Recalcular custo total
    correctedRecipe.total_cost = totalCost;

    // Calcular custos por kg com os valores corrigidos
    if (correctedRecipe.total_weight > 0) {
      correctedRecipe.cost_per_kg_raw = totalCost / correctedRecipe.total_weight;
    } else {
      issues.push({
        severity: 'error',
        message: 'Peso bruto total é zero ou inválido. Impossível calcular custo por kg (bruto).',
        correction: 'Custo por kg (bruto) definido como zero.'
      });
      correctedRecipe.cost_per_kg_raw = 0;
    }

    if (correctedRecipe.yield_weight > 0) {
      correctedRecipe.cost_per_kg_yield = totalCost / correctedRecipe.yield_weight;
    } else {
      issues.push({
        severity: 'error',
        message: 'Rendimento total é zero ou inválido. Impossível calcular custo por kg (rendimento).',
        correction: 'Custo por kg (rendimento) definido como zero.'
      });
      correctedRecipe.cost_per_kg_yield = 0;
    }

    // Validar as etapas e sua agregação
    correctedPreparations = this.validatePreparations(correctedPreparations, correctedRecipe, issues);

    // Validar os processos da maminha
    correctedPreparations = this.validateMaminhaProcesses(correctedPreparations, issues);

    return {
      recipe: correctedRecipe,
      preparations: correctedPreparations,
      issues
    };
  }

  /**
   * Corrige os pesos iniciais dos ingredientes que estão faltando ou incorretos
   */
  static correctIngredientInitialWeights(preparations, issues) {
    const correctedPreparations = [...preparations];

    correctedPreparations.forEach(prep => {
      if (!Array.isArray(prep.ingredients)) return;

      prep.ingredients.forEach(ing => {
        // Verificar se é a maminha (ou outro ingrediente principal com peso)
        const isMainMeat = ing.name?.toLowerCase().includes('maminha') || 
                         ing.name?.toLowerCase().includes('bovina');

        // Verificar se tem peso inicial
        const initialWeight = this.getInitialWeight(ing);
        
        if (initialWeight <= 0) {
          // Se não tem peso inicial, vamos inferir baseado no peso final e no rendimento
          const finalWeight = this.getFinalWeight(ing);
          
          if (finalWeight > 0) {
            // Estimar peso inicial baseado no rendimento típico para o tipo de ingrediente
            let estimatedInitialWeight = 0;
            
            if (isMainMeat) {
              // Para carnes, assume rendimento aproximado de 70%
              estimatedInitialWeight = finalWeight / 0.7;
            } else if (ing.name?.toLowerCase().includes('sal') || 
                      ing.name?.toLowerCase().includes('tempero') ||
                      ing.name?.toLowerCase().includes('óleo') ||
                      ing.name?.toLowerCase().includes('oleo')) {
              // Para temperos e óleos, assume rendimento de 100%
              estimatedInitialWeight = finalWeight;
            } else {
              // Para outros ingredientes, um rendimento médio de 85%
              estimatedInitialWeight = finalWeight / 0.85;
            }
            
            // Atribuir o peso inicial estimado
            if (ing.weight_frozen !== undefined) {
              ing.weight_frozen = estimatedInitialWeight;
            } else if (ing.weight_raw !== undefined) {
              ing.weight_raw = estimatedInitialWeight;
            } else if (ing.quantity !== undefined) {
              ing.quantity = estimatedInitialWeight;
            } else {
              // Se não tem nenhum campo para peso inicial, criar
              ing.quantity = estimatedInitialWeight;
            }
            
            issues.push({
              severity: 'warning',
              message: `Peso inicial de "${ing.name}" estimado como ${estimatedInitialWeight.toFixed(3)} kg baseado no peso final ${finalWeight.toFixed(3)} kg`,
              suggestion: "Verifique e ajuste este valor conforme necessário"
            });
          } else {
            // Se não tem peso final também, isso é um erro grave
            issues.push({
              severity: 'error',
              message: `Ingrediente "${ing.name}" não tem peso inicial nem final definidos`,
              suggestion: "Defina o peso deste ingrediente para obter cálculos corretos"
            });
          }
        }
      });
    });

    return correctedPreparations;
  }

  /**
   * Valida os processos específicos da maminha para garantir consistência
   */
  static validateMaminhaProcesses(preparations, issues) {
    const correctedPreparations = [...preparations];

    correctedPreparations.forEach(prep => {
      if (!Array.isArray(prep.ingredients)) return;

      prep.ingredients.forEach(ing => {
        // Verificar se é a maminha
        if (ing.name?.toLowerCase().includes('maminha')) {
          // Verificar sequência de pesos
          const frozen = this.parseNumber(ing.weight_frozen);
          const thawed = this.parseNumber(ing.weight_thawed);
          const clean = this.parseNumber(ing.weight_clean);
          const preCooking = this.parseNumber(ing.weight_pre_cooking);
          const cooked = this.parseNumber(ing.weight_cooked);
          
          // Verificar ganho de peso do descongelamento para pré-cocção
          if (thawed > 0 && preCooking > 0 && preCooking > thawed * 1.05) {
            issues.push({
              severity: 'error',
              message: `Ganho de peso inexplicável da maminha após descongelamento: ${thawed.toFixed(3)}kg → ${preCooking.toFixed(3)}kg (+${((preCooking/thawed)-1)*100}%)`,
              suggestion: "Verifique se há ingredientes adicionados nesta etapa que não estão sendo contabilizados"
            });
          }
          
          // Verificar perda na cocção vs preço líquido
          if (preCooking > 0 && cooked > 0) {
            const cookingLoss = ((preCooking - cooked) / preCooking) * 100;
            const totalYield = (cooked / frozen) * 100;
            const expectedLiquidPrice = this.parseNumber(ing.current_price) * (100 / totalYield);
            const actualLiquidPrice = this.parseNumber(ing.liquid_price || ing.precokg_liquido);
            
            if (Math.abs(expectedLiquidPrice - actualLiquidPrice) > expectedLiquidPrice * 0.1) {
              issues.push({
                severity: 'error',
                message: `Preço líquido da maminha inconsistente: Com rendimento total de ${totalYield.toFixed(1)}%, o preço líquido deveria ser ${expectedLiquidPrice.toFixed(2)}/kg, não ${actualLiquidPrice.toFixed(2)}/kg`,
                suggestion: "Ajuste o rendimento ou o preço líquido para que sejam consistentes"
              });
            }
          }
        }
      });
    });

    return correctedPreparations;
  }

  /**
   * Encontra o ingrediente com maior peso na receita
   */
  static findLargestIngredient(preparations) {
    let largestIngredient = null;
    let largestWeight = 0;

    preparations.forEach(prep => {
      if (!Array.isArray(prep.ingredients)) return;

      prep.ingredients.forEach(ing => {
        const weight = this.getInitialWeight(ing);
        if (weight > largestWeight) {
          largestWeight = weight;
          largestIngredient = {
            name: ing.name || "Ingrediente",
            weight: weight
          };
        }
      });
    });

    return largestIngredient;
  }

  /**
   * Calcula a soma dos rendimentos das etapas
   */
  static sumStageYields(preparations) {
    let totalYield = 0;

    // Identificar etapas finais (aquelas que são usadas na montagem)
    const finalStages = [];
    let hasAssemblyStage = false;

    // Primeiro, procurar uma etapa de montagem
    preparations.forEach(prep => {
      if (prep.title?.toLowerCase().includes('montagem')) {
        hasAssemblyStage = true;
      }
    });

    if (hasAssemblyStage) {
      // Se tem montagem, precisamos encontrar quais etapas são usadas nela
      const assemblyStage = preparations.find(p => p.title?.toLowerCase().includes('montagem'));
      
      if (assemblyStage && Array.isArray(assemblyStage.sub_components)) {
        assemblyStage.sub_components.forEach(sc => {
          finalStages.push(sc.source_id);
        });
      }
    } else {
      // Se não tem montagem, considerar todas as etapas como finais
      preparations.forEach(prep => {
        if (prep.id) {
          finalStages.push(prep.id);
        }
      });
    }

    // Somar os rendimentos das etapas finais
    preparations.forEach(prep => {
      if (hasAssemblyStage) {
        // Se tem montagem, só considerar as etapas que são usadas nela
        if (!finalStages.includes(prep.id)) return;
      }

      // Verificar se tem rendimento declarado
      if (prep.total_yield_weight > 0) {
        totalYield += this.parseNumber(prep.total_yield_weight);
      } else if (prep.total_yield_weight_prep > 0) {
        totalYield += this.parseNumber(prep.total_yield_weight_prep);
      } else {
        // Calcular o rendimento com base nos ingredientes
        let stageYield = 0;
        
        if (Array.isArray(prep.ingredients)) {
          prep.ingredients.forEach(ing => {
            stageYield += this.getFinalWeight(ing);
          });
        }
        
        if (Array.isArray(prep.sub_components)) {
          prep.sub_components.forEach(sc => {
            stageYield += this.parseNumber(sc.yield_weight);
          });
        }
        
        totalYield += stageYield;
      }
    });

    return totalYield;
  }

  /**
   * Valida os ingredientes e calcula totais consistentes
   * @param {Array} preparations - As preparações da receita
   * @returns {Object} Totais e problemas encontrados
   */
  static validateIngredientsAndCalculateTotals(preparations) {
    let brutWeight = 0;
    let yieldWeight = 0;
    let totalCost = 0;
    const ingredientIssues = [];

    preparations.forEach(prep => {
      if (!Array.isArray(prep.ingredients)) return;

      prep.ingredients.forEach(ing => {
        // Validar componentes básicos
        if (!ing.name) {
          ingredientIssues.push({
            severity: 'warning',
            message: `Ingrediente sem nome na etapa "${prep.title || 'desconhecida'}"`,
            correction: 'Nome definido como "Ingrediente desconhecido"'
          });
        }

        // Validar pesos
        const initialWeight = this.getInitialWeight(ing);
        if (initialWeight <= 0) {
          ingredientIssues.push({
            severity: 'warning',
            message: `Ingrediente "${ing.name || 'desconhecido'}" sem peso inicial válido`,
            correction: 'Peso inicial será ignorado no cálculo do peso bruto total'
          });
        } else {
          brutWeight += initialWeight;
        }

        // Validar preço unitário
        const unitPrice = this.parseNumber(ing.unit_price || ing.current_price);
        if (unitPrice <= 0) {
          ingredientIssues.push({
            severity: 'warning',
            message: `Ingrediente "${ing.name || 'desconhecido'}" sem preço unitário válido`,
            correction: 'Custo será ignorado no cálculo do custo total'
          });
        } else {
          totalCost += initialWeight * unitPrice;
        }

        // Validar sequência de pesos e perdas/ganhos
        const processedWeights = this.validateProcessWeights(ing, prep);
        
        // Adicionar ao rendimento total
        const finalWeight = this.getFinalWeight(ing);
        
        // Verificar se o rendimento é realista
        if (finalWeight > initialWeight * 1.1 && initialWeight > 0) {
          ingredientIssues.push({
            severity: 'warning',
            message: `Ganho de peso suspeito para "${ing.name || 'desconhecido'}" (${initialWeight.toFixed(3)}kg → ${finalWeight.toFixed(3)}kg)`,
            correction: 'O rendimento deve ser justificado ou corrigido'
          });
        }
        
        if (finalWeight > 0) {
          yieldWeight += finalWeight;
        }
      });
    });

    return {
      brutWeight,
      yieldWeight,
      totalCost,
      ingredientIssues
    };
  }

  /**
   * Valida a sequência de pesos nos processos
   * @param {Object} ingredient - O ingrediente a ser validado
   * @param {Object} preparation - A preparação que contém o ingrediente
   * @returns {Array} Problemas encontrados
   */
  static validateProcessWeights(ingredient, preparation) {
    const issues = [];
    const processes = this.getProcessesFromTitle(preparation.title);
    
    // Verificar se há peso congelado e resfriado (descongelamento)
    if (processes.includes('defrosting')) {
      const frozen = this.parseNumber(ingredient.weight_frozen);
      const thawed = this.parseNumber(ingredient.weight_thawed);
      
      if (frozen > 0 && thawed > 0) {
        // Verificar perda/ganho no descongelamento
        const change = ((thawed - frozen) / frozen) * 100;
        
        // Descongelamento normalmente resulta em perda
        if (change > 0) {
          issues.push({
            severity: 'warning',
            message: `Ganho de peso incomum no descongelamento para "${ingredient.name}" (${change.toFixed(1)}%)`,
            ingredient: ingredient.name,
            process: 'defrosting'
          });
        } else if (change < -15) {
          issues.push({
            severity: 'warning',
            message: `Perda excessiva no descongelamento para "${ingredient.name}" (${Math.abs(change).toFixed(1)}%)`,
            ingredient: ingredient.name,
            process: 'defrosting'
          });
        }
      }
    }
    
    // Verificar limpeza
    if (processes.includes('cleaning')) {
      const before = this.parseNumber(ingredient.weight_thawed || ingredient.weight_raw);
      const after = this.parseNumber(ingredient.weight_clean);
      
      if (before > 0 && after > 0) {
        const change = ((after - before) / before) * 100;
        
        // Limpeza normalmente resulta em perda
        if (change > 0) {
          issues.push({
            severity: 'warning',
            message: `Ganho de peso incomum na limpeza para "${ingredient.name}" (${change.toFixed(1)}%)`,
            ingredient: ingredient.name,
            process: 'cleaning'
          });
        } else if (change < -40) {
          issues.push({
            severity: 'warning',
            message: `Perda excessiva na limpeza para "${ingredient.name}" (${Math.abs(change).toFixed(1)}%)`,
            ingredient: ingredient.name,
            process: 'cleaning'
          });
        }
      }
    }
    
    // Verificar cocção
    if (processes.includes('cooking')) {
      const before = this.parseNumber(ingredient.weight_pre_cooking || ingredient.weight_clean);
      const after = this.parseNumber(ingredient.weight_cooked);
      
      if (before > 0 && after > 0) {
        const change = ((after - before) / before) * 100;
        
        // Cocção normalmente resulta em perda
        if (change > 0) {
          issues.push({
            severity: 'warning',
            message: `Ganho de peso incomum na cocção para "${ingredient.name}" (${change.toFixed(1)}%)`,
            ingredient: ingredient.name,
            process: 'cooking'
          });
        } else if (change < -75) {
          issues.push({
            severity: 'warning',
            message: `Perda excessiva na cocção para "${ingredient.name}" (${Math.abs(change).toFixed(1)}%)`,
            ingredient: ingredient.name,
            process: 'cooking'
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * Valida a coerência entre as etapas e sua agregação no total
   * @param {Array} preparations - Etapas da receita
   * @param {Object} recipe - A receita completa
   * @param {Array} issues - Lista de problemas para adicionar novos problemas
   * @returns {Array} Etapas corrigidas
   */
  static validatePreparations(preparations, recipe, issues) {
    let sumYield = 0;
    
    // Calcular a soma dos rendimentos das etapas
    preparations.forEach(prep => {
      // Considerar sub-componentes
      if (Array.isArray(prep.sub_components)) {
        prep.sub_components.forEach(sc => {
          const weight = this.parseNumber(sc.yield_weight);
          sumYield += weight;
        });
      }
      
      // Considerar o peso da etapa se não for calculado pelos ingredientes
      if (prep.yield_weight && !prep.sub_components?.length) {
        sumYield += this.parseNumber(prep.yield_weight);
      }
    });
    
    // Verificar se a soma dos rendimentos das etapas é próxima do rendimento total da receita
    if (Math.abs(sumYield - recipe.yield_weight) > recipe.yield_weight * 0.1) {
      issues.push({
        severity: 'error',
        message: `A soma dos rendimentos das etapas (${sumYield.toFixed(3)} kg) é significativamente diferente do rendimento total da receita (${recipe.yield_weight.toFixed(3)} kg)`,
        correction: 'Os rendimentos das etapas podem precisar ser revisados.'
      });
    }
    
    return preparations;
  }

  /**
   * Extrai os processos do título de uma etapa
   * @param {string} title - Título da etapa
   * @returns {Array} Lista de processos
   */
  static getProcessesFromTitle(title) {
    const processes = [];
    const lowTitle = (title || '').toLowerCase();
    
    if (lowTitle.includes('descongelamento')) processes.push('defrosting');
    if (lowTitle.includes('limpeza')) processes.push('cleaning');
    if (lowTitle.includes('cocção')) processes.push('cooking');
    if (lowTitle.includes('porcionamento')) processes.push('portioning');
    if (lowTitle.includes('montagem')) processes.push('assembly');
    
    return processes;
  }

  /**
   * Determina o peso inicial de um ingrediente
   * @param {Object} ingredient - O ingrediente
   * @returns {number} Peso inicial
   */
  static getInitialWeight(ingredient) {
    // Tentar obter o peso inicial na ordem: congelado -> bruto -> quantidade
    return this.parseNumber(
      ingredient.weight_frozen || 
      ingredient.weight_raw || 
      ingredient.quantity
    );
  }

  /**
   * Determina o peso final de um ingrediente
   * @param {Object} ingredient - O ingrediente
   * @returns {number} Peso final
   */
  static getFinalWeight(ingredient) {
    // Tentar obter o peso final na ordem: cocção -> limpeza -> descongelamento -> bruto
    return this.parseNumber(
      ingredient.weight_cooked || 
      ingredient.weight_clean || 
      ingredient.weight_thawed || 
      ingredient.weight_frozen || 
      ingredient.quantity
    );
  }

  /**
   * Converte string para número de forma segura
   * @param {any} value - Valor a ser convertido
   * @returns {number} Valor numérico ou zero
   */
  static parseNumber(value) {
    if (value === null || value === undefined) return 0;
    
    const num = parseFloat(String(value).replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }
}