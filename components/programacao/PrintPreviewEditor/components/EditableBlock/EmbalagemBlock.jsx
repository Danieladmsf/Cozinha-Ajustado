import { Tooltip } from '../Tooltip';
import { ConflictButtons } from '../ConflictButtons';
import { ChangeTimestamp } from '../ChangeTimestamp';
import { createItemKey } from '../../utils/itemKeyUtils';
import { formatRecipeName } from '../../utils/formatUtils';
import { getConflictLineStyles, getConflictTooltip } from '../../utils/conflictUtils';

/**
 * Componente de renderização para blocos tipo 'embalagem-category'
 * Exibe categorias de embalagem com lista de clientes e quantidades
 */
export function EmbalagemBlock({
  block,
  isSelected,
  isLocked,
  handleEditStart,
  handleEditEnd,
  formatQuantityDisplay,
  isItemEdited,
  getItemEditInfo,
  isItemChanged,
  getItemChangeInfo,
  acceptPortalChange,
  rejectPortalChange,
  getResolutionStatus
}) {
  if (!block.items) return null;

  return (
    <div className="items-container">
      {block.items.map((recipe, recipeIdx) => (
        <div key={recipeIdx} className="category-section">
          <h2
            className="category-title"
            contentEditable={isSelected && !isLocked}
            suppressContentEditableWarning
            style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
          >
            {formatRecipeName(recipe.recipe_name)}
          </h2>
          {recipe.clientes.map((cliente, idx) => {
            const itemKey = createItemKey(recipe.recipe_name, cliente.customer_name);
            const edited = isItemEdited && isItemEdited(itemKey);
            const changed = isItemChanged && isItemChanged(recipe.recipe_name, cliente.customer_name);
            const editInfo = edited && getItemEditInfo ? getItemEditInfo(itemKey) : null;
            const changeInfo = changed && getItemChangeInfo ? getItemChangeInfo(recipe.recipe_name, cliente.customer_name) : null;

            const hasConflict = edited && changed;
            const conflictResolution = getResolutionStatus ? getResolutionStatus(itemKey) : null;

            // Usar utilitários para obter estilos e tooltip
            const lineStyles = getConflictLineStyles({
              conflictResolution,
              hasConflict,
              edited,
              changed
            });

            const tooltipContent = getConflictTooltip({
              conflictResolution,
              hasConflict,
              edited,
              changed,
              editInfo,
              changeInfo
            });

            return (
              <div
                key={idx}
                className="item-line"
                style={lineStyles}
              >
                <Tooltip content={tooltipContent}>
                  <span
                    className="item-text"
                    style={{ textTransform: 'uppercase' }}
                    contentEditable={isSelected && !isLocked}
                    suppressContentEditableWarning
                    onFocus={(e) => handleEditStart(e, itemKey)}
                    onBlur={(e) => handleEditEnd(e, recipe.recipe_name, cliente.customer_name, 'customer')}
                  >
                    {cliente.customer_name}
                  </span>
                </Tooltip>
                <span className="item-qty">→</span>
                <Tooltip content={tooltipContent}>
                  <span
                    className="item-qty"
                    contentEditable={isSelected && !isLocked}
                    suppressContentEditableWarning
                    onFocus={(e) => handleEditStart(e, itemKey)}
                    onBlur={(e) => handleEditEnd(e, recipe.recipe_name, cliente.customer_name, 'quantity')}
                  >
                    {formatQuantityDisplay(cliente)}
                  </span>
                </Tooltip>
                {/* Valor do portal entre parênteses (em caso de conflito não resolvido) */}
                {hasConflict && !conflictResolution && changeInfo?.currentQuantity && (
                  <span className="portal-value no-print" style={{
                    marginLeft: '8px',
                    color: '#6b7280',
                    fontSize: '0.95em'
                  }}>
                    ({formatQuantityDisplay({
                      quantity: changeInfo.currentQuantity,
                      unit_type: changeInfo.currentUnit || cliente.unit_type
                    })})
                  </span>
                )}
                {/* Timestamp para mudanças do portal (não conflito) */}
                {!hasConflict && changed && changeInfo?.detectedAt && (
                  <ChangeTimestamp timestamp={changeInfo.detectedAt} />
                )}
                {/* Botões de resolução de conflito */}
                {hasConflict && !conflictResolution && changeInfo && (
                  <ConflictButtons
                    onAccept={() => acceptPortalChange(
                      itemKey,
                      formatQuantityDisplay({
                        quantity: changeInfo.currentQuantity,
                        unit_type: changeInfo.currentUnit || cliente.unit_type
                      }),
                      changeInfo.currentQuantity,
                      changeInfo.currentUnit
                    )}
                    onReject={() => rejectPortalChange(itemKey, formatQuantityDisplay(cliente))}
                  />
                )}
              </div>
            );
          })}
          {recipe.showTotal && (
            <div className="item-line" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '8px', marginTop: '8px', fontWeight: 'bold' }}>
              <span className="item-text">TOTAL:</span>
              <span className="item-qty">→</span>
              <span
                className="item-qty"
                contentEditable={isSelected && !isLocked}
                suppressContentEditableWarning
                style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
              >
                {formatQuantityDisplay({ quantity: recipe.total, unit_type: recipe.unit_type })}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
