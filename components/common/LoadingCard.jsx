import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const LoadingCard = ({ 
  title = "Portal do Cliente", 
  message = "Carregando portal...",
  className = "w-full max-w-md"
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className={className}>
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {title}
          </h2>
          <p className="text-gray-600">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
};