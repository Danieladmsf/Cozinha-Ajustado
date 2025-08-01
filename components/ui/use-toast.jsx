"use client";

// Inspired by react-hot-toast library
import { useState, useEffect, createContext, useContext } from "react";

const TOAST_LIMIT = 20;
const TOAST_REMOVE_DELAY = 3000; // 3 segundos (padrão)

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const toastTimeouts = new Map();

const addToRemoveQueue = (toastId, customDuration) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const delay = customDuration || TOAST_REMOVE_DELAY;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    });
  }, delay);

  toastTimeouts.set(toastId, timeout);
};

const clearFromRemoveQueue = (toastId) => {
  const timeout = toastTimeouts.get(toastId);
  if (timeout) {
    clearTimeout(timeout);
    toastTimeouts.delete(toastId);
  }
};

export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        const toast = state.toasts.find(t => t.id === toastId);
        addToRemoveQueue(toastId, toast?.duration);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id, toast.duration);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners = [];

let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function toast({ ...props }) {
  const id = genId();

  const update = (props) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    });

  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  // Determinar duração automática baseada no tipo/conteúdo
  let autoDuration;
  if (props.duration !== undefined) {
    // Duração explícita fornecida
    autoDuration = props.duration;
  } else if (props.variant === "destructive") {
    // Erros ficam mais tempo para serem lidos
    autoDuration = 4000; // 4 segundos
  } else if (props.title && (
    props.title.toLowerCase().includes("sucesso") ||
    props.title.toLowerCase().includes("salvo") ||
    props.title.toLowerCase().includes("copiado") ||
    props.title.toLowerCase().includes("criado") ||
    props.title.toLowerCase().includes("atualizado") ||
    props.title.toLowerCase().includes("removido") ||
    props.title.toLowerCase().includes("excluído")
  )) {
    // Mensagens de sucesso rápidas
    autoDuration = 2000; // 2 segundos
  } else if (props.description && (
    props.description.toLowerCase().includes("sucesso") ||
    props.description.toLowerCase().includes("salvo") ||
    props.description.toLowerCase().includes("copiado") ||
    props.description.toLowerCase().includes("criado") ||
    props.description.toLowerCase().includes("atualizado") ||
    props.description.toLowerCase().includes("removido") ||
    props.description.toLowerCase().includes("excluído")
  )) {
    // Mensagens de sucesso rápidas (na descrição)
    autoDuration = 2000; // 2 segundos
  } else {
    // Duração padrão para outros casos
    autoDuration = 3000; // 3 segundos
  }

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      duration: autoDuration,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  // Auto-dismiss
  setTimeout(() => {
    dismiss();
  }, autoDuration);

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast }; 