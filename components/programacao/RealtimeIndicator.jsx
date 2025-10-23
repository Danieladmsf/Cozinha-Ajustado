'use client';

export const RealtimeIndicator = ({ status }) => {
  const statusConfig = {
    connected: {
      icon: '🟢',
      text: 'Conectado',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    syncing: {
      icon: '🟡',
      text: 'Sincronizando...',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    disconnected: {
      icon: '🔴',
      text: 'Desconectado',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    connecting: {
      icon: '⚪',
      text: 'Conectando...',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  };

  const config = statusConfig[status] || statusConfig.connecting;

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full border
        ${config.bgColor} ${config.borderColor} ${config.color}
        text-sm font-medium transition-all duration-300
      `}
    >
      <span className="animate-pulse">{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
};
