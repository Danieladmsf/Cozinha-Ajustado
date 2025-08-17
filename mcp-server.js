#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs/promises';
import path from 'path';

// Servidor MCP para o projeto Cozinha Afeto
class CozinhaAfetoMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "cozinha-afeto-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // Lista as ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_project_info",
            description: "Obtém informações detalhadas sobre o projeto Cozinha Afeto",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_recipe_structure",
            description: "Analisa a estrutura dos componentes de receitas",
            inputSchema: {
              type: "object",
              properties: {
                component: {
                  type: "string",
                  description: "Nome do componente específico (opcional)",
                }
              },
            },
          },
          {
            name: "get_api_endpoints",
            description: "Lista todos os endpoints da API do projeto",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "analyze_dependencies",
            description: "Analisa as dependências do projeto",
            inputSchema: {
              type: "object",
              properties: {},
            },
          }
        ],
      };
    });

    // Executa as ferramentas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "get_project_info":
          return await this.getProjectInfo();
        case "get_recipe_structure":
          return await this.getRecipeStructure(request.params.arguments?.component);
        case "get_api_endpoints":
          return await this.getApiEndpoints();
        case "analyze_dependencies":
          return await this.analyzeDependencies();
        default:
          throw new Error(`Ferramenta desconhecida: ${request.params.name}`);
      }
    });
  }

  async getProjectInfo() {
    const projectPath = process.env.PROJECT_PATH || process.cwd();
    
    try {
      const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
      const readme = await fs.readFile(path.join(projectPath, 'README.md'), 'utf8').catch(() => 'README não encontrado');
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              name: packageJson.name,
              version: packageJson.version,
              description: "Sistema completo de gestão para cozinha comercial",
              framework: "Next.js 14",
              database: "Firebase Firestore",
              ui: "Radix UI + Tailwind CSS",
              features: [
                "Gestão de Receitas e Fichas Técnicas",
                "Portal do Cliente para Pedidos",
                "Cardápio Semanal Configurável",
                "Gestão de Ingredientes e Preços",
                "Consolidação de Pedidos",
                "Análise Nutricional",
                "Controle de Sobras",
                "Programação da Cozinha"
              ],
              architecture: {
                frontend: "Next.js App Router",
                backend: "API Routes",
                database: "Firebase Firestore",
                auth: "Firebase Auth",
                deploy: "Vercel"
              },
              mainModules: {
                recipes: "Sistema de receitas com cálculos precisos",
                menu: "Cardápio semanal por localização",
                portal: "Interface externa para clientes",
                ingredients: "Base de dados nutricional",
                consolidation: "Agregação de pedidos",
                programming: "Planejamento operacional"
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao obter informações do projeto: ${error.message}`
          }
        ]
      };
    }
  }

  async getRecipeStructure(componentName) {
    const projectPath = process.env.PROJECT_PATH || process.cwd();
    
    try {
      const recipeComponents = [
        'components/ficha-tecnica/',
        'hooks/ficha-tecnica/',
        'lib/recipe-engine/'
      ];
      
      const structure = {};
      
      for (const dir of recipeComponents) {
        const fullPath = path.join(projectPath, dir);
        try {
          const files = await fs.readdir(fullPath);
          structure[dir] = files.filter(f => f.endsWith('.js') || f.endsWith('.jsx'));
        } catch (error) {
          structure[dir] = `Erro: ${error.message}`;
        }
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              recipeSystem: "Sistema completo de fichas técnicas",
              components: structure,
              keyFeatures: [
                "Cálculo automático de custos",
                "Análise nutricional",
                "Gestão de ingredientes",
                "Preparações e processos",
                "Validação de dados",
                "Métricas de receitas"
              ]
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao analisar estrutura de receitas: ${error.message}`
          }
        ]
      };
    }
  }

  async getApiEndpoints() {
    const projectPath = process.env.PROJECT_PATH || process.cwd();
    
    try {
      const apiPath = path.join(projectPath, 'app/api');
      const endpoints = [];
      
      async function scanDirectory(dir, basePath = '/api') {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          if (item.isDirectory()) {
            await scanDirectory(path.join(dir, item.name), `${basePath}/${item.name}`);
          } else if (item.name === 'route.js') {
            endpoints.push(basePath);
          }
        }
      }
      
      await scanDirectory(apiPath);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              endpoints: endpoints,
              description: "Endpoints da API do Cozinha Afeto",
              mainRoutes: {
                "/api/recipes": "Gestão de receitas",
                "/api/ingredients": "Gestão de ingredientes",
                "/api/category-tree": "Árvore de categorias",
                "/api/user": "Gestão de usuários",
                "/api/populate": "População de dados"
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao listar endpoints: ${error.message}`
          }
        ]
      };
    }
  }

  async analyzeDependencies() {
    const projectPath = process.env.PROJECT_PATH || process.cwd();
    
    try {
      const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'));
      
      const analysis = {
        framework: "Next.js 14",
        uiLibrary: "Radix UI + Tailwind CSS",
        database: "Firebase",
        stateManagement: "Zustand",
        keyDependencies: {
          core: [
            "next",
            "react",
            "firebase"
          ],
          ui: [
            "@radix-ui/*",
            "tailwindcss",
            "lucide-react",
            "framer-motion"
          ],
          utilities: [
            "date-fns",
            "lodash",
            "zustand"
          ]
        },
        totalDependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length
      };
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(analysis, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao analisar dependências: ${error.message}`
          }
        ]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Servidor MCP Cozinha Afeto iniciado");
  }
}

const server = new CozinhaAfetoMCPServer();
server.run().catch(console.error);