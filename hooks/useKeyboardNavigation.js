import { useCallback, useRef, useEffect } from 'react';

export const useKeyboardNavigation = () => {
  const inputsRef = useRef(new Map());
  
  // Registrar um input no mapa de navegação
  const registerInput = useCallback((id, ref) => {
    if (ref) {
      inputsRef.current.set(id, ref);
    } else {
      inputsRef.current.delete(id);
    }
  }, []);

  // Encontrar próximo input
  const findNextInput = useCallback((currentId, direction = 'next') => {
    const inputs = Array.from(inputsRef.current.entries());
    const currentIndex = inputs.findIndex(([id]) => id === currentId);
    
    if (currentIndex === -1) return null;
    
    let nextIndex;
    if (direction === 'next') {
      nextIndex = currentIndex + 1;
      if (nextIndex >= inputs.length) {
        nextIndex = 0; // Volta ao primeiro
      }
    } else if (direction === 'prev') {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        nextIndex = inputs.length - 1; // Vai para o último
      }
    } else if (direction === 'down') {
      // Para navegar para baixo, procurar um input na mesma posição da próxima linha
      // Parseando o ID: qty-categoryIndex-itemIndex, pct-categoryIndex-itemIndex, notes-categoryIndex-itemIndex
      const currentParts = currentId.split('-');
      if (currentParts.length === 3) {
        const [type, categoryIndex, itemIndex] = currentParts;
        const nextItemIndex = parseInt(itemIndex) + 1;
        const nextId = `${type}-${categoryIndex}-${nextItemIndex}`;
        
        // Se encontrou input na linha de baixo, usar ele
        if (inputsRef.current.has(nextId)) {
          return inputsRef.current.get(nextId);
        }
        
        // Se não encontrou, procurar na próxima categoria
        const nextCategoryIndex = parseInt(categoryIndex) + 1;
        const nextCategoryId = `${type}-${nextCategoryIndex}-0`;
        if (inputsRef.current.has(nextCategoryId)) {
          return inputsRef.current.get(nextCategoryId);
        }
      }
      
      // Fallback: próximo input sequencial
      return findNextInput(currentId, 'next');
    } else if (direction === 'up') {
      // Para navegar para cima
      const currentParts = currentId.split('-');
      if (currentParts.length === 3) {
        const [type, categoryIndex, itemIndex] = currentParts;
        const prevItemIndex = parseInt(itemIndex) - 1;
        
        if (prevItemIndex >= 0) {
          const prevId = `${type}-${categoryIndex}-${prevItemIndex}`;
          if (inputsRef.current.has(prevId)) {
            return inputsRef.current.get(prevId);
          }
        }
        
        // Se não encontrou, procurar na categoria anterior
        const prevCategoryIndex = parseInt(categoryIndex) - 1;
        if (prevCategoryIndex >= 0) {
          // Encontrar último item da categoria anterior
          for (let i = 10; i >= 0; i--) { // máximo 10 itens por categoria
            const prevCategoryId = `${type}-${prevCategoryIndex}-${i}`;
            if (inputsRef.current.has(prevCategoryId)) {
              return inputsRef.current.get(prevCategoryId);
            }
          }
        }
      }
      
      // Fallback: input anterior sequencial
      return findNextInput(currentId, 'prev');
    }
    
    return inputs[nextIndex] ? inputs[nextIndex][1] : null;
  }, []);

  // Número de colunas por linha (pode ser configurável)
  const getColumnsPerRow = () => {
    // Para as tabelas de receitas, geralmente temos 2-3 inputs por linha
    // (quantidade, porcentagem, observações)
    return 3;
  };

  // Handler para navegação com teclado
  const handleKeyDown = useCallback((e, inputId) => {
    let nextInput = null;
    
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        nextInput = findNextInput(inputId, 'down');
        break;
      case 'Tab':
        if (e.shiftKey) {
          e.preventDefault();
          nextInput = findNextInput(inputId, 'prev');
        } else {
          e.preventDefault();
          nextInput = findNextInput(inputId, 'next');
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        nextInput = findNextInput(inputId, 'down');
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextInput = findNextInput(inputId, 'up');
        break;
      case 'ArrowRight':
        // Só navega se o cursor está no final do input
        if (e.target.selectionStart === e.target.value.length) {
          e.preventDefault();
          nextInput = findNextInput(inputId, 'next');
        }
        break;
      case 'ArrowLeft':
        // Só navega se o cursor está no início do input
        if (e.target.selectionStart === 0) {
          e.preventDefault();
          nextInput = findNextInput(inputId, 'prev');
        }
        break;
    }
    
    if (nextInput) {
      nextInput.focus();
      // Selecionar todo o texto para facilitar edição
      nextInput.select();
    }
  }, [findNextInput]);

  return {
    registerInput,
    handleKeyDown
  };
};