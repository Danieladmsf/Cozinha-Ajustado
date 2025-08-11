'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente de botão para atualizar página completa
 * Força recarregamento total da página incluindo todas as tabs e abas
 */
export function RefreshButton({ 
  className,
  variant = "outline",
  size = "sm",
  showText = true,
  text = "Atualizar",
  ...props 
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Force complete page reload
    window.location.reload(true);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={cn(
        "flex items-center gap-2",
        className
      )}
      {...props}
    >
      {isRefreshing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RotateCcw className="h-4 w-4" />
      )}
      {showText && (
        <span>{isRefreshing ? "Atualizando..." : text}</span>
      )}
    </Button>
  );
}

/**
 * Versão compacta do botão (só ícone)
 */
export function RefreshButtonCompact({ className, ...props }) {
  return (
    <RefreshButton
      showText={false}
      size="sm"
      variant="ghost"
      className={cn("w-8 h-8 p-0", className)}
      {...props}
    />
  );
}

export default RefreshButton;