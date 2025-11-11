import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer } from "lucide-react";

export default function RecipeTechnicalCollectDialog({
  recipe,
  preparations,
  isOpen,
  onClose
}) {
  const handlePrint = () => {
    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ficha Técnica Coleta - ${recipe.name}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 10mm; /* Reduzido */
          }

          body {
            font-family: Arial, sans-serif;
            line-height: 1.3; /* Reduzido */
            margin: 0;
            padding: 0;
            color: #333;
            font-size: 9pt; /* Reduzido globalmente */
          }

          .document-header {
            border-bottom: 1.5px solid #2563eb; /* Levemente mais fino */
            padding-bottom: 8px; /* Reduzido */
            margin-bottom: 15px; /* Reduzido */
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .document-header h1 {
            color: #2563eb;
            font-size: 1.2rem; /* Reduzido */
            margin: 0;
          }

          .document-header .date {
            color: #666;
            font-size: 0.75rem; /* Reduzido */
          }

          .info-section {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px; /* Reduzido */
            margin-bottom: 20px; /* Reduzido */
            border: 1px solid #e5e7eb;
            padding: 10px; /* Reduzido */
            border-radius: 4px;
            background: #f8fafc;
          }

          .info-item {
            display: flex;
            flex-direction: column;
          }

          .info-label {
            font-size: 0.6rem; /* Reduzido */
            text-transform: uppercase;
            color: #666;
            margin-bottom: 3px; /* Reduzido */
            font-weight: bold;
          }

          .info-value {
            border-bottom: 1px solid #ccc;
            padding: 3px 0; /* Reduzido */
            min-height: 18px; /* Reduzido */
          }

          .process-section {
            margin-bottom: 20px; /* Reduzido */
            page-break-inside: avoid;
          }

          .process-title {
            background: #2563eb;
            color: white;
            padding: 6px 12px; /* Reduzido */
            font-size: 0.9rem; /* Reduzido */
            font-weight: bold;
            border-radius: 4px;
            margin-bottom: 10px; /* Reduzido */
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px; /* Reduzido */
            font-size: 0.75rem; /* Reduzido */
          }

          th {
            background: #f1f5f9;
            padding: 5px; /* Reduzido */
            text-align: left;
            font-weight: bold;
            border: 1px solid #e5e7eb;
            color: #1e293b;
          }

          td {
            padding: 5px; /* Reduzido */
            border: 1px solid #e5e7eb;
            vertical-align: middle;
          }

          .measure-field { /* Deprecado em favor de fill-field com classes de tamanho */
            border-bottom: 1px dashed #666;
            height: 18px; /* Reduzido */
            min-width: 50px; /* Reduzido */
            display: inline-block;
          }

          .instructions {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 10px; /* Reduzido */
            margin-top: 10px; /* Reduzido */
          }

          .instructions-title {
            font-weight: bold;
            margin-bottom: 8px; /* Reduzido */
            color: #1e293b;
          }

          .footer {
            text-align: center;
            font-size: 0.7rem; /* Reduzido */
            color: #666;
            margin-top: 20px; /* Reduzido */
            padding-top: 8px; /* Reduzido */
            border-top: 1px solid #e5e7eb;
          }

          /* Campos para preenchimento manual */
          .fill-field {
            border-bottom: 1px dashed #999;
            display: inline-block;
            height: 1.1em; /* Ajustado para a nova fonte */
            position: relative;
          }

          .small-field {
            min-width: 40px; /* Reduzido */
          }

          .medium-field {
            min-width: 60px; /* Reduzido */
          }

          .large-field {
            min-width: 80px; /* Reduzido */
          }

          .notes-area {
            min-height: 150px; /* Reduzido */
            border: 1px solid #e5e7eb;
            border-style: dashed;
            padding: 8px; /* Reduzido */
            margin-top: 8px; /* Reduzido */
            background: repeating-linear-gradient(
              #f8fafc,
              #f8fafc 23px, /* Ajustado para nova altura de linha */
              #e5e7eb 23px, /* Ajustado */
              #e5e7eb 24px  /* Ajustado */
            );
            background-position: 0 8px; /* Ajustado */
          }
        </style>
      </head>
      <body>
        <div class="document-header">
          <h1>Ficha Técnica Coleta - ${recipe.name}</h1>
          <span class="date">Data: ${format(new Date(), 'dd/MM/yyyy')}</span>
        </div>

        <div class="info-section">
          <div class="info-item">
            <div class="info-label">CATEGORIA</div>
            <div class="info-value">${recipe.category || 'Carnes'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">TEMPO DE PREPARO</div>
            <div class="info-value"><span class="fill-field medium-field"></span> min</div>
          </div>
          <div class="info-item">
            <div class="info-label">PESO DA CUBA</div>
            <div class="info-value"><span class="fill-field medium-field"></span> kg</div>
          </div>
        </div>
    `;

    // Para cada preparação
    preparations.forEach((prep, prepIndex) => {
      const processes = prep.processes || [];
      printContent += `
        <div class="process-section">
          <div class="process-title">${prepIndex + 1}º Etapa: ${prep.title}</div>

          <table>
            <thead>
              <tr>
                <th colspan="2">DADOS INGREDIENTES</th>
                ${processes.includes('defrosting') ? '<th colspan="3">DESCONGELAMENTO</th>' : ''}
                ${processes.includes('cleaning') && !processes.includes('defrosting') ? '<th>PESO BRUTO</th>' : ''}
                ${processes.includes('cleaning') ? '<th colspan="2">LIMPEZA</th>' : ''}
                ${processes.includes('cooking') && !processes.includes('cleaning') && !processes.includes('defrosting') ? '<th>PESO ENTRADA</th>' : ''}
                ${processes.includes('cooking') ? '<th colspan="3">COCÇÃO</th>' : ''}
                ${processes.includes('portioning') && !processes.includes('cooking') && !processes.includes('cleaning') && !processes.includes('defrosting') ? '<th>PESO ENTRADA</th>' : ''}
                ${processes.includes('portioning') ? '<th colspan="2">PORCIONAMENTO</th>' : ''}
              </tr>
              <tr>
                <th>INGREDIENTE</th>
                <th>PREÇO/KG</th>
                ${processes.includes('defrosting') ? `
                  <th>PESO CONG.</th>
                  <th>PESO RESF.</th>
                  <th>PERDA%</th>
                ` : ''}
                ${processes.includes('cleaning') && !processes.includes('defrosting') ? '<th>(LIMPEZA)</th>' : ''}
                ${processes.includes('cleaning') ? `
                  <th>PÓS LIMP.</th>
                  <th>PERDA%</th>
                ` : ''}
                ${processes.includes('cooking') && !processes.includes('cleaning') && !processes.includes('defrosting') ? '<th>(COCÇÃO)</th>' : ''}
                ${processes.includes('cooking') ? `
                  <th>PRÉ COCÇÃO</th>
                  <th>PÓS COCÇÃO</th>
                  <th>PERDA%</th>
                ` : ''}
                ${processes.includes('portioning') && !processes.includes('cooking') && !processes.includes('cleaning') && !processes.includes('defrosting') ? '<th>(PORC.)</th>' : ''}
                ${processes.includes('portioning') ? `
                  <th>PÓS PORC.</th>
                  <th>PERDA%</th>
                ` : ''}
              </tr>
            </thead>
            <tbody>
      `;

      // Para cada ingrediente da preparação
      if (prep.ingredients && prep.ingredients.length > 0) {
        prep.ingredients.forEach(ing => {
          printContent += `
            <tr>
              <td>${ing.name}</td>
              <td>R$ ${parseFloat(ing.current_price || 0).toFixed(2).replace('.', ',')}</td>
              ${processes.includes('defrosting') ? `
                <td><span class="fill-field small-field"></span></td>
                <td><span class="fill-field small-field"></span></td>
                <td><span class="fill-field small-field"></span></td>
              ` : ''}
              ${processes.includes('cleaning') && !processes.includes('defrosting') ? `<td><span class="fill-field small-field"></span></td>` : ''}
              ${processes.includes('cleaning') ? `
                <td><span class="fill-field small-field"></span></td>
                <td><span class="fill-field small-field"></span></td>
              ` : ''}
              ${processes.includes('cooking') && !processes.includes('cleaning') && !processes.includes('defrosting') ? `<td><span class="fill-field small-field"></span></td>` : ''}
              ${processes.includes('cooking') ? `
                <td><span class="fill-field small-field"></span></td>
                <td><span class="fill-field small-field"></span></td>
                <td><span class="fill-field small-field"></span></td>
              ` : ''}
              ${processes.includes('portioning') && !processes.includes('cooking') && !processes.includes('cleaning') && !processes.includes('defrosting') ? `<td><span class="fill-field small-field"></span></td>` : ''}
              ${processes.includes('portioning') ? `
                <td><span class="fill-field small-field"></span></td>
                <td><span class="fill-field small-field"></span></td>
              ` : ''}
            </tr>
          `;
        });
      } else if (prep.sub_components && prep.sub_components.length > 0) {
          prep.sub_components.forEach(sc => {
            printContent += `
              <tr>
                <td>${sc.name} (${sc.type === 'recipe' ? 'Receita' : 'Preparo Interno'})</td>
                <td>-</td>
                ${processes.includes('assembly') || processes.includes('portioning') ? `
                  <td colspan="${processes.includes('defrosting') ? 3 : 0}${processes.includes('cleaning') ? (processes.includes('defrosting')? 2 : 3) : 0}${processes.includes('cooking') ? (processes.includes('cleaning') || processes.includes('defrosting') ? 3 : 4) : 0}${processes.includes('portioning') ? 2 : 0}">
                    ${processes.includes('portioning') ? `Peso Entrada: <span class="fill-field medium-field"></span> / Pós Porc.: <span class="fill-field medium-field"></span> / Perda: <span class="fill-field small-field"></span>%` : `Peso: <span class="fill-field medium-field"></span>`}
                  </td>
                ` : `
                  <td colspan="3">Subcomponente</td>
                  ${processes.includes('cleaning') ? '<td colspan="2"></td>' : ''}
                  ${processes.includes('cooking') ? '<td colspan="3"></td>' : ''}
                  ${processes.includes('portioning') ? '<td colspan="2"></td>' : ''}
                `}
              </tr>
            `;
          });
      } else {
        const colspanValue = 2 +
          (processes.includes('defrosting') ? 3 : 0) +
          (processes.includes('cleaning') ? (processes.includes('defrosting') ? 2 : 3) : 0) +
          (processes.includes('cooking') ? (processes.includes('cleaning') || processes.includes('defrosting') ? 3: 4) : 0) +
          (processes.includes('portioning') ? (processes.includes('cooking') || processes.includes('cleaning') || processes.includes('defrosting') ? 2 : 3) : 0);
        printContent += `
          <tr>
            <td colspan="${colspanValue}" style="text-align: center;">Nenhum item nesta etapa</td>
          </tr>
        `;
      }

      printContent += `
            </tbody>
          </table>

          <div class="instructions">
            <div class="instructions-title">Modo de Preparo desta Etapa:</div>
            <div class="notes-area">
            </div>
          </div>
        </div>
      `;
    });

    printContent += `
        <div class="footer">
          <div style="margin-bottom: 10px; font-size: 0.7rem; color: #666;">
            Responsável: _________________________________ Data: ___/___/_____
          </div>
          Ficha Técnica Coleta - ${recipe.name} - Gerada em ${format(new Date(), 'dd/MM/yyyy HH:mm')}
        </div>
      </body>
      </html>
    `;

    // Abrir janela de impressão
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Aguardar carregamento antes de imprimir
    setTimeout(() => {
      printWindow.print();
      // Mantenha a janela aberta para debug se necessário, ou feche:
      // printWindow.close();
    }, 750); // Aumentei um pouco o timeout para garantir o carregamento completo do CSS
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Ficha Técnica de Coleta</h3>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>

          <div className="text-sm text-gray-500">
            Esta ficha é destinada para coleta de dados durante o preparo da receita.
            Ao imprimir, selecione a orientação retrato para melhor visualização.
          </div>

          <div className="flex justify-center">
            <Button onClick={handlePrint} className="w-full">
              <Printer className="mr-2 h-4 w-4" />
              Gerar Ficha de Coleta para Impressão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
