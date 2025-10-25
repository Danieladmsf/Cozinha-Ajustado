import { useState } from 'react';

/**
 * Componente Tooltip para mostrar informações de edição
 * @param {Object} props
 * @param {React.ReactNode} props.children - Elemento que ativa o tooltip
 * @param {string|null} props.content - Conteúdo a mostrar no tooltip
 */
export function Tooltip({ children, content }) {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) return children;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-sm whitespace-nowrap" style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' }}>
          {content}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45" style={{ bottom: '-4px', left: '50%', marginLeft: '-4px' }}></div>
        </div>
      )}
    </div>
  );
}
