'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomerPortal() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Portal do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Página principal do portal do cliente em desenvolvimento.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}