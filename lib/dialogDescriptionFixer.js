// Utilitário para adicionar descrições automáticas aos diálogos sem descrição

export const addDialogDescriptions = () => {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return;
  }

  // Aguardar DOM estar carregado
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Procurar por elementos dialog sem aria-describedby
          const dialogs = node.querySelectorAll ? 
            node.querySelectorAll('[role="dialog"]:not([aria-describedby])') : 
            [];
          
          dialogs.forEach((dialog) => {
            // Verificar se já tem uma descrição
            const hasDescription = dialog.querySelector('.dialog-description');
            
            if (!hasDescription) {
              // Criar descrição invisível
              const description = document.createElement('div');
              description.className = 'sr-only dialog-description';
              description.id = `dialog-desc-${Math.random().toString(36).substr(2, 9)}`;
              description.textContent = 'Janela de diálogo interativa';
              
              // Adicionar ao diálogo
              dialog.appendChild(description);
              dialog.setAttribute('aria-describedby', description.id);
            }
          });
        }
      });
    });
  });

  // Observar mudanças no DOM
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Limpar após 30 segundos (evitar vazamentos de memória)
  setTimeout(() => {
    observer.disconnect();
  }, 30000);
};

// CSS para sr-only
export const addSROnlyStyles = () => {
  if (typeof window === 'undefined' || document.querySelector('#sr-only-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sr-only-styles';
  style.textContent = `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `;
  document.head.appendChild(style);
};