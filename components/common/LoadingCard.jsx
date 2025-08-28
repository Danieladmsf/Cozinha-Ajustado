import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const LoadingCard = ({ 
  title = "Portal do Cliente", 
  message = "Carregando portal...",
  className = "w-full max-w-md",
  showProgress = false
}) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!showProgress) return;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);
    
    return () => clearInterval(timer);
  }, [showProgress]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className={className}>
        <CardContent className="pt-6 text-center">
          <div className="relative w-36 h-36 mx-auto mb-4 flex items-center justify-center rounded-full border-4 border-orange-400 animate-pulse">
            <img src="/Logo.jpg" alt="Cozinha & Afeto Logo" className="w-32 h-32 rounded-full object-cover" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin"></div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {title}
          </h2>
          <p className="text-gray-600 mb-4">{message}</p>
          
          {showProgress && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
          )}
          
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Conectando...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};