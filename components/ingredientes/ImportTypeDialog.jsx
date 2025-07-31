import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileJson, 
  FileText, 
  Upload, 
  Database,
  Package,
  ArrowRight
} from "lucide-react";

export default function ImportTypeDialog({
  isOpen,
  onClose,
  onSelectImportType
}) {
  
  const handleFileUpload = (importType, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (importType === 'commercial') {
          // Para importação comercial - espera JSON estruturado
          const jsonData = JSON.parse(e.target?.result);
          onSelectImportType('commercial', jsonData);
        } else if (importType === 'names') {
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
          onSelectImportType('names', namesData);
        }
      } catch (error) {
        alert('Erro ao processar arquivo: ' + error.message);
      }
    };
    reader.readAsText(file);
    
    // Limpar o input
    event.target.value = '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Escolha o Tipo de Importação</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
          {/* Importação Comercial Completa */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Importação Comercial Completa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Importa dados completos incluindo fornecedores, marcas, preços e histórico.
              </p>
              
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Package className="w-3 h-3" />
                  <span>Ingredientes + dados comerciais</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileJson className="w-3 h-3" />
                  <span>Formato JSON estruturado</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  <span>Permite mapeamento/triagem</span>
                </div>
              </div>

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
              >
                <Upload className="mr-2 h-4 w-4" />
                Selecionar Arquivo JSON
              </Button>
            </CardContent>
          </Card>

          {/* Importação Simples de Nomes */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-300">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Importação de Nomes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Importa apenas nomes de ingredientes em massa, criando registros básicos.
              </p>
              
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Package className="w-3 h-3" />
                  <span>Apenas nomes de ingredientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  <span>JSON simples ou lista texto</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  <span>Criação direta no banco</span>
                </div>
              </div>

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
              >
                <Upload className="mr-2 h-4 w-4" />
                Selecionar Arquivo
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Exemplos de formato */}
        <div className="border-t pt-4 space-y-4">
          <h4 className="font-medium text-sm">Exemplos de formato:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium text-blue-600 mb-2">Importação Comercial:</div>
              <pre className="bg-gray-100 p-2 rounded text-xs">
{`{
  "commercial_data": [
    {
      "commercial_name": "Nome do Produto",
      "base_price": 0.00,
      "supplier_name": "Nome do Fornecedor",
      "brand_name": "Nome da Marca"
    }
  ]
}`}
              </pre>
            </div>
            
            <div>
              <div className="font-medium text-green-600 mb-2">Importação de Nomes:</div>
              <pre className="bg-gray-100 p-2 rounded text-xs">
{`["Açúcar Cristal", "Farinha de Trigo", "Óleo de Soja"]

ou arquivo .txt:
Açúcar Cristal
Farinha de Trigo
Óleo de Soja`}
              </pre>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}