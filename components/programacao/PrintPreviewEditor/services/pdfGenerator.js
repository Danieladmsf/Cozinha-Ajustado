import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatRecipeName } from '../utils/formatUtils';

/**
 * Serviço de geração de PDF para o editor de programação
 * Exporta funções para gerar e fazer download de PDFs dos blocos de produção
 */

/**
 * Gera e faz download de PDF dos blocos de produção
 * @param {Object} options - Opções para geração do PDF
 * @param {Function} options.setZoom - Função para alterar o zoom
 * @param {number} options.zoom - Zoom atual
 * @param {Function} options.setIsGeneratingPDF - Função para controlar estado de geração
 * @param {Function} options.setPdfProgress - Função para atualizar progresso
 * @param {Object} options.selectedDayInfo - Informações do dia selecionado
 */
export async function generateAndDownloadPDF({
  setZoom,
  zoom,
  setIsGeneratingPDF,
  setPdfProgress,
  selectedDayInfo
}) {
  const originalZoom = zoom;
  try {
    setIsGeneratingPDF(true);

    // Salvar zoom atual e resetar para 100% para captura precisa
    setZoom(100);

    // Aguardar um momento para o DOM atualizar com zoom 100% e React re-renderizar
    await new Promise(resolve => setTimeout(resolve, 1000)); // Aumentado de 300ms para 1000ms

    // Criar PDF em orientação portrait A4
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210; // A4 width em mm
    const pdfHeight = 297; // A4 height em mm

    // Capturar todos os blocos visíveis
    const blockElements = document.querySelectorAll('.a4-page');
    const totalPages = blockElements.length;

    setPdfProgress({ current: 0, total: totalPages });

    for (let i = 0; i < blockElements.length; i++) {
      const block = blockElements[i];

      // Atualizar progresso
      setPdfProgress({ current: i + 1, total: totalPages });

      // Capturar o bloco como canvas com alta qualidade
      const canvas = await html2canvas(block, {
        scale: 3, // Tripla qualidade para texto mais nítido
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794, // Largura fixa A4
        windowHeight: 1123, // Altura fixa A4
        letterRendering: true, // Melhor renderização de texto
        removeContainer: true, // Remove o container temporário
        imageTimeout: 0, // Sem timeout para imagens
        ignoreElements: () => false, // Não ignorar nenhum elemento
        foreignObjectRendering: false, // Desabilita foreign object para melhor compatibilidade
        onclone: (clonedDoc) => {
          // Remover elementos .no-print (botões e timestamps)
          clonedDoc.querySelectorAll('.no-print').forEach(el => el.remove());

          // Garantir que todos os estilos sejam aplicados no clone
          const clonedBlock = clonedDoc.querySelector('.a4-page');
          if (clonedBlock) {
            clonedBlock.style.width = '794px';
            clonedBlock.style.height = '1123px';
            clonedBlock.style.overflow = 'visible';

            // Forçar cores azuis nos números
            const quantityElements = clonedBlock.querySelectorAll('.item-qty');
            quantityElements.forEach(el => {
              el.style.color = '#2563eb';
              el.style.fontWeight = 'bold';
            });

            // Garantir que títulos de categoria tenham borda cinza
            const categoryTitles = clonedBlock.querySelectorAll('.category-title');
            categoryTitles.forEach(el => {
              el.style.borderBottom = '2px solid #e5e7eb';
            });
          }
        }
      });

      // Converter canvas para imagem PNG (melhor qualidade que JPEG)
      const imgData = canvas.toDataURL('image/png', 1.0);

      // Calcular dimensões mantendo proporção A4
      const imgWidth = pdfWidth;
      const imgHeight = pdfHeight;

      // Adicionar nova página se não for a primeira
      if (i > 0) {
        pdf.addPage();
      }

      // Adicionar imagem ao PDF cobrindo toda a página
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    }

    // Gerar nome do arquivo com data formatada
    const dateStr = selectedDayInfo?.fullDate?.replace(/\//g, '_') || 'producao';
    const fileName = `Programacao_${dateStr}.pdf`;

    // Fazer download do PDF
    pdf.save(fileName);

    // Restaurar zoom original
    setZoom(originalZoom);
    setPdfProgress({ current: 0, total: 0 });
    setIsGeneratingPDF(false);
  } catch (error) {
    alert('Erro ao gerar PDF. Por favor, tente novamente.');
    setZoom(originalZoom);
    setPdfProgress({ current: 0, total: 0 });
    setIsGeneratingPDF(false);
  }
}

/**
 * Gera HTML completo para impressão dos blocos
 * @param {Array} blocks - Array de blocos para gerar HTML
 * @param {Function} formatQuantityDisplay - Função para formatar quantidades
 * @returns {string} HTML completo para impressão
 */
export function generatePrintHTML(blocks, formatQuantityDisplay) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Programação de Produção</title>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 3mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; }
          .print-page {
            page-break-after: always;
            min-height: 287mm;
            width: 200mm;
            padding: 5mm;
            position: relative;
            line-height: 1.4;
          }
          .print-page:last-child { page-break-after: avoid; }

          /* Classes do preview com tamanhos proporcionais em em */
          .block-title {
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 8px;
            line-height: 1.1;
          }
          .block-subtitle {
            color: #6b7280;
            font-size: 1.6em;
            margin-bottom: 16px;
          }
          .items-container {
            margin-top: 12px;
            width: 100%;
          }
          .category-section {
            margin-bottom: 16px;
          }
          .category-title {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
            display: block;
          }
          .item-line {
            display: flex;
            align-items: baseline;
            gap: 12px;
            margin-bottom: 4px;
            padding: 2px;
          }
          .item-qty {
            font-weight: bold;
            color: #2563eb;
            min-width: 120px;
            font-size: 1.3em;
          }
          .item-text {
            flex: 1;
            font-size: 1.2em;
          }

          /* Fallback para estilos antigos */
          h1 { font-size: 24px; margin-bottom: 10px; }
          h2 { font-size: 18px; margin: 15px 0 8px 0; font-weight: bold; }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
          .item-row {
            display: flex;
            align-items: baseline;
            margin-bottom: 8px;
            gap: 10px;
          }
          .item-quantity { font-weight: bold; color: #2563eb; min-width: 100px; }
          .item-name { flex: 1; }
          .category-block { margin-bottom: 20px; }
        </style>
      </head>
      <body>
        ${blocks.map(block => generateBlockHTML(block, formatQuantityDisplay)).join('')}
      </body>
    </html>
  `;
}

/**
 * Gera HTML de um bloco individual
 * @param {Object} block - Bloco para gerar HTML
 * @param {Function} formatQuantityDisplay - Função para formatar quantidades
 * @returns {string} HTML do bloco
 */
export function generateBlockHTML(block, formatQuantityDisplay) {
  // Se tiver HTML editado, usar diretamente
  if (block.editedHTML) {
    return `
      <div class="print-page" style="font-size: ${block.fontSize}px; line-height: 1.4;">
        ${block.editedHTML}
      </div>
    `;
  }

  // Caso contrário, gerar do zero (fallback)
  const baseFontSize = block.fontSize;
  const h1Size = baseFontSize * 3;
  const h2Size = baseFontSize * 2;
  const h3Size = baseFontSize * 1.5;
  const subtitleSize = baseFontSize * 1.6;
  const qtySize = baseFontSize * 1.3;
  const textSize = baseFontSize * 1.2;

  if (block.type === 'empresa') {
    return `
      <div class="print-page" style="font-size: ${baseFontSize}px; line-height: 1.4;">
        <h1 style="font-size: ${h1Size}px; line-height: 1.1; margin-bottom: 8px;">${formatRecipeName(block.title)}</h1>
        <div class="subtitle" style="font-size: ${subtitleSize}px; margin-bottom: 16px;">${block.subtitle}</div>
        ${Object.entries(block.items).map(([categoryName, items]) => `
          <div class="category-block" style="margin-bottom: 16px;">
            <h2 style="font-size: ${h2Size}px; margin-bottom: 8px;">${categoryName}</h2>
            ${items.map(item => `
              <div class="item-row" style="margin-bottom: 4px; padding: 2px;">
                <span class="item-quantity" style="font-size: ${qtySize}px;">${formatQuantityDisplay(item)}</span>
                <span class="item-name" style="font-size: ${textSize}px;">${formatRecipeName(item.recipe_name)}</span>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (block.type === 'detailed-section') {
    return `
      <div class="print-page" style="font-size: ${baseFontSize}px; line-height: 1.4;">
        <h1 style="font-size: ${h1Size}px; line-height: 1.1; margin-bottom: 8px;">${formatRecipeName(block.title)}</h1>
        <div class="subtitle" style="font-size: ${subtitleSize}px; margin-bottom: 16px;">${block.subtitle}</div>
        ${block.items.map((recipe, idx) => `
          <div class="category-block" style="margin-bottom: 16px;">
            <h2 style="font-size: ${h2Size}px; margin-bottom: 8px; font-weight: bold;">${formatRecipeName(recipe.recipe_name)}</h2>
            ${recipe.clientes.map(cliente => `
              <div class="item-row" style="display: flex; gap: 10px; align-items: baseline; margin-bottom: 4px; padding: 2px;">
                <span class="item-name" style="font-size: ${textSize}px; flex: 0 0 200px; text-transform: uppercase;">${cliente.customer_name}</span>
                <span style="font-size: ${textSize}px;">→</span>
                <span class="item-quantity" style="font-size: ${qtySize}px; font-weight: bold; color: #2563eb;">${formatQuantityDisplay(cliente)}</span>
              </div>
            `).join('')}
            ${recipe.showTotal ? `
              <div class="item-row" style="display: flex; gap: 10px; align-items: baseline; margin-top: 8px; padding-top: 4px; border-top: 2px solid #e5e7eb; font-weight: bold;">
                <span class="item-name" style="font-size: ${textSize}px; flex: 0 0 200px;">TOTAL:</span>
                <span style="font-size: ${textSize}px;"></span>
                <span class="item-quantity" style="font-size: ${qtySize}px; color: #2563eb;">${formatQuantityDisplay({ quantity: recipe.total, unit_type: recipe.unit_type })}</span>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (block.type === 'embalagem-category') {
    return `
      <div class="print-page" style="font-size: ${baseFontSize}px; line-height: 1.4;">
        <h1 style="font-size: ${h1Size}px; line-height: 1.1; margin-bottom: 8px;">${formatRecipeName(block.title)}</h1>
        <div class="subtitle" style="font-size: ${subtitleSize}px; margin-bottom: 16px;">${block.subtitle}</div>
        ${block.items.map((recipe, idx) => `
          <div class="category-block" style="margin-bottom: 16px;">
            <h2 style="font-size: ${h2Size}px; margin-bottom: 8px; font-weight: bold;">${formatRecipeName(recipe.recipe_name)}</h2>
            ${recipe.clientes.map(cliente => `
              <div class="item-row" style="display: flex; gap: 10px; align-items: baseline; margin-bottom: 4px; padding: 2px;">
                <span class="item-name" style="font-size: ${textSize}px; flex: 0 0 200px; text-transform: uppercase;">${cliente.customer_name}</span>
                <span style="font-size: ${textSize}px;">→</span>
                <span class="item-quantity" style="font-size: ${qtySize}px; font-weight: bold; color: #2563eb;">${formatQuantityDisplay(cliente)}</span>
              </div>
            `).join('')}
            ${recipe.showTotal ? `
              <div class="item-row" style="display: flex; gap: 10px; align-items: baseline; margin-top: 8px; padding-top: 4px; border-top: 2px solid #e5e7eb; font-weight: bold;">
                <span class="item-name" style="font-size: ${textSize}px; flex: 0 0 200px;">TOTAL:</span>
                <span style="font-size: ${textSize}px;"></span>
                <span class="item-quantity" style="font-size: ${qtySize}px; color: #2563eb;">${formatQuantityDisplay({ quantity: recipe.total, unit_type: recipe.unit_type })}</span>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  return `<div class="print-page" style="font-size: ${baseFontSize}px;">
    <h1 style="font-size: ${h1Size}px;">${formatRecipeName(block.title)}</h1>
    <div class="subtitle" style="font-size: ${subtitleSize}px;">${block.subtitle}</div>
  </div>`;
}
