"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
  DialogPortal,
  DialogOverlay
} from "./dialog"

// Wrapper para DialogContent com descrição automática para acessibilidade
const AccessibleDialogContent = React.forwardRef(({ 
  children, 
  title, 
  description, 
  className,
  ...props 
}, ref) => {
  const [hasExplicitDescription, setHasExplicitDescription] = React.useState(false);
  const descriptionId = React.useId();

  // Verificar se existe uma DialogDescription explícita nos children
  React.useEffect(() => {
    const hasDescription = React.Children.toArray(children).some(child =>
      React.isValidElement(child) && 
      (child.type === DialogDescription || child.props?.className?.includes('dialog-description'))
    );
    setHasExplicitDescription(hasDescription || !!description);
  }, [children, description]);

  return (
    <DialogContent
      ref={ref}
      className={className}
      aria-describedby={hasExplicitDescription ? undefined : descriptionId}
      {...props}
    >
      {children}
      {!hasExplicitDescription && (
        <DialogDescription id={descriptionId} className="sr-only">
          {description || (title ? `Diálogo: ${title}` : "Janela de diálogo interativa")}
        </DialogDescription>
      )}
    </DialogContent>
  );
});

AccessibleDialogContent.displayName = "AccessibleDialogContent";

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  AccessibleDialogContent as DialogContent
};