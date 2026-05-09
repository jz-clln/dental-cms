'use client';

import { createContext, useContext } from 'react';

type ToastFn = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
};

export const ToastContext = createContext<ToastFn>({
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
});

export const useAppToast = () => useContext(ToastContext);