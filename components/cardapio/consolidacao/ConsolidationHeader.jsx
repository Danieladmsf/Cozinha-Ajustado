import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Loader2 } from "lucide-react";

const ConsolidationHeader = ({ printing, onPrint }) => {
  return (
    <Card className="print:hidden">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <FileText className="w-5 h-5" />
              Consolidação de Pedidos
            </CardTitle>
            <p className="text-gray-600 mt-1">
              Visualize pedidos consolidados por cliente e categoria
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrint}
              disabled={printing}
              className="gap-2"
            >
              {printing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              Imprimir
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default ConsolidationHeader;