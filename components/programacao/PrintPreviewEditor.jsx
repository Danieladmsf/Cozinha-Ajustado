'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Save, Edit3, Maximize2, RefreshCw, GripVertical, Download } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './print-preview.css';

// Constantes de tamanho A4 (baseadas em dimensões físicas reais)
// A4: 210mm × 297mm a 96 DPI padrão do navegador
const A4_WIDTH_PX = 794;   // 210mm = 794px
const A4_HEIGHT_PX = 1123;  // 297mm = 1123px
const PAGE_PADDING_PX = 10; // Padding definido em .a4-page (print-preview.css)

export default function PrintPreviewEditor({ data, onClose, onPrint }) {
  const { porEmpresaData, saladaData, acougueData, embalagemData, selectedDayInfo, formatQuantityDisplay, consolidateCustomerItems, recipes } = data;

  const [editableBlocks, setEditableBlocks] = useState([]);
  const [blockStatus, setBlockStatus] = useState({});
  const [zoom, setZoom] = useState(50); // Zoom inicial reduzido para 50% para visualizar folha inteira
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [hasSavedSizes, setHasSavedSizes] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const previewAreaRef = useRef(null);

  // Carregar tamanhos salvos do localStorage
  const loadSavedFontSizes = () => {
    try {
      const saved = localStorage.getItem('print-preview-font-sizes');
      if (saved) {
        setHasSavedSizes(true);
        return JSON.parse(saved);
      }
      return {};
    } catch (error) {
      console.error('Erro ao carregar tamanhos salvos:', error);
      return {};
    }
  };

  // Carregar ordem salva do localStorage
  const loadSavedOrder = () => {
    try {
      const saved = localStorage.getItem('print-preview-page-order');
      if (saved) {
        return JSON.parse(saved);
      }
      return [];
    } catch (error) {
      console.error('Erro ao carregar ordem salva:', error);
      return [];
    }
  };

  // Salvar ordem no localStorage
  const savePageOrder = (blocks) => {
    try {
      const order = blocks.map(block => block.id);
      localStorage.setItem('print-preview-page-order', JSON.stringify(order));
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
    }
  };

  // Salvar tamanhos no localStorage
  const saveFontSizes = (blocks) => {
    try {
      const fontSizes = {};
      blocks.forEach(block => {
        // Criar chave única baseada no tipo e título
        const key = `${block.type}:${block.title}`;
        fontSizes[key] = block.fontSize;
      });
      localStorage.setItem('print-preview-font-sizes', JSON.stringify(fontSizes));
    } catch (error) {
      console.error('Erro ao salvar tamanhos:', error);
    }
  };

  // Inicializar blocos editáveis
  useEffect(() => {
    const blocks = [];
    const savedFontSizes = loadSavedFontSizes();

    // Criar blocos para cada empresa
    if (porEmpresaData && porEmpresaData.length > 0) {
      porEmpresaData.forEach((customerData, index) => {
        const consolidatedItems = consolidateCustomerItems(customerData.orders);

        // Calcular tamanho inicial baseado na quantidade de itens
        const totalItems = Object.values(consolidatedItems).reduce((sum, items) => sum + items.length, 0);
        let initialFontSize = 16; // Base maior
        if (totalItems <= 10) initialFontSize = 18;
        if (totalItems <= 8) initialFontSize = 20;
        if (totalItems <= 6) initialFontSize = 22;

        // Usar tamanho salvo se existir
        const savedKey = `empresa:${customerData.customer_name}`;
        const fontSize = savedFontSizes[savedKey] || initialFontSize;

        blocks.push({
          id: `empresa-${index}`,
          type: 'empresa',
          title: customerData.customer_name,
          subtitle: `${selectedDayInfo?.fullDate} • ${customerData.total_meals} refeições`,
          items: consolidatedItems,
          fontSize: fontSize,
          width: 100,
          editable: true
        });
      });
    }

    // Adicionar Salada (uma única página)
    if (saladaData && Object.keys(saladaData).length > 0) {
      const saladaItems = [];
      Object.entries(saladaData).forEach(([recipeName, clientes]) => {
        const clientesList = [];

        Object.entries(clientes).forEach(([customerName, clienteData]) => {
          clientesList.push({
            customer_name: customerName,
            quantity: clienteData.quantity,
            unit_type: clienteData.unitType
          });
        });

        saladaItems.push({
          recipe_name: recipeName,
          clientes: clientesList,
          showTotal: false  // Salada não mostra total
        });
      });

      const savedKey = 'detailed-section:Salada';
      const fontSize = savedFontSizes[savedKey] || 16;

      blocks.push({
        id: 'salada',
        type: 'detailed-section',
        title: 'Salada',
        subtitle: selectedDayInfo?.fullDate,
        items: saladaItems,
        fontSize: fontSize,
        width: 100,
        editable: true
      });
    }

    // Adicionar Açougue (uma única página)
    if (acougueData && Object.keys(acougueData).length > 0) {
      const acougueItems = [];
      Object.entries(acougueData).forEach(([recipeName, clientes]) => {
        const clientesList = [];
        let totalQuantity = 0;
        let unitType = '';

        Object.entries(clientes).forEach(([customerName, clienteData]) => {
          clientesList.push({
            customer_name: customerName,
            quantity: clienteData.quantity,
            unit_type: clienteData.unitType
          });
          totalQuantity += clienteData.quantity;
          if (!unitType) unitType = clienteData.unitType;
        });

        totalQuantity = Math.round(totalQuantity * 100) / 100;

        acougueItems.push({
          recipe_name: recipeName,
          clientes: clientesList,
          showTotal: true,
          total: totalQuantity,
          unit_type: unitType
        });
      });

      const savedKey = 'detailed-section:Porcionamento Carnes';
      const fontSize = savedFontSizes[savedKey] || 16;

      blocks.push({
        id: 'acougue',
        type: 'detailed-section',
        title: 'Porcionamento Carnes',
        subtitle: selectedDayInfo?.fullDate,
        items: acougueItems,
        fontSize: fontSize,
        width: 100,
        editable: true
      });
    }

    // Adicionar Embalagem - uma página por categoria
    // Nota: embalagemData vem com estrutura { recipeName: { customerName: {...} } }
    // Precisamos agrupar por categoria (PADRÃO, REFOGADO, ACOMPANHAMENTO)
    if (embalagemData && Object.keys(embalagemData).length > 0) {
      const categorias = {
        'PADRÃO': [],
        'REFOGADO': [],
        'ACOMPANHAMENTO': []
      };

      // Agrupar receitas por categoria
      Object.entries(embalagemData).forEach(([recipeName, clientes]) => {
        // Encontrar a receita para verificar sua categoria
        const recipe = recipes.find(r => r.name === recipeName);
        if (!recipe) return;

        const category = recipe.category?.toLowerCase();
        let targetCategory = null;

        if (category?.includes('padrão') || category?.includes('padrao')) {
          targetCategory = 'PADRÃO';
        } else if (category?.includes('refogado')) {
          targetCategory = 'REFOGADO';
        } else if (category?.includes('acompanhamento')) {
          targetCategory = 'ACOMPANHAMENTO';
        }

        if (targetCategory) {
          const clientesList = [];
          let totalQuantity = 0;
          let unitType = '';

          Object.entries(clientes).forEach(([customerName, clienteData]) => {
            if (clienteData && clienteData.quantity !== undefined) {
              clientesList.push({
                customer_name: customerName,
                quantity: clienteData.quantity,
                unit_type: clienteData.unitType
              });
              totalQuantity += clienteData.quantity;
              if (!unitType) unitType = clienteData.unitType;
            }
          });

          totalQuantity = Math.round(totalQuantity * 100) / 100;

          categorias[targetCategory].push({
            recipe_name: recipeName,
            clientes: clientesList,
            showTotal: true,
            total: totalQuantity,
            unit_type: unitType
          });
        }
      });

      // Criar um bloco para cada categoria que tem itens
      Object.entries(categorias).forEach(([categoryName, itemsList]) => {
        if (itemsList.length > 0) {
          const savedKey = `embalagem-category:${categoryName}`;
          const fontSize = savedFontSizes[savedKey] || 16;

          blocks.push({
            id: `embalagem-${categoryName.toLowerCase()}`,
            type: 'embalagem-category',
            title: categoryName,
            subtitle: selectedDayInfo?.fullDate,
            categoryName: categoryName,
            items: itemsList,
            fontSize: fontSize,
            width: 100,
            editable: true
          });
        }
      });
    }

    // Aplicar ordem salva se existir
    const savedOrder = loadSavedOrder();
    if (savedOrder.length > 0) {
      // Reordenar blocks baseado na ordem salva
      const orderedBlocks = [];
      const blocksMap = new Map(blocks.map(b => [b.id, b]));

      // Adicionar blocos na ordem salva
      savedOrder.forEach(id => {
        if (blocksMap.has(id)) {
          orderedBlocks.push(blocksMap.get(id));
          blocksMap.delete(id);
        }
      });

      // Adicionar blocos novos que não estavam na ordem salva
      blocksMap.forEach(block => orderedBlocks.push(block));

      setEditableBlocks(orderedBlocks);
    } else {
      setEditableBlocks(blocks);
    }
  }, [porEmpresaData, saladaData, acougueData, embalagemData, recipes]);

  // Salvar automaticamente quando fontSize ou ordem mudar
  useEffect(() => {
    if (editableBlocks.length > 0) {
      saveFontSizes(editableBlocks);
      savePageOrder(editableBlocks);
    }
  }, [editableBlocks]);

  const handleFontSizeChange = (blockId, delta) => {
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, fontSize: Math.max(8, Math.min(30, block.fontSize + delta)) }
          : block
      )
    );
  };

  const handleAutoFit = (blockId) => {
    // Marcar bloco para auto-fit
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, autoFitting: true, autoFitTimestamp: Date.now() }
          : block
      )
    );
  };

  const handleAutoFitComplete = (blockId) => {
    // Limpar flag de auto-fitting
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, autoFitting: false }
          : block
      )
    );
  };

  const handleStatusUpdate = (blockId, isOverflowing, numPages) => {
    setBlockStatus(prev => ({
      ...prev,
      [blockId]: { isOverflowing, numPages }
    }));
  };

  const scrollToBlock = (blockId) => {
    const element = document.getElementById(`block-${blockId}`);
    if (element && previewAreaRef.current) {
      const container = previewAreaRef.current;

      // Obter posição do elemento no wrapper escalado
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Calcular posição relativa considerando o scroll atual
      const relativeTop = elementRect.top - containerRect.top + container.scrollTop;

      // Compensar pelo scale/zoom
      const scaledOffset = 50 / (zoom / 100); // Offset ajustado pelo zoom

      container.scrollTo({
        top: relativeTop - scaledOffset,
        behavior: 'smooth'
      });

      setSelectedBlock(blockId);
    }
  };

  const handleFixBlock = (blockId, e) => {
    e.stopPropagation(); // Evitar que o click no badge também acione o click do item

    // Primeiro seleciona o bloco (necessário para o auto-fit funcionar)
    setSelectedBlock(blockId);

    // Navega para o bloco
    scrollToBlock(blockId);

    // Executa o auto-fit após dar tempo para o elemento renderizar e estar pronto
    setTimeout(() => {
      handleAutoFit(blockId);
    }, 600);
  };

  const handleResetFontSizes = () => {
    if (confirm('Deseja resetar todos os tamanhos de fonte e ordem das páginas para os valores padrão?')) {
      localStorage.removeItem('print-preview-font-sizes');
      localStorage.removeItem('print-preview-page-order');
      // Recarregar página para aplicar os padrões
      window.location.reload();
    }
  };

  // Handlers de drag and drop
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // Reordenar blocos
    const newBlocks = [...editableBlocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(dropIndex, 0, draggedBlock);

    setEditableBlocks(newBlocks);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleContentEdit = (blockId, field, value) => {
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, [field]: value }
          : block
      )
    );
  };

  const handlePrintFinal = () => {
    // Capturar HTML editado de cada bloco do DOM
    const blocksWithEditedContent = editableBlocks.map(block => {
      const element = document.getElementById(`block-${block.id}`);
      if (element) {
        const contentElement = element.querySelector('.block-content');
        if (contentElement) {
          // Pegar o wrapper interno (primeiro filho) que contém o conteúdo real
          const contentWrapper = contentElement.firstElementChild;
          if (!contentWrapper) return block;

          // Clonar para não modificar o original
          const clone = contentWrapper.cloneNode(true);

          // Limpar atributos de edição e estilos inline extras
          clone.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.removeAttribute('suppressContentEditableWarning');
            // Remover todos os estilos inline exceto textTransform
            if (el.style) {
              const textTransform = el.style.textTransform;
              const borderTop = el.style.borderTop;
              const paddingTop = el.style.paddingTop;
              const marginTop = el.style.marginTop;
              const fontWeight = el.style.fontWeight;

              el.removeAttribute('style');

              // Restaurar apenas os estilos estruturais necessários
              if (textTransform) el.style.textTransform = textTransform;
              if (borderTop) {
                el.style.borderTop = borderTop;
                el.style.paddingTop = paddingTop;
                el.style.marginTop = marginTop;
                el.style.fontWeight = fontWeight;
              }
            }
          });

          return {
            ...block,
            editedHTML: clone.innerHTML
          };
        }
      }
      return block;
    });

    // Gerar HTML final com conteúdo editado
    const printHTML = generatePrintHTML(blocksWithEditedContent);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadPDF = async () => {
    const originalZoom = zoom;
    try {
      setIsGeneratingPDF(true);

      // Salvar zoom atual e resetar para 100% para captura precisa
      setZoom(100);

      // Aguardar um momento para o DOM atualizar com zoom 100%
      await new Promise(resolve => setTimeout(resolve, 300));

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
          onclone: (clonedDoc) => {
            // Garantir que todos os estilos sejam aplicados no clone
            const clonedBlock = clonedDoc.querySelector('.a4-page');
            if (clonedBlock) {
              clonedBlock.style.width = '794px';
              clonedBlock.style.height = '1123px';
              clonedBlock.style.overflow = 'visible';
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
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Por favor, tente novamente.');
      setZoom(originalZoom);
      setPdfProgress({ current: 0, total: 0 });
      setIsGeneratingPDF(false);
    }
  };

  const generatePrintHTML = (blocks) => {
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
              padding-bottom: 4px;
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
          ${blocks.map(block => generateBlockHTML(block)).join('')}
        </body>
      </html>
    `;
  };

  const generateBlockHTML = (block) => {
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
          <h1 style="font-size: ${h1Size}px; line-height: 1.1; margin-bottom: 8px;">${block.title}</h1>
          <div class="subtitle" style="font-size: ${subtitleSize}px; margin-bottom: 16px;">${block.subtitle}</div>
          ${Object.entries(block.items).map(([categoryName, items]) => `
            <div class="category-block" style="margin-bottom: 16px;">
              <h2 style="font-size: ${h2Size}px; margin-bottom: 8px;">${categoryName}</h2>
              ${items.map(item => `
                <div class="item-row" style="margin-bottom: 4px; padding: 2px;">
                  <span class="item-quantity" style="font-size: ${qtySize}px;">${formatQuantityDisplay(item)}</span>
                  <span class="item-name" style="font-size: ${textSize}px;">${item.recipe_name}</span>
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
          <h1 style="font-size: ${h1Size}px; line-height: 1.1; margin-bottom: 8px;">${block.title}</h1>
          <div class="subtitle" style="font-size: ${subtitleSize}px; margin-bottom: 16px;">${block.subtitle}</div>
          ${block.items.map((recipe, idx) => `
            <div class="category-block" style="margin-bottom: 16px;">
              <h2 style="font-size: ${h2Size}px; margin-bottom: 8px; font-weight: bold;">${recipe.recipe_name}</h2>
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
          <h1 style="font-size: ${h1Size}px; line-height: 1.1; margin-bottom: 8px;">${block.title}</h1>
          <div class="subtitle" style="font-size: ${subtitleSize}px; margin-bottom: 16px;">${block.subtitle}</div>
          ${block.items.map((recipe, idx) => `
            <div class="category-block" style="margin-bottom: 16px;">
              <h2 style="font-size: ${h2Size}px; margin-bottom: 8px; font-weight: bold;">${recipe.recipe_name}</h2>
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
      <h1 style="font-size: ${h1Size}px;">${block.title}</h1>
      <div class="subtitle" style="font-size: ${subtitleSize}px;">${block.subtitle}</div>
    </div>`;
  };

  return (
    <div className="print-preview-container">
      {/* Toolbar */}
      <div className="preview-toolbar">
        <div className="toolbar-left">
          <h2 className="text-lg font-bold">Editor de Impressão</h2>
          <span className="text-sm text-gray-600">{editableBlocks.length} blocos</span>
          {hasSavedSizes && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
              ✓ Ajustes salvos
            </span>
          )}
        </div>

        <div className="toolbar-center">
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(50, z - 10))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="zoom-label">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(150, z + 10))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="toolbar-right">
          <Button variant="outline" size="sm" onClick={handleResetFontSizes} title="Resetar todos os tamanhos para os padrões">
            <RefreshCw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isGeneratingPDF ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {pdfProgress.total > 0
                  ? `Gerando ${pdfProgress.current}/${pdfProgress.total}...`
                  : 'Preparando...'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </>
            )}
          </Button>
          <Button onClick={handlePrintFinal} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="sidebar-navigation">
          <div className="sidebar-header">
            <h3 className="text-sm font-bold text-gray-700">Páginas</h3>
            <p className="text-xs text-gray-500 mt-1">Arraste para reordenar</p>
          </div>
          <div className="sidebar-content">
            {editableBlocks.map((block, index) => {
              const status = blockStatus[block.id];
              const isAdjusted = status && !status.isOverflowing;
              const needsFix = status && status.isOverflowing;

              return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => scrollToBlock(block.id)}
                  className={`sidebar-item ${selectedBlock === block.id ? 'active' : ''} ${draggedIndex === index ? 'dragging' : ''}`}
                  style={{ cursor: draggedIndex === index ? 'grabbing' : 'grab' }}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="sidebar-item-number">{index + 1}</div>
                  <div className="sidebar-item-content">
                    <div className="sidebar-item-title">{block.title}</div>
                    <div className="sidebar-item-meta">{block.fontSize}px</div>
                  </div>
                  {needsFix && (
                    <div
                      className="sidebar-badge badge-warning clickable"
                      onClick={(e) => handleFixBlock(block.id, e)}
                      title="Clique para corrigir automaticamente"
                    >
                      Corrigir
                    </div>
                  )}
                  {isAdjusted && (
                    <div className="sidebar-badge badge-success">Ajustado</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview Area */}
        <div ref={previewAreaRef} className="preview-area">
          <div style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            display: 'inline-flex', // inline-flex evita expansão desnecessária
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            minWidth: '794px', // Largura mínima = largura do card A4
            paddingBottom: '20px'
          }}>
            {editableBlocks.map((block, index) => (
              <EditableBlock
                key={block.id}
                block={block}
                isSelected={selectedBlock === block.id}
                onSelect={() => setSelectedBlock(block.id)}
                onFontSizeChange={(delta) => handleFontSizeChange(block.id, delta)}
                onAutoFit={() => handleAutoFit(block.id)}
                onAutoFitComplete={() => handleAutoFitComplete(block.id)}
                onContentEdit={(field, value) => handleContentEdit(block.id, field, value)}
                onStatusUpdate={handleStatusUpdate}
                formatQuantityDisplay={formatQuantityDisplay}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableBlock({ block, isSelected, onSelect, onFontSizeChange, onAutoFit, onAutoFitComplete, onContentEdit, onStatusUpdate, formatQuantityDisplay }) {
  const blockRef = useRef(null);
  const contentRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [numPages, setNumPages] = useState(1);
  const [isAutoFitting, setIsAutoFitting] = useState(false);

  // Função para medir altura com um fontSize específico
  const measureHeight = (fontSize) => {
    if (!contentRef.current) return 0;
    const originalFontSize = contentRef.current.style.fontSize;
    contentRef.current.style.fontSize = `${fontSize}px`;
    const height = contentRef.current.scrollHeight;
    contentRef.current.style.fontSize = originalFontSize;
    return height;
  };

  // Auto-fit: encontrar maior fonte que cabe em 1 página
  useEffect(() => {
    if (block.autoFitting) {
      setIsAutoFitting(true);

      // Cálculo automático baseado em dimensões reais de A4
      const A4_USABLE_HEIGHT = A4_HEIGHT_PX - (PAGE_PADDING_PX * 2); // 1103px
      let bestSize = 8;

      // Busca binária para encontrar o tamanho ideal
      let min = 8;
      let max = 30;

      const findBestSize = () => {
        // Verificar se contentRef está disponível antes de começar
        if (!contentRef.current) {
          console.warn('ContentRef não disponível, aguardando...');
          setTimeout(findBestSize, 200);
          return;
        }

        while (min <= max) {
          const mid = Math.floor((min + max) / 2);
          const height = measureHeight(mid);

          if (height <= A4_USABLE_HEIGHT) {
            bestSize = mid;
            min = mid + 1;
          } else {
            max = mid - 1;
          }
        }

        // Aplicar o melhor tamanho encontrado
        onFontSizeChange(bestSize - block.fontSize);
        setIsAutoFitting(false);
        onAutoFitComplete();
      };

      setTimeout(findBestSize, 300);
    }
  }, [block.autoFitTimestamp]);

  // Detectar overflow
  useEffect(() => {
    if (isAutoFitting) return; // Não recalcular durante auto-fit

    // Forçar recálculo limpo
    setIsOverflowing(false);
    setNumPages(1);

    // Delay para garantir renderização completa após mudança de fonte
    const timer = setTimeout(() => {
      if (contentRef.current) {
        // Cálculo automático baseado em dimensões reais de A4
        const A4_USABLE_HEIGHT = A4_HEIGHT_PX - (PAGE_PADDING_PX * 2); // 1103px

        const contentHeight = contentRef.current.scrollHeight;
        const overflow = contentHeight > A4_USABLE_HEIGHT;
        const pages = Math.ceil(contentHeight / A4_USABLE_HEIGHT);

        console.log(`[${block.id}] Altura: ${contentHeight}px / Limite: ${A4_USABLE_HEIGHT}px (A4 real) / Overflow: ${overflow} / Páginas: ${pages}`);

        setIsOverflowing(overflow);
        setNumPages(pages);

        // Notificar parent component sobre mudança de status
        onStatusUpdate(block.id, overflow, pages);
      }
    }, 250); // Aumentado de 150ms para 250ms para melhor precisão

    return () => clearTimeout(timer);
  }, [block.fontSize, block.id, isAutoFitting]);

  return (
    <div
      id={`block-${block.id}`}
      ref={blockRef}
      className={`editable-block ${isSelected ? 'selected' : ''} ${isOverflowing ? 'overflowing' : ''}`}
      onClick={onSelect}
      style={{ fontSize: `${block.fontSize}px` }}
    >
      {/* Status Badge */}
      <div className="block-status">
        {isOverflowing && (
          <span className="overflow-badge">⚠️ {numPages} páginas</span>
        )}
        <span className="font-badge">{block.fontSize}px</span>
      </div>

      {/* Resize Handle */}
      {isSelected && (
        <div className="resize-controls">
          <Button size="sm" variant="ghost" onClick={() => onFontSizeChange(-1)} title="Diminuir fonte" disabled={isAutoFitting}>
            <span className="text-lg font-bold">A-</span>
          </Button>
          <span className="px-2 text-sm font-semibold text-gray-600">{block.fontSize}px</span>
          <Button size="sm" variant="ghost" onClick={() => onFontSizeChange(1)} title="Aumentar fonte" disabled={isAutoFitting}>
            <span className="text-lg font-bold">A+</span>
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={onAutoFit}
            title="Auto-ajustar: encontra o maior tamanho que cabe em 1 página"
            disabled={isAutoFitting}
            className="ml-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {isAutoFitting ? '...' : 'Auto'}
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="block-content a4-page">
        {/* Wrapper interno para medir altura real do conteúdo */}
        <div ref={contentRef}>
          <h1
            contentEditable={isSelected}
            suppressContentEditableWarning
            onBlur={(e) => onContentEdit('title', e.target.textContent)}
            className="block-title"
          >
            {block.title}
          </h1>

          <div
            contentEditable={isSelected}
            suppressContentEditableWarning
            onBlur={(e) => onContentEdit('subtitle', e.target.textContent)}
            className="block-subtitle"
          >
            {block.subtitle}
          </div>

        {block.type === 'empresa' && block.items && (
          <div className="items-container">
            {Object.entries(block.items).map(([categoryName, items]) => (
              <div key={categoryName} className="category-section">
                <h2
                  className="category-title"
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                >
                  {categoryName}
                </h2>
                {items.map((item, idx) => (
                  <div key={idx} className="item-line">
                    <span
                      className="item-qty"
                      contentEditable={isSelected}
                      suppressContentEditableWarning
                    >
                      {formatQuantityDisplay(item)}
                    </span>
                    <span
                      className="item-text"
                      contentEditable={isSelected}
                      suppressContentEditableWarning
                    >
                      {item.recipe_name}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {block.type === 'detailed-section' && block.items && (
          <div className="items-container">
            {block.items.map((recipe, recipeIdx) => (
              <div key={recipeIdx} className="category-section">
                <h2
                  className="category-title"
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                >
                  {recipe.recipe_name}
                </h2>
                {recipe.clientes.map((cliente, idx) => (
                  <div key={idx} className="item-line">
                    <span
                      className="item-text"
                      style={{ textTransform: 'uppercase' }}
                      contentEditable={isSelected}
                      suppressContentEditableWarning
                    >
                      {cliente.customer_name}
                    </span>
                    <span className="item-qty">→</span>
                    <span
                      className="item-qty"
                      contentEditable={isSelected}
                      suppressContentEditableWarning
                    >
                      {formatQuantityDisplay(cliente)}
                    </span>
                  </div>
                ))}
                {recipe.showTotal && (
                  <div className="item-line" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '8px', marginTop: '8px', fontWeight: 'bold' }}>
                    <span className="item-text">TOTAL:</span>
                    <span className="item-qty"></span>
                    <span
                      className="item-qty"
                      contentEditable={isSelected}
                      suppressContentEditableWarning
                    >
                      {formatQuantityDisplay({ quantity: recipe.total, unit_type: recipe.unit_type })}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {block.type === 'embalagem-category' && block.items && (
          <div className="items-container">
            {block.items.map((recipe, recipeIdx) => (
              <div key={recipeIdx} className="category-section">
                <h2
                  className="category-title"
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                >
                  {recipe.recipe_name}
                </h2>
                {recipe.clientes.map((cliente, idx) => (
                  <div key={idx} className="item-line">
                    <span
                      className="item-text"
                      style={{ textTransform: 'uppercase' }}
                      contentEditable={isSelected}
                      suppressContentEditableWarning
                    >
                      {cliente.customer_name}
                    </span>
                    <span className="item-qty">→</span>
                    <span
                      className="item-qty"
                      contentEditable={isSelected}
                      suppressContentEditableWarning
                    >
                      {formatQuantityDisplay(cliente)}
                    </span>
                  </div>
                ))}
                {recipe.showTotal && (
                  <div className="item-line" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '8px', marginTop: '8px', fontWeight: 'bold' }}>
                    <span className="item-text">TOTAL:</span>
                    <span className="item-qty"></span>
                    <span
                      className="item-qty"
                      contentEditable={isSelected}
                      suppressContentEditableWarning
                    >
                      {formatQuantityDisplay({ quantity: recipe.total, unit_type: recipe.unit_type })}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div> {/* Fecha wrapper de medição de conteúdo */}
      </div>

      {/* Page Overflow Indicator */}
      {isOverflowing && (
        <div className="overflow-indicator">
          Conteúdo continua na próxima página...
        </div>
      )}
    </div>
  );
}
