export const createToastUtils = (toast) => {
  const showError = (message, title = "Erro") => {
    toast({
      variant: "destructive",
      title,
      description: message,
    });
  };

  const showSuccess = (message, title = "Sucesso") => {
    toast({
      title,
      description: message,
    });
  };

  const showWarning = (message, title = "Atenção") => {
    toast({
      variant: "warning",
      title,
      description: message,
    });
  };

  const showInfo = (message, title = "Informação") => {
    toast({
      title,
      description: message,
    });
  };

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
};