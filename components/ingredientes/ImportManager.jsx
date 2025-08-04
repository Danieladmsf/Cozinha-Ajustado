import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileJson, 
  FileText, 
  Upload, 
  Database,
  Package,
  ArrowRight,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import ImportMappingView from "./ImportMappingView";
import ImportProgressView from "./ImportProgressView";
import NamesImportView from "./NamesImportView";

export default function ImportManager({ onImportComplete }) {
  const [currentStep, setCurrentStep] = useState('select'); // 'select', 'mapping', 'progress', 'names'
  const [importData, setImportData] = useState(null);
  const [importType, setImportType] = useState(null);

  const handleFileUpload = (type, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (type === 'commercial') {
          // Para importação comercial - espera JSON estruturado
          const jsonData = JSON.parse(e.target?.result);
          setImportData(jsonData);
          setImportType('commercial');
          setCurrentStep('mapping');
        } else if (type === 'names') {
          // Para importação de nomes - pode ser JSON simples ou texto
          let namesData;
          try {
            // Tentar parsear como JSON primeiro
            const parsed = JSON.parse(e.target?.result);
            if (Array.isArray(parsed)) {
              namesData = parsed;
            } else if (parsed.names && Array.isArray(parsed.names)) {
              namesData = parsed.names;
            } else {
              throw new Error('Formato JSON inválido');
            }
          } catch (jsonError) {
            // Se não for JSON válido, tratar como lista de nomes separados por linha
            const text = e.target?.result;
            namesData = text.split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0);
          }
          setImportData(namesData);
          setImportType('names');
          setCurrentStep('names');
        }
      } catch (error) {
        alert('Erro ao processar arquivo: ' + error.message);
      }
    };
    reader.readAsText(file);
    
    // Limpar o input
    event.target.value = '';
  };

  const handleMappingComplete = (mappedData) => {
    setImportData(mappedData);
    setCurrentStep('progress');
  };

  const handleImportComplete = (results) => {setCurrentStep('select');
    setImportData(null);
    setImportType(null);
    if (onImportComplete) {
      onImportComplete();
    }
  };

  const handleBack = () => {
    setCurrentStep('select');
    setImportData(null);
    setImportType(null);
  };

  if (currentStep === 'mapping' && importType === 'commercial') {
    return (
      <ImportMappingView
        importData={importData}
        onMappingComplete={handleMappingComplete}
        onBack={handleBack}
      />
    );
  }

  if (currentStep === 'progress' && importType === 'commercial') {
    return (
      <ImportProgressView
        importData={importData}
        onImportComplete={handleImportComplete}
        onBack={handleBack}
      />
    );
  }

  if (currentStep === 'names' && importType === 'names') {
    return (
      <NamesImportView
        namesData={importData}
        onImportComplete={handleImportComplete}
        onBack={handleBack}
      />
    );
  }

  // Tela de seleção do tipo de importação
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Importação de Dados</h2>
        <p className="text-gray-500">Escolha o tipo de importação que deseja realizar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Importação Comercial Completa */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Importação Comercial Completa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-center">
              Importa dados completos incluindo fornecedores, marcas, preços e histórico de preços.
            </p>
            
            <div className="space-y-3 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>Ingredientes + dados comerciais completos</span>
              </div>
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                <span>Formato JSON estruturado</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                <span>Permite triagem e mapeamento</span>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Ideal para importar notas fiscais processadas ou dados de sistemas ERP
              </AlertDescription>
            </Alert>

            <input
              type="file"
              accept=".json"
              onChange={(e) => handleFileUpload('commercial', e)}
              className="hidden"
              id="commercial-import"
            />
            <Button
              onClick={() => document.getElementById('commercial-import')?.click()}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Upload className="mr-2 h-4 w-4" />
              Selecionar Arquivo JSON
            </Button>
          </CardContent>
        </Card>

        {/* Importação Simples de Nomes */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-300">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-xl">Importação de Nomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-center">
              Importa apenas nomes de ingredientes em massa, criando registros básicos no sistema.
            </p>
            
            <div className="space-y-3 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>Apenas nomes de ingredientes</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>JSON simples ou lista em texto</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                <span>Criação direta no banco de dados</span>
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Perfeito para cadastrar rapidamente uma lista de ingredientes básicos
              </AlertDescription>
            </Alert>

            <input
              type="file"
              accept=".json,.txt"
              onChange={(e) => handleFileUpload('names', e)}
              className="hidden"
              id="names-import"
            />
            <Button
              onClick={() => document.getElementById('names-import')?.click()}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Upload className="mr-2 h-4 w-4" />
              Selecionar Arquivo
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Exemplos de formato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Exemplos de Formato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-blue-600 mb-3">Importação Comercial (JSON):</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "commercial_data": [
    {
      "commercial_name": "Nome do Produto",
      "base_price": 0.00,
      "unit": "kg",
      "supplier_name": "Nome do Fornecedor",
      "brand_name": "Nome da Marca",
      "category": "Nome da Categoria"
    }
  ]
}`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium text-green-600 mb-3">Importação de Nomes:</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs">
{`Formato JSON:
["Açúcar Cristal", "Farinha de Trigo", "Óleo de Soja"]

Formato Texto (.txt):
Açúcar Cristal
Farinha de Trigo
Óleo de Soja
Sal Refinado`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}