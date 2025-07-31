import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Check } from "lucide-react";

const DiasDaSemana = ({
  availableDays,
  toggleDay
}) => {
  const daysList = [
    { day: 0, label: "Domingo" },
    { day: 1, label: "Segunda" },
    { day: 2, label: "Terça" },
    { day: 3, label: "Quarta" },
    { day: 4, label: "Quinta" },
    { day: 5, label: "Sexta" },
    { day: 6, label: "Sábado" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Dias da Semana Disponíveis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-6">
          Escolha quais dias da semana serão exibidos no cardápio:
        </p>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {daysList.map(({ day, label }) => (
            <button
              key={day}
              type="button"
              className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors min-h-[100px] ${
                availableDays.includes(day)
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
              }`}
              onClick={() => toggleDay(day)}
              disabled={availableDays.length === 1 && availableDays.includes(day)}
            >
              <span className="font-medium text-sm">{label}</span>
              <div className="mt-2 h-5">
                {availableDays.includes(day) && (
                  <Check className="h-5 w-5 text-blue-500" />
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DiasDaSemana;