'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function LinkDisplayModal({ 
  isOpen, 
  onClose, 
  link = '',
  customerName = ''
}) {
  const { toast } = useToast();

  const handleCopyClick = () => {
    const input = document.querySelector('input[readonly]');
    if (input) {
      input.select();
      document.execCommand('copy');
      toast({
        title: "Copiado!",
        description: "Link copiado para a área de transferência.",
      });
      onClose();
    }
  };

  const handleInputClick = (e) => {
    e.target.select();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            <Copy className="w-5 h-5" />
            Link de Cadastro {customerName && `- ${customerName}`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Não foi possível copiar automaticamente. Copie o link abaixo e envie para o cliente:
          </p>
          
          <div className="flex items-center gap-2">
            <Input
              value={link}
              readOnly
              className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              onClick={handleInputClick}
            />
            <Button
              onClick={handleCopyClick}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Instruções para o cliente:</strong>
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 ml-4 list-disc">
              <li>Acesse o link para completar o cadastro</li>
              <li>Após o cadastro, poderá fazer pedidos diretamente</li>
              <li>O link é único e pessoal para este cliente</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}