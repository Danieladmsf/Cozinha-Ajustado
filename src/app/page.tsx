"use client";

import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // This ensures the fade-in animation happens only on the client-side after mounting
    // to avoid server-client mismatch issues.
    setIsMounted(true);
  }, []);

  const handleReset = () => {
    // Visually "resets" the canvas by fading it out and in again,
    // providing user feedback for the action.
    setIsMounted(false);
    setTimeout(() => {
      setIsMounted(true);
    }, 500);
  };

  return (
    <TooltipProvider>
      <main
        className={`flex min-h-screen w-full flex-col items-center justify-center bg-background transition-opacity duration-500 ease-in-out ${
          isMounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-6 right-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleReset} aria-label="Reset Canvas">
                <RotateCcw className="h-5 w-5 text-muted-foreground transition-transform hover:rotate-[-45deg]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset Canvas</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </main>
    </TooltipProvider>
  );
}
