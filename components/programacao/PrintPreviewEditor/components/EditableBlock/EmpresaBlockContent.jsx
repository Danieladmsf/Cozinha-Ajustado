import { Tooltip } from '../Tooltip';
import { formatRecipeName } from '../../utils/formatUtils';

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
  getItemChangeInfo
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
            // Verificar estados de edição
            const edited = isItemEdited ? isItemEdited(block.title, item.recipe_name) : false;
            const changed = isItemChanged ? isItemChanged(block.title, item.recipe_name) : false;
            const editInfo = edited && getItemEditInfo ? getItemEditInfo(block.title, item.recipe_name) : null;
            const changeInfo = changed && getItemChangeInfo ? getItemChangeInfo(block.title, item.recipe_name) : null;

            // Determinar classe CSS baseada no estado
            let lineClass = '';
            let lineStyles = {};

            if (edited) {
              // Amarelo: edição manual local
              lineClass = 'state-edited';
              lineStyles = {
                backgroundColor: '#fef3c7',
                borderLeft: '3px solid #f59e0b',
                paddingLeft: '8px',
                borderRadius: '4px'
              };
            } else if (changed) {
              // Verde: edição vinda do portal
              lineClass = 'state-changed';
              lineStyles = {
                backgroundColor: '#d1fae5',
                borderLeft: '3px solid #10b981',
                paddingLeft: '8px',
                borderRadius: '4px'
              };
            }

            // Tooltip para edição manual
            const tooltipContent = edited && editInfo ? (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>📝 Editado Manualmente</div>
                <div>Valor: {editInfo.value}</div>
                <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '4px' }}>
                  {new Date(editInfo.timestamp).toLocaleString('pt-BR')}
                </div>
              </div>
            ) : changed && changeInfo ? (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🌐 Editado no Portal</div>
                <div>Valor: {changeInfo.value}</div>
                <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '4px' }}>
                  Por: {changeInfo.userId}
                </div>
                <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
                  {new Date(changeInfo.timestamp).toLocaleString('pt-BR')}
                </div>
              </div>
            ) : null;

            // Determinar valor a exibir
            // O semáforo já modificou item.quantity se houver edição
            // Apenas formatar o item (que pode ter quantity do Firebase ou da edição)
            const displayValue = formatQuantityDisplay(item);

            return (
              <div
                key={idx}
                className={`item-line ${lineClass}`}
                style={lineStyles}
              >
                {/* Indicador visual de debug para edições do portal */}
                {changed && (
                  <span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '4px' }}>●</span>
                )}
                <Tooltip content={tooltipContent}>
                  <span
                    className="item-qty"
                    contentEditable={isSelected && !isLocked}
                    suppressContentEditableWarning
                    onFocus={(e) => handleEditStart(e, item.recipe_name, null, block.title)}
                    onBlur={(e) => handleEditEnd(e, item.recipe_name, block.title, 'quantity')}
                  >
                    {displayValue}
                  </span>
                </Tooltip>
                <Tooltip content={tooltipContent}>
                  <span
                    className="item-text"
                    contentEditable={isSelected && !isLocked}
                    suppressContentEditableWarning
                    onFocus={(e) => handleEditStart(e, item.recipe_name, null, block.title)}
                    onBlur={(e) => handleEditEnd(e, item.recipe_name, block.title, 'name')}
                  >
                    {formatRecipeName(item.recipe_name)}
                    {item.notes && item.notes.trim() && (
                      <span className="notes" style={{ fontStyle: 'italic', color: '#6b7280', marginLeft: '4px' }}>
                        ({item.notes.trim()})
                      </span>
                    )}
                  </span>
                </Tooltip>
                {/* Indicador de edição manual */}
                {edited && editInfo && (
                  <span className="no-print" style={{ marginLeft: '8px', fontSize: '0.85em', color: '#f59e0b', fontWeight: '600' }}>
                    (editado {new Date(editInfo.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
                {/* Indicador de edição do portal */}
                {changed && changeInfo && (
                  <span className="no-print" style={{ marginLeft: '8px', fontSize: '0.85em', color: '#10b981', fontWeight: '600' }}>
                    (portal {new Date(changeInfo.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
