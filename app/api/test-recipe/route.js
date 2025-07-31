/**
 * API ENDPOINT FOR TESTING RECIPE COLLECTION
 * Runs automated tests on the Recipe collection
 */

import { Recipe } from '../entities.js';

export async function GET(request) {
  console.log('🚀 [API TESTER] Iniciando testes da coleção Recipe...');
  
  const testResults = {
    timestamp: new Date().toISOString(),
    quickTest: null,
    comprehensiveTests: [],
    nameComplementTests: [],
    summary: {},
    errors: []
  };

  try {
    // Quick test function
    async function quickTest() {
      console.log('⚡ [API TESTER] Teste rápido do name_complement...');
      
      const testData = {
        name: 'Teste Quick API',
        name_complement: 'ao molho de mostarda',
        category: 'Carnes',
        prep_time: 5,
        active: true
      };

      try {
        console.log('📝 [API TESTER] Salvando:', testData);
        const saved = await Recipe.create(testData);
        console.log('💾 [API TESTER] Salvo com ID:', saved.id);
        
        console.log('📥 [API TESTER] Recuperando...');
        const retrieved = await Recipe.getById(saved.id);
        
        const result = {
          testData,
          saved,
          retrieved,
          nameComplementMatch: testData.name_complement === retrieved.name_complement,
          success: true
        };
        
        console.log('🔍 [API TESTER] Comparação:');
        console.log('   name_complement enviado:', testData.name_complement);
        console.log('   name_complement recuperado:', retrieved.name_complement);
        console.log('   Match:', result.nameComplementMatch ? '✅' : '❌');
        
        return result;
        
      } catch (error) {
        console.error('❌ [API TESTER] Erro:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    // Comprehensive test suite
    const testCases = [
      {
        name: 'Teste Básico - Campos Obrigatórios',
        data: {
          name: 'Receita Teste Básico API',
          name_complement: 'complemento teste básico',
          category: 'Carnes',
          prep_time: 15
        }
      },
      {
        name: 'Teste Completo - Todos os Campos',
        data: {
          name: 'Receita Teste Completo API',
          name_complement: 'ao molho especial de teste',
          category: 'Carnes',
          prep_time: 30,
          cuba_weight: 3.5,
          total_weight: 5000,
          yield_weight: 4500,
          total_cost: 45.50,
          cost_per_kg_raw: 9.10,
          cost_per_kg_yield: 10.11,
          active: true,
          instructions: 'Instruções de teste completas'
        }
      },
      {
        name: 'Teste Caracteres Especiais',
        data: {
          name: 'Receita com Açúcar & Café API',
          name_complement: 'com açúcar, café & chocolate (especial)',
          category: 'Carnes',
          prep_time: 45
        }
      },
      {
        name: 'Teste name_complement - ao molho de mostarda',
        data: {
          name: 'Receita Molho Mostarda API',
          name_complement: 'ao molho de mostarda',
          category: 'Carnes',
          prep_time: 25
        }
      },
      {
        name: 'Teste Strings Longas',
        data: {
          name: 'Receita com Nome Muito Longo para Testar Limite API',
          name_complement: 'complemento extremamente longo para verificar se o banco de dados consegue armazenar corretamente strings com muitos caracteres e se há algum tipo de limitação',
          category: 'Carnes',
          prep_time: 60
        }
      }
    ];

    // Execute quick test first
    console.log('\n📌 [API TESTER] === TESTE RÁPIDO ===');
    testResults.quickTest = await quickTest();
    
    // Sleep function
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Execute comprehensive tests
    console.log('\n📌 [API TESTER] === TESTES COMPLETOS ===');
    
    for (const testCase of testCases) {
      console.log(`\n🔬 [API TESTER] Executando: ${testCase.name}`);
      console.log('📝 [API TESTER] Dados de entrada:', testCase.data);

      const testResult = {
        name: testCase.name,
        input: testCase.data,
        success: false,
        savedData: null,
        retrievedData: null,
        errors: [],
        fieldResults: {}
      };

      try {
        // Step 1: Save data
        console.log('💾 [API TESTER] Salvando no banco...');
        const savedRecipe = await Recipe.create(testCase.data);
        testResult.savedData = savedRecipe;
        testResult.success = true;

        console.log('✅ [API TESTER] Salvo com ID:', savedRecipe.id);

        // Step 2: Retrieve data for verification
        console.log('📥 [API TESTER] Recuperando do banco...');
        const retrievedRecipe = await Recipe.getById(savedRecipe.id);
        testResult.retrievedData = retrievedRecipe;

        if (!retrievedRecipe) {
          testResult.errors.push('Receita não encontrada após criação');
          testResult.success = false;
        } else {
          // Step 3: Verify each field
          console.log('🔍 [API TESTER] Verificando campos...');
          
          const fieldsToCheck = [
            'name', 'name_complement', 'category', 'prep_time',
            'cuba_weight', 'total_weight', 'yield_weight',
            'total_cost', 'cost_per_kg_raw', 'cost_per_kg_yield',
            'active', 'instructions'
          ];

          fieldsToCheck.forEach(field => {
            const inputValue = testCase.data[field];
            const retrievedValue = retrievedRecipe[field];
            
            if (inputValue !== undefined) {
              let matches;
              
              // For numeric fields, convert to number for comparison
              if (['prep_time', 'cuba_weight', 'total_weight', 'yield_weight', 
                   'total_cost', 'cost_per_kg_raw', 'cost_per_kg_yield'].includes(field)) {
                matches = Number(inputValue) === Number(retrievedValue);
              } else {
                matches = inputValue === retrievedValue;
              }
              
              testResult.fieldResults[field] = {
                input: inputValue,
                retrieved: retrievedValue,
                matches: matches,
                type: typeof inputValue
              };

              if (matches) {
                console.log(`   ✅ ${field}: ${JSON.stringify(inputValue)} = ${JSON.stringify(retrievedValue)}`);
              } else {
                console.log(`   ❌ ${field}: ${JSON.stringify(inputValue)} ≠ ${JSON.stringify(retrievedValue)}`);
                testResult.errors.push(`Campo ${field} não corresponde`);
              }
            }
          });

          // Step 4: Test update
          console.log('🔄 [API TESTER] Testando atualização...');
          try {
            const updateData = {
              name_complement: retrievedRecipe.name_complement + ' - ATUALIZADO',
              prep_time: (retrievedRecipe.prep_time || 0) + 5
            };

            console.log('🔄 [API TESTER] Dados para atualização:', updateData);

            await Recipe.update(retrievedRecipe.id, updateData);

            // Verify if update worked
            const updatedRecipe = await Recipe.getById(retrievedRecipe.id);
            
            if (updatedRecipe.name_complement === updateData.name_complement) {
              console.log('✅ [API TESTER] Atualização bem-sucedida');
              testResult.updateSuccess = true;
            } else {
              console.log('❌ [API TESTER] Atualização falhou');
              testResult.updateSuccess = false;
              testResult.errors.push('Atualização não persistiu');
            }

          } catch (error) {
            console.error('❌ [API TESTER] Erro na atualização:', error);
            testResult.updateSuccess = false;
            testResult.errors.push('Erro durante atualização: ' + error.message);
          }
        }

      } catch (error) {
        console.error('❌ [API TESTER] Erro no teste:', error);
        testResult.success = false;
        testResult.errors.push(error.message);
      }

      testResults.comprehensiveTests.push(testResult);
      
      // Print test result
      const status = testResult.success ? '✅ PASSOU' : '❌ FALHOU';
      console.log(`\n📊 [API TESTER] Resultado: ${status}`);
      
      if (testResult.errors.length > 0) {
        console.log('🚨 [API TESTER] Erros encontrados:');
        testResult.errors.forEach(error => console.log(`   - ${error}`));
      }

      await sleep(1000); // Wait 1 second between tests
    }

    // Specific name_complement tests
    console.log('\n📌 [API TESTER] === TESTES ESPECÍFICOS name_complement ===');
    
    const nameComplementTestValues = [
      'ao molho de mostarda',
      'com açúcar e canela',
      'versão especial da casa',
      'complemento com números 123',
      'àáãâéêíóôõúç - caracteres especiais',
      'complemento muito longo para testar limites'
    ];

    for (const complement of nameComplementTestValues) {
      console.log(`\n🧪 [API TESTER] Testando name_complement: "${complement}"`);
      
      const testData = {
        name: 'Teste name_complement API',
        name_complement: complement,
        category: 'Carnes',
        prep_time: 10
      };

      const nameComplementResult = {
        value: complement,
        success: false,
        error: null
      };

      try {
        const saved = await Recipe.create(testData);
        const retrieved = await Recipe.getById(saved.id);

        if (retrieved.name_complement === complement) {
          console.log('✅ [API TESTER] name_complement salvo corretamente');
          nameComplementResult.success = true;
        } else {
          console.log('❌ [API TESTER] name_complement incorreto');
          console.log(`   Esperado: "${complement}"`);
          console.log(`   Obtido: "${retrieved.name_complement}"`);
          nameComplementResult.error = `Esperado: "${complement}", Obtido: "${retrieved.name_complement}"`;
        }

      } catch (error) {
        console.error('❌ [API TESTER] Erro:', error);
        nameComplementResult.error = error.message;
      }

      testResults.nameComplementTests.push(nameComplementResult);
      await sleep(500);
    }

    // Generate summary
    const passed = testResults.comprehensiveTests.filter(r => r.success).length;
    const failed = testResults.comprehensiveTests.filter(r => !r.success).length;
    const nameComplementPassed = testResults.nameComplementTests.filter(r => r.success).length;
    const nameComplementFailed = testResults.nameComplementTests.filter(r => !r.success).length;

    testResults.summary = {
      comprehensiveTests: {
        passed,
        failed,
        total: testResults.comprehensiveTests.length
      },
      nameComplementTests: {
        passed: nameComplementPassed,
        failed: nameComplementFailed,
        total: testResults.nameComplementTests.length
      },
      quickTest: {
        success: testResults.quickTest?.success || false,
        nameComplementMatch: testResults.quickTest?.nameComplementMatch || false
      }
    };

    // Analyze problematic fields
    const fieldProblems = {};
    testResults.comprehensiveTests.forEach(result => {
      if (result.fieldResults) {
        Object.entries(result.fieldResults).forEach(([field, fieldResult]) => {
          if (!fieldResult.matches) {
            if (!fieldProblems[field]) fieldProblems[field] = 0;
            fieldProblems[field]++;
          }
        });
      }
    });

    testResults.summary.fieldProblems = fieldProblems;

    console.log('\n' + '='.repeat(50));
    console.log('📈 [API TESTER] RESUMO DOS TESTES');
    console.log('='.repeat(50));
    console.log(`✅ Testes aprovados: ${passed}`);
    console.log(`❌ Testes falharam: ${failed}`);
    console.log(`📊 Total de testes: ${testResults.comprehensiveTests.length}`);
    console.log(`🎯 name_complement aprovados: ${nameComplementPassed}/${testResults.nameComplementTests.length}`);

    if (Object.keys(fieldProblems).length > 0) {
      console.log('\n🚨 [API TESTER] Campos com problemas:');
      Object.entries(fieldProblems).forEach(([field, count]) => {
        console.log(`   ${field}: ${count} falhas`);
      });
    } else {
      console.log('\n🎉 [API TESTER] Todos os campos funcionando perfeitamente!');
    }

    console.log('\n✅ [API TESTER] Testes concluídos!');

    return Response.json({
      success: true,
      message: 'Testes executados com sucesso',
      results: testResults
    });

  } catch (error) {
    console.error('❌ [API TESTER] Erro durante testes:', error);
    testResults.errors.push(error.message);
    
    return Response.json({
      success: false,
      message: 'Erro durante execução dos testes',
      error: error.message,
      results: testResults
    }, { status: 500 });
  }
}