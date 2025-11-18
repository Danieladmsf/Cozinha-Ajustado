import React from 'react';
import { GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
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
  toggleSection
}) {
  // Extrair categorias dos blocos
  const categories = extractCategoriesFromBlocks ? extractCategoriesFromBlocks(blocks) : [];

  return (
    <div className="sidebar-navigation">
      <div className="sidebar-header">
        <h3 className="text-sm font-bold text-gray-700">Páginas</h3>
        <p className="text-xs text-gray-500 mt-1">Arraste para reordenar</p>
      </div>

      <div className="sidebar-content">
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
