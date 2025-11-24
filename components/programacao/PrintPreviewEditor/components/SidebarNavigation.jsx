import React from 'react';
import { GripVertical, ChevronDown, ChevronRight, ArrowLeft, ChevronLeft, ChevronRight as ChevronRightNav, X, Download, Printer, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { formatRecipeName } from '../utils/formatUtils';

/**
 * Componente de navegação lateral do Editor de Impressão
 * Permite arrastar blocos e categorias para reordenar
 */
export function SidebarNavigation({
  blocks,
  selectedBlock,
  blockStatus,
  draggedIndex,
  // Handlers de blocos
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  scrollToBlock,
  handleFixBlock,
  handleDuplicateBlock,
  handleDeleteBlock,
  // Props de categorias
  categoryOrder,
  draggedCategoryIndex,
  handleCategoryDragStart,
  handleCategoryDragOver,
  handleCategoryDrop,
  handleCategoryDragEnd,
  extractCategoriesFromBlocks,
  // Estados de expansão
  expandedSections,
  toggleSection,
  // Props de controle
  onClose,
  totalEdits,
  handleClearAllEdits,
  handleDownloadPDF,
  handlePrintFinal,
  isGeneratingPDF,
  weekDays,
  selectedDay,
  onDayChange,
  weekNumber,
  year,
  onWeekNavigate
}) {
  // Extrair categorias dos blocos
  const categories = extractCategoriesFromBlocks ? extractCategoriesFromBlocks(blocks) : [];

  return (
    <div className="sidebar-navigation">
      {/* Painel de Controles */}
      <div style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
        {/* Linha de Controles: ← Editor(20) | Limpar | PDF | Print */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '11px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            title="Voltar"
            style={{ height: '28px', width: '28px', padding: 0, flexShrink: 0 }}
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} />
          </Button>
          <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
            Editor{totalEdits > 0 && `(${totalEdits})`}
          </span>
          <span style={{ color: '#cbd5e1', margin: '0 2px' }}>|</span>
          {totalEdits > 0 && (
            <>
              <button
                onClick={handleClearAllEdits}
                title="Limpar edições"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '0',
                  whiteSpace: 'nowrap'
                }}
              >
                Limpar
              </button>
              <span style={{ color: '#cbd5e1', margin: '0 2px' }}>|</span>
            </>
          )}
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            title="Baixar PDF"
            style={{
              background: 'none',
              border: 'none',
              color: '#059669',
              fontWeight: '600',
              cursor: isGeneratingPDF ? 'not-allowed' : 'pointer',
              padding: '0',
              opacity: isGeneratingPDF ? 0.5 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            PDF
          </button>
          <span style={{ color: '#cbd5e1', margin: '0 2px' }}>|</span>
          <button
            onClick={handlePrintFinal}
            title="Imprimir"
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '0',
              whiteSpace: 'nowrap'
            }}
          >
            Print
          </button>
        </div>

        {/* Indicador de Geração de PDF */}
        {isGeneratingPDF && (
          <div style={{
            backgroundColor: '#d1fae5',
            border: '1px solid #059669',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <RefreshCw style={{
              width: '14px',
              height: '14px',
              color: '#059669',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#047857' }}>
              Gerando PDF...
            </span>
          </div>
        )}

        {/* Navegação de Dias */}
        {weekDays && weekDays.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            {/* Navegação Semana */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '10px' }}>
              <button
                onClick={() => onWeekNavigate && onWeekNavigate(-1)}
                className="nav-button"
                style={{
                  height: '28px',
                  width: '28px',
                  padding: 0,
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                }}
              >
                <ChevronLeft style={{ width: '16px', height: '16px' }} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', minWidth: '90px', textAlign: 'center' }}>
                Semana {weekNumber}/{year}
              </span>
              <button
                onClick={() => onWeekNavigate && onWeekNavigate(1)}
                className="nav-button"
                style={{
                  height: '28px',
                  width: '28px',
                  padding: 0,
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                }}
              >
                <ChevronRightNav style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Lista de Dias */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {weekDays.map((day, index) => {
                const isSelected = selectedDay === day.dayNumber;
                return (
                  <React.Fragment key={day.dayNumber}>
                    <button
                      onClick={() => onDayChange && onDayChange(day.dayNumber)}
                      title={day.fullDate}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#2563eb' : 'transparent',
                        color: isSelected ? 'white' : '#475569',
                        transition: 'all 0.2s',
                        minWidth: '45px'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                          e.currentTarget.style.color = '#1e293b';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#475569';
                        }
                      }}
                    >
                      {day.dayDate}
                    </button>
                    {index < weekDays.length - 1 && (
                      <span style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '300' }}>|</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-content" style={{ paddingTop: '8px' }}>
        {/* Seção de Blocos */}
        <div className="sidebar-section">
          <div
            className="sidebar-section-header"
            onClick={() => toggleSection && toggleSection('blocks')}
          >
            {expandedSections?.blocks !== false ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="text-xs font-semibold text-gray-600 uppercase">
              Blocos ({blocks.length})
            </span>
          </div>

          {expandedSections?.blocks !== false && (
            <div className="sidebar-items">
              {Array.isArray(blocks) && blocks.map((block, index) => {
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
                      <div className="sidebar-item-title">{formatRecipeName(block.title)}</div>
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
                    {/* Botões de ação para todos os blocos */}
                    <div className="sidebar-item-actions" style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                      {/* Botão de duplicar: aparece APENAS em blocos originais */}
                      {!block.isDuplicated && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateBlock && handleDuplicateBlock(block.id);
                          }}
                          title="Duplicar card"
                          className="action-button duplicate-button"
                          style={{
                            padding: '4px',
                            border: 'none',
                            background: '#10b981',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#059669';
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#10b981';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <Plus style={{ width: '14px', height: '14px' }} />
                        </button>
                        )}
                        {/* Botão de excluir: aparece APENAS em blocos duplicados */}
                        {block.isDuplicated && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Tem certeza que deseja excluir o card "${block.title}"?`)) {
                                handleDeleteBlock && handleDeleteBlock(block.id);
                              }
                            }}
                            title="Excluir card"
                            className="action-button delete-button"
                            style={{
                              padding: '4px',
                              border: 'none',
                              background: '#ef4444',
                              color: 'white',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#dc2626';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#ef4444';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <Trash2 style={{ width: '14px', height: '14px' }} />
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Seção de Categorias */}
        {categories.length > 0 && (
          <div className="sidebar-section mt-4">
            <div
              className="sidebar-section-header"
              onClick={() => toggleSection && toggleSection('categories')}
            >
              {expandedSections?.categories !== false ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <span className="text-xs font-semibold text-gray-600 uppercase">
                Ordem das Categorias
              </span>
            </div>

            {expandedSections?.categories !== false && (
              <div className="sidebar-items category-items">
                <p className="text-xs text-gray-400 px-3 py-1 italic">
                  Arraste para reordenar nos cards
                </p>
                {categories.map((category, index) => (
                  <div
                    key={category}
                    draggable
                    onDragStart={(e) => handleCategoryDragStart(e, index)}
                    onDragOver={handleCategoryDragOver}
                    onDrop={(e) => handleCategoryDrop(e, index)}
                    onDragEnd={handleCategoryDragEnd}
                    className={`sidebar-category-item ${draggedCategoryIndex === index ? 'dragging' : ''}`}
                    style={{ cursor: draggedCategoryIndex === index ? 'grabbing' : 'grab' }}
                  >
                    <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="category-name">{category}</span>
                    <span className="category-index">{index + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
