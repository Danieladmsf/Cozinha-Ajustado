'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { User, Loader2 } from 'lucide-react';

export default function CreateLinkModal({ 
  isOpen, 
  onClose, 
  onCreateLink, 
  isLoading = false 
}) {
  const [customerName, setCustomerName] = useState('');

  const handleSubmit = async () => {
    if (!customerName.trim()) return;
    
    const result = await onCreateLink(customerName.trim());
    
    // Se criou com sucesso e não precisa de cópia manual, fechar modal
    if (result && !result.needsManualCopy) {
      handleClose();
    }
  };

  const handleClose = () => {
    setCustomerName('');
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && customerName.trim() && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px] dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            <User className="w-5 h-5" />
            Criar Link de Cadastro
          </DialogTitle>
          <DialogDescription>
            Crie um link personalizado para que o cliente possa se cadastrar no sistema
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Digite o nome do cliente para criar o link de cadastro:
          </p>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nome do cliente"
            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            O cliente receberá um link para completar o cadastro e fazer pedidos.
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
            className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={!customerName.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Link'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}