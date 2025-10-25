/**
 * Componente de timestamp para mudanças do portal
 * @param {Object} props
 * @param {string} props.timestamp - Timestamp ISO da mudança
 * @param {string} props.color - Cor do texto (padrão: verde)
 */
export function ChangeTimestamp({ timestamp, color = '#10b981' }) {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <span className="change-timestamp no-print" style={{
      fontSize: '0.85em',
      color: color,
      marginLeft: '8px',
      fontWeight: '600'
    }}>
      ({formattedTime} {formattedDate})
    </span>
  );
}
