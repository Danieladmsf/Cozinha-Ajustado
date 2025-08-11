import React from 'react';
import { Loader2, Clock, Calculator, Save } from 'lucide-react';

export function LoadingSpinner({ size = 'default', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

export function LoadingButton({ children, isLoading, loadingText, icon: Icon, ...props }) {
  return (
    <button {...props} disabled={isLoading || props.disabled}>
      <div className="flex items-center gap-2">
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : Icon ? (
          <Icon className="w-4 h-4" />
        ) : null}
        {isLoading && loadingText ? loadingText : children}
      </div>
    </button>
  );
}

export function CalculationLoader({ message = 'Calculando métricas...', showProgress = false }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="relative">
        <Calculator className="w-8 h-8 text-blue-500 mb-3" />
        <div className="absolute -top-1 -right-1">
          <LoadingSpinner size="sm" className="text-blue-600" />
        </div>
      </div>
      <p className="text-blue-700 font-medium mb-2">{message}</p>
      {showProgress && (
        <div className="w-64 bg-blue-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      )}
    </div>
  );
}

export function SavingLoader({ message = 'Salvando receita...', variant = 'default' }) {
  const variants = {
    default: 'bg-green-50 border-green-200 text-green-700',
    compact: 'bg-white border-gray-200 text-gray-600',
    overlay: 'bg-white/90 backdrop-blur-sm border-gray-300 text-gray-700 shadow-lg'
  };

  return (
    <div className={`flex items-center justify-center gap-3 py-4 px-6 border rounded-lg ${variants[variant]}`}>
      <Save className="w-5 h-5" />
      <LoadingSpinner size="sm" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

export function DataLoader({ 
  message = 'Carregando dados...', 
  icon: Icon = Clock,
  variant = 'card',
  size = 'default' 
}) {
  const variants = {
    card: 'bg-gray-50 border border-gray-200 rounded-lg p-6',
    inline: 'bg-gray-100 rounded px-3 py-2',
    minimal: 'py-4'
  };

  const sizes = {
    sm: 'text-sm py-2',
    default: 'text-base py-4',
    lg: 'text-lg py-6'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${variants[variant]}`}>
      <div className="relative mb-3">
        <Icon className="w-6 h-6 text-gray-500" />
        <div className="absolute -bottom-1 -right-1">
          <LoadingSpinner size="sm" className="text-blue-500" />
        </div>
      </div>
      <p className={`text-gray-600 font-medium text-center ${sizes[size]}`}>
        {message}
      </p>
    </div>
  );
}

export function TableRowLoader({ colSpan = 5, message = 'Carregando...' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center">
        <div className="flex items-center justify-center gap-3">
          <LoadingSpinner size="sm" className="text-gray-500" />
          <span className="text-gray-600">{message}</span>
        </div>
      </td>
    </tr>
  );
}

export function SkeletonLoader({ width = '100%', height = '20px', className = '' }) {
  return (
    <div 
      className={`bg-gray-200 animate-pulse rounded ${className}`}
      style={{ width, height }}
    />
  );
}

export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <SkeletonLoader width="80px" height="16px" />
      <SkeletonLoader width="100%" height="40px" />
    </div>
  );
}

export function CardSkeleton({ showHeader = true, lines = 3 }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {showHeader && (
        <div className="mb-4">
          <SkeletonLoader width="200px" height="24px" className="mb-2" />
          <SkeletonLoader width="300px" height="16px" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonLoader 
            key={i} 
            width={`${Math.random() * 30 + 70}%`} 
            height="16px" 
          />
        ))}
      </div>
    </div>
  );
}