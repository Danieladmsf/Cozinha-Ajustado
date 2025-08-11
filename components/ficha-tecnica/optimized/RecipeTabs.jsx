import React from 'react';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, CookingPot, ClipboardList } from "lucide-react";
import PreparationCard from './PreparationCard';

const RecipeTabs = ({
  activeTab,
  onTabChange,
  preparations,
  onOpenProcessModal,
  ...rest // Pass down all other props for PreparationCard
}) => {
  return (
    <Card className="bg-white shadow-sm border">
      <Tabs
        value={activeTab}
        onValueChange={onTabChange}
        className="w-full"
      >
        <div className="border-b border-gray-200 px-6 pt-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100">
            <TabsTrigger
              value="ficha-tecnica"
              className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Ficha Técnica
            </TabsTrigger>
            <TabsTrigger
              value="pre-preparo"
              className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm"
            >
              <CookingPot className="h-4 w-4 mr-2" />
              Pré Preparo
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="ficha-tecnica" className="p-6 space-y-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              onClick={onOpenProcessModal}
              variant="outline"
              className="border-dashed hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Processo
            </Button>
          </div>

          <div className="space-y-6">
            {preparations.length === 0 ? (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center">
                <div className="flex flex-col items-center gap-3">
                  <CookingPot className="h-10 w-10 text-blue-500" />
                  <h3 className="text-lg font-medium text-blue-800">Comece sua ficha técnica</h3>
                  <p className="text-blue-600 max-w-md mx-auto">
                    Para iniciar, adicione um novo processo utilizando o botão acima.
                  </p>
                </div>
              </div>
            ) : (
              preparations.map((prep, index) => (
                <PreparationCard key={prep.id} prep={prep} index={index} {...rest} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pre-preparo" className="p-6 bg-gray-50 rounded-b-lg">
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-100 text-center">
            <div className="flex flex-col items-center gap-3">
              <CookingPot className="h-10 w-10 text-purple-500" />
              <h3 className="text-lg font-medium text-purple-800">Seção de Pré Preparo</h3>
              <p className="text-purple-600 max-w-md mx-auto">
                Configure os ingredientes e processos de pré preparo para suas receitas.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default React.memo(RecipeTabs);
