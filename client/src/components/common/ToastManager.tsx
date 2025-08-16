import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import ToastContainer from './ToastContainer';

const ToastManager: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return <ToastContainer toasts={toasts} onRemoveToast={removeToast} />;
};

export default ToastManager;