import { Tooltip } from '../Tooltip';
import { ConflictButtons } from '../ConflictButtons';
import { getConflictLineStyles, getConflictTooltip, shouldShowConflictButtons } from '../../utils/conflictUtils';

/**
 * Componente genérico para renderizar uma linha de item
 * Usado por todos os tipos de blocos (empresa, detailed-section, embalagem-category)
 *
 * @param {Object} props
 * @param {string} props.itemName - Nome do item/receita
 * @param {string} props.clientName - Nome do cliente
 * @param {string} props.displayValue - Valor a exibir (ex: "10 kg")
 * @param {string|null} props.conflictResolution - Status de resolução do conflito
 * @param {boolean} props.hasConflict - Se há conflito ativo
 * @param {boolean} props.edited - Se foi editado manualmente
 * @param {boolean} props.changed - Se mudou no portal
 * @param {Object|null} props.editInfo - Informações de edição
 * @param {Object|null} props.changeInfo - Informações de mudança
 * @param {Function} props.onEditStart - Callback ao iniciar edição
 * @param {Function} props.onEditEnd - Callback ao finalizar edição
 * @param {Function} props.onAcceptPortalChange - Callback ao aceitar mudança do portal
 * @param {Function} props.onRejectPortalChange - Callback ao rejeitar mudança do portal
 * @param {string|null} props.blockTitle - Título do bloco (para blocos tipo empresa)
 * @param {string} props.itemKey - Chave única do item
 * @param {boolean} props.isSelected - Se o bloco está selecionado
 * @param {boolean} props.isLocked - Se está bloqueado para edição
 */
export function ItemLine({
  itemName,
  clientName,
  displayValue,
  conflictResolution,
  hasConflict,
  edited,
  changed,
  editInfo,
  changeInfo,
  onEditStart,
  onEditEnd,
  onAcceptPortalChange,
  onRejectPortalChange,
  blockTitle,
  itemKey,
  isSelected,
  isLocked
}) {
  // Obter estilos e tooltip usando utilitários
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

  const showConflictButtons = shouldShowConflictButtons({
    conflictResolution,
    hasConflict
  });

  return (
    <div
      className="item-line flex items-center justify-between py-1 px-2"
      style={lineStyles}
    >
      <Tooltip content={tooltipContent}>
        <span
          className="item-qty flex-1"
          contentEditable={isSelected && !isLocked && !hasConflict}
          suppressContentEditableWarning
          onFocus={(e) => onEditStart?.(e, itemName, clientName, blockTitle)}
          onBlur={(e) => onEditEnd?.(e, itemName, clientName, 'quantity', blockTitle)}
          style={{
            cursor: isLocked ? 'not-allowed' : (isSelected && !hasConflict ? 'text' : 'default'),
            outline: 'none',
            minWidth: '80px'
          }}
        >
          {displayValue}
        </span>
      </Tooltip>

      {showConflictButtons && changeInfo && (
        <ConflictButtons
          onAccept={() => onAcceptPortalChange?.(
            itemKey,
            `${changeInfo.currentQuantity} ${changeInfo.currentUnit}`,
            changeInfo.currentQuantity,
            changeInfo.currentUnit
          )}
          onReject={() => onRejectPortalChange?.(
            itemKey,
            displayValue
          )}
        />
      )}
    </div>
  );
}
