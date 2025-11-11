import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
  Clock,
  Calendar,
  DollarSign,
  Target,
  Activity,
  RefreshCw,
  Package,
  Tag,
  Users
} from "lucide-react";
import { usePriceAnalytics } from "@/hooks/ingredientes/usePriceAnalytics";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PriceHistoryViewer({ 
  ingredient, 
  isOpen, 
  onClose,
  onRefresh 
}) {
  const {
    priceHistory,
    loading,
    loadPriceHistory,
    analyzePriceTrends,
    projectFuturePrice,
    detectPriceAlerts,
    compareWithAverage
  } = usePriceAnalytics();

  const [analysis, setAnalysis] = useState(null);
  const [projection, setProjection] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    if (isOpen && ingredient) {
      loadData();
    }
  }, [isOpen, ingredient]);

  const loadData = async () => {
    if (!ingredient?.id) return;

    const history = await loadPriceHistory(ingredient.id);
    
    if (history.length > 0) {
      const analysisResult = analyzePriceTrends(history);
      const projectionResult = projectFuturePrice(history, 30);
      const alertsResult = detectPriceAlerts(history);
      const comparisonResult = compareWithAverage(ingredient.current_price || 0, history);

      setAnalysis(analysisResult);
      setProjection(projectionResult);
      setAlerts(alertsResult);
      setComparison(comparisonResult);
    }
  };

  const handleRefresh = async () => {
    await loadData();
    if (onRefresh) onRefresh();
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'high_volatility': return <Activity className="w-4 h-4" />;
      case 'sudden_change': return <AlertTriangle className="w-4 h-4" />;
      case 'strong_trend': return <TrendingUp className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getChangeDescription = (record) => {
    const oldPrice = parseFloat(record.old_price) || 0;
    const newPrice = parseFloat(record.new_price) || 0;
    const hasSupplier = record.supplier;
    const hasBrand = record.brand;
    const changeType = record.change_type;
    
    let description = [];

    // Mudança de preço
    if (Math.abs(newPrice - oldPrice) >= 0.01) {
      description.push(`${oldPrice.toFixed(2)} → ${newPrice.toFixed(2)}`);
    }

    // Informações de fornecedor e marca
    if (hasSupplier) {
      description.push(`${hasSupplier}`);
    }
    if (hasBrand) {
      description.push(`${hasBrand}`);
    }

    // Tipo de mudança específica
    if (changeType === 'supplier_change') {
      description.push('Troca de fornecedor');
    } else if (changeType === 'brand_change') {
      description.push('Troca de marca');
    } else if (changeType === 'supplier_brand_change') {
      description.push('Troca de fornecedor e marca');
    }
    
    return description.length > 0 ? description.join(' • ') : 'Atualização';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-800">
                  Histórico e Projeções de Preços
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {ingredient?.name}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="rounded-lg"
              >
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
              <p className="text-slate-600">Carregando dados...</p>
            </div>
          ) : priceHistory.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Nenhum histórico de preços encontrado para este ingrediente.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Alertas */}
              {alerts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Alertas e Recomendações
                  </h3>
                  {alerts.map((alert, index) => (
                    <Alert 
                      key={index}
                      className={`border-l-4 ${
                        alert.severity === 'warning' ? 'border-l-orange-500 bg-orange-50' :
                        alert.severity === 'info' ? 'border-l-blue-500 bg-blue-50' :
                        'border-l-gray-500 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <AlertDescription className="font-medium mb-1">
                            {alert.message}
                          </AlertDescription>
                          <p className="text-sm text-slate-600">
                            {alert.recommendation}
                          </p>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Análise de Tendências */}
              {analysis && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                        {getTrendIcon(analysis.trend)}
                        Tendência Geral
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-blue-800 mb-1">
                        {analysis.percentTotalChange > 0 ? '+' : ''}
                        {analysis.percentTotalChange.toFixed(1)}%
                      </div>
                      <p className="text-xs text-blue-600">
                        Baseado em {priceHistory.length} registros
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Volatilidade
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-purple-800 mb-1">
                        {analysis.volatility.toFixed(1)}%
                      </div>
                      <p className="text-xs text-purple-600">
                        {analysis.volatility < 5 ? 'Baixa' : 
                         analysis.volatility < 15 ? 'Média' : 'Alta'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Variação Média
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold text-green-800 mb-1">
                        {analysis.averageChange > 0 ? '+' : ''}
                        {analysis.averageChange.toFixed(1)}%
                      </div>
                      <p className="text-xs text-green-600">
                        Por mudança de preço
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Projeção */}
              {projection && projection.projectedPrice && (
                <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-orange-800 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Projeção para 30 dias
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-orange-600 mb-2">Preço Projetado</p>
                        <div className="text-3xl font-bold text-orange-800">
                          R$ {projection.projectedPrice.toFixed(2).replace('.', ',')}
                        </div>
                        <Badge className={`mt-2 ${getConfidenceColor(projection.confidence)}`}>
                          Confiança: {projection.confidence === 'high' ? 'Alta' : 
                                    projection.confidence === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-orange-600 mb-2">Faixa Esperada</p>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-green-600 font-medium">Mín: </span>
                            R$ {projection.range.lower.toFixed(2).replace('.', ',')}
                          </div>
                          <div className="text-sm">
                            <span className="text-red-600 font-medium">Máx: </span>
                            R$ {projection.range.upper.toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comparação com Histórico */}
              {comparison && (
                <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Comparação com Histórico
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 mb-1">Preço Atual</p>
                        <p className="font-bold text-slate-800">
                          R$ {(ingredient.current_price || 0).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1">Média Histórica</p>
                        <p className="font-bold text-slate-800">
                          R$ {comparison.averagePrice.toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1">Diferença</p>
                        <p className={`font-bold ${comparison.percentDifferenceFromAvg > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {comparison.percentDifferenceFromAvg > 0 ? '+' : ''}
                          {comparison.percentDifferenceFromAvg.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1">Posição</p>
                        <Badge 
                          className={
                            comparison.position === 'above' ? 'bg-red-100 text-red-700 border-red-200' :
                            comparison.position === 'below' ? 'bg-green-100 text-green-700 border-green-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }
                        >
                          {comparison.position === 'above' ? 'Acima' : 
                           comparison.position === 'below' ? 'Abaixo' : 'Na média'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Histórico Recente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Histórico Recente ({priceHistory.length} registros)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {priceHistory.slice(0, 10).map((record, index) => {
                      const oldPrice = parseFloat(record.old_price) || 0;
                      const newPrice = parseFloat(record.new_price) || 0;
                      const change = newPrice - oldPrice;
                      const percentChange = oldPrice > 0 ? (change / oldPrice) * 100 : 0;

                      return (
                        <div key={record.id || index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-slate-600">
                              {format(parseISO(record.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {record.supplier && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <Package className="w-3 h-3" />
                                  {record.supplier}
                                </Badge>
                              )}
                              {record.brand && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  {record.brand}
                                </Badge>
                              )}
                              {record.change_type && record.change_type !== 'manual_update' && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                                  {record.change_type === 'supplier_change' ? (
                                    <>
                                      <Users className="w-3 h-3" />
                                      Fornecedor
                                    </>
                                  ) : record.change_type === 'brand_change' ? (
                                    <>
                                      <Tag className="w-3 h-3" />
                                      Marca
                                    </>
                                  ) : record.change_type === 'supplier_brand_change' ? (
                                    <>
                                      <Users className="w-3 h-3" />
                                      <Tag className="w-3 h-3" />
                                      Fornecedor+Marca
                                    </>
                                  ) : record.change_type === 'ingredient_editor_update' ? (
                                    'Editor'
                                  ) : record.change_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-sm font-semibold">
                                R$ {newPrice.toFixed(2).replace('.', ',')}
                              </div>
                              {oldPrice > 0 && Math.abs(change) > 0.01 && (
                                <div className={`text-xs ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {change > 0 ? '+' : ''}R$ {change.toFixed(2)} 
                                  ({change > 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                                </div>
                              )}
                            </div>
                            {Math.abs(change) > 0.01 && (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                {change > 0 ? (
                                  <TrendingUp className="w-4 h-4 text-red-500" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </div>
    </div>
  );
}