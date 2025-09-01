'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente de botão para atualizar dados.
 * Controlado externamente pelo estado de carregamento e função onClick.
 */
export function RefreshButton({
  className,
  variant = "outline",
  size = "sm",
  showText = true,
  text = "Atualizar",
  isLoading = false,
  onClick,
  ...props
}) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-2",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RotateCcw className="h-4 w-4" />
      )}
      {showText && (
        <span>{isLoading ? "Atualizando..." : text}</span>
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