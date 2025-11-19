import { Tooltip } from '../Tooltip';
import { formatRecipeName } from '../../utils/formatUtils';

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
            // Verificar estados de edição
            const edited = isItemEdited ? isItemEdited(cliente.customer_name, recipe.recipe_name) : false;
            const changed = isItemChanged ? isItemChanged(cliente.customer_name, recipe.recipe_name) : false;
            const editInfo = edited && getItemEditInfo ? getItemEditInfo(cliente.customer_name, recipe.recipe_name) : null;
            const changeInfo = changed && getItemChangeInfo ? getItemChangeInfo(cliente.customer_name, recipe.recipe_name) : null;

            // Verificar conflito
            const conflict = getResolutionStatus ? getResolutionStatus(cliente.customer_name, recipe.recipe_name) : null;

            // Determinar classe CSS baseada no estado
            let lineClass = '';
            let lineStyles = {};

            if (conflict) {
              // Vermelho: conflito entre edição manual e portal
              lineClass = 'state-conflict';
              lineStyles = {
                backgroundColor: '#fee2e2',
                borderLeft: '3px solid #ef4444',
                paddingLeft: '8px',
                borderRadius: '4px'
              };
            } else if (edited) {
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

            // Tooltip para edição
            const tooltipContent = conflict ? (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#ef4444' }}>⚠️ Conflito de Edição</div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Sua edição:</strong> {conflict.localEdit.value}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Portal:</strong> {conflict.portalEdit.value}
                </div>
                <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
                  Escolha qual manter usando os botões
                </div>
              </div>
            ) : edited && editInfo ? (
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

            return (
              <div
                key={idx}
                className={`item-line ${lineClass}`}
                style={lineStyles}
              >
                {/* Indicador visual de debug para conflitos */}
                {conflict && (
                  <span style={{ color: '#ef4444', fontWeight: 'bold', marginRight: '4px' }}>⚠</span>
                )}
                {/* Indicador visual de debug para edições do portal */}
                {!conflict && changed && (
                  <span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '4px' }}>●</span>
                )}
                <Tooltip content={tooltipContent}>
                  <span
                    className="item-text"
                    style={{ textTransform: 'uppercase' }}
                    contentEditable={isSelected && !isLocked}
                    suppressContentEditableWarning
                    onFocus={(e) => handleEditStart(e, recipe.recipe_name, cliente.customer_name)}
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
                    onFocus={(e) => handleEditStart(e, recipe.recipe_name, cliente.customer_name)}
                    onBlur={(e) => handleEditEnd(e, recipe.recipe_name, cliente.customer_name, 'quantity')}
                  >
                    {formatQuantityDisplay(cliente)}
                    {cliente.notes && cliente.notes.trim() && (
                      <span className="notes" style={{ fontStyle: 'italic', color: '#6b7280', marginLeft: '4px' }}>
                        ({cliente.notes.trim()})
                      </span>
                    )}
                  </span>
                </Tooltip>
                {/* Indicador de edição manual */}
                {!conflict && edited && editInfo && (
                  <span className="no-print" style={{ marginLeft: '8px', fontSize: '0.85em', color: '#f59e0b', fontWeight: '600' }}>
                    (editado {new Date(editInfo.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
                {/* Indicador de edição do portal */}
                {!conflict && changed && changeInfo && (
                  <span className="no-print" style={{ marginLeft: '8px', fontSize: '0.85em', color: '#10b981', fontWeight: '600' }}>
                    (portal {new Date(changeInfo.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
                {/* Botões de resolução de conflito */}
                {conflict && (
                  <span className="no-print" style={{ marginLeft: '8px', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75em', color: '#6b7280', marginRight: '4px' }}>
                      Local: {conflict.localEdit.value} | Portal: {conflict.portalEdit.value}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rejectPortalChange && rejectPortalChange(cliente.customer_name, recipe.recipe_name);
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7em',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                      title="Manter sua edição local"
                    >
                      Local ✓
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        acceptPortalChange && acceptPortalChange(cliente.customer_name, recipe.recipe_name);
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7em',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                      title="Aceitar valor do Portal"
                    >
                      Portal ✓
                    </button>
                  </span>
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
                {recipe.totalFormatted || formatQuantityDisplay({ quantity: recipe.total, unit_type: recipe.unit_type })}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
