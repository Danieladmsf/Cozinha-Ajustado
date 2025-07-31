'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export default function SectionContainer({ 
  children, 
  title, 
  subtitle,
  className,
  variant = 'default',
  icon: Icon,
  actions
}) {
  const variants = {
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white border border-gray-200 shadow-md hover:shadow-lg transition-shadow',
    outlined: 'border-2 border-gray-300 bg-gray-50',
    gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm'
  };

  return (
    <div className={cn(
      'rounded-xl overflow-hidden',
      variants[variant],
      className
    )}>
      {(title || actions) && (
        <div className="border-b border-gray-100 bg-gray-50/50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {Icon && (
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                )}
                <div>
                  {title && (
                    <h3 className="text-lg font-semibold text-gray-900">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-sm text-gray-600 mt-1">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              {actions && (
                <div className="flex items-center space-x-2">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

// Componente para seções dentro do container
export function Section({ children, title, className, separator = true }) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <div className={cn(
          'pb-3',
          separator && 'border-b border-gray-200'
        )}>
          <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            {title}
          </h4>
        </div>
      )}
      {children}
    </div>
  );
}