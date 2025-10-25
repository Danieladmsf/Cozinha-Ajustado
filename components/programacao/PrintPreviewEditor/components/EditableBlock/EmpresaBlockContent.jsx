import { Tooltip } from '../Tooltip';
import { ConflictButtons } from '../ConflictButtons';
import { createItemKey } from '../../utils/itemKeyUtils';
import { formatRecipeName } from '../../utils/formatUtils';
import { getConflictLineStyles, getConflictTooltip } from '../../utils/conflictUtils';

/**
 * Componente de renderização para blocos tipo 'empresa'
 * Exibe itens agrupados por categoria (empresa) com receitas
 */
export function EmpresaBlockContent({
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
      {Object.entries(block.items).map(([categoryName, items]) => (
        <div key={categoryName} className="category-section">
          <h2
            className="category-title"
            contentEditable={isSelected && !isLocked}
            suppressContentEditableWarning
            style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
          >
            {categoryName}
          </h2>
          {items.map((item, idx) => {
            // Normalizar customer_name para garantir consistência
            const normalizedCustomerName = item.customer_name || 'sem_cliente';
            // Para blocos 'empresa', incluir block.title na chave para evitar colisões
            const itemKey = createItemKey(item.recipe_name, normalizedCustomerName, block.title);

            const edited = isItemEdited ? isItemEdited(itemKey) : false;
            // Para blocos 'empresa', usar block.title como clientName na detecção de mudanças
            const changed = isItemChanged ? isItemChanged(item.recipe_name, block.title) : false;
            const editInfo = edited && getItemEditInfo ? getItemEditInfo(itemKey) : null;
            const changeInfo = changed && getItemChangeInfo ? getItemChangeInfo(item.recipe_name, block.title) : null;

            // Detectar CONFLITO (editado manualmente + mudou no portal)
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

            // Determinar valor a exibir (com prioridades)
            let displayValue;
            if (edited && editInfo?.editedValue) {
              // PRIORIDADE 1: Se foi editado manualmente, mostra valor editado
              displayValue = editInfo.editedValue;
            } else if (changed && !edited && changeInfo?.currentQuantity) {
              // PRIORIDADE 2: Se mudou no portal (sem edição manual), mostra novo valor do portal
              displayValue = formatQuantityDisplay({
                quantity: changeInfo.currentQuantity,
                unit_type: changeInfo.currentUnit || item.unit_type
              });
            } else {
              // PRIORIDADE 3: Mostra valor original
              displayValue = formatQuantityDisplay(item);
            }

            return (
              <div
                key={idx}
                className="item-line"
                style={lineStyles}
              >
                <Tooltip content={tooltipContent}>
                  <span
                    className="item-qty"
                    contentEditable={isSelected && !isLocked && !hasConflict}
                    suppressContentEditableWarning
                    onFocus={(e) => handleEditStart(e, item.recipe_name, normalizedCustomerName, block.title)}
                    onBlur={(e) => handleEditEnd(e, item.recipe_name, normalizedCustomerName, 'quantity', block.title)}
                  >
                    {displayValue}
                  </span>
                </Tooltip>
                <Tooltip content={tooltipContent}>
                  <span
                    className="item-text"
                    contentEditable={isSelected && !isLocked && !hasConflict}
                    suppressContentEditableWarning
                    onFocus={(e) => handleEditStart(e, item.recipe_name, normalizedCustomerName, block.title)}
                    onBlur={(e) => handleEditEnd(e, item.recipe_name, normalizedCustomerName, 'name', block.title)}
                  >
                    {formatRecipeName(item.recipe_name)}
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
                      unit_type: changeInfo.currentUnit || item.unit_type
                    })})
                  </span>
                )}
                {/* Botões de resolução de conflito */}
                {hasConflict && !conflictResolution && changeInfo && (
                  <ConflictButtons
                    onAccept={() => acceptPortalChange(
                      itemKey,
                      formatQuantityDisplay({
                        quantity: changeInfo.currentQuantity,
                        unit_type: changeInfo.currentUnit || item.unit_type
                      }),
                      changeInfo.currentQuantity,
                      changeInfo.currentUnit
                    )}
                    onReject={() => rejectPortalChange(itemKey, displayValue)}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
