/**
 * Componente de botões de resolução de conflito
 * @param {Object} props
 * @param {Function} props.onAccept - Callback ao aceitar mudança do portal
 * @param {Function} props.onReject - Callback ao rejeitar mudança (manter edição)
 */
export function ConflictButtons({ onAccept, onReject }) {
  return (
    <div className="conflict-buttons no-print" style={{
      display: 'inline-flex',
      gap: '4px',
      marginLeft: '8px',
      verticalAlign: 'middle'
    }}>
      <button
        onClick={onAccept}
        className="conflict-btn accept"
        title="Aceitar mudança do portal"
        style={{
          background: '#9333ea',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          width: '24px',
          height: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        ✓
      </button>
      <button
        onClick={onReject}
        className="conflict-btn reject"
        title="Manter edição manual"
        style={{
          background: '#f97316',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          width: '24px',
          height: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        ✗
      </button>
    </div>
  );
}
