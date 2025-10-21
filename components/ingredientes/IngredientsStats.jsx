import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, Store, ChefHat } from "lucide-react";

export default function IngredientsStats({ stats }) {
  const { total, active, traditional, commercial } = stats;

  const statsConfig = [
    {
      title: "Total",
      value: total,
      icon: Package,
      gradient: "from-slate-500 to-slate-600",
      bgGradient: "from-slate-50 to-slate-100",
      iconBg: "bg-gradient-to-br from-slate-500 to-slate-600",
      textColor: "text-slate-700"
    },
    {
      title: "Ativos",
      value: active,
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-100",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      textColor: "text-emerald-700"
    },
    {
      title: "Para Receitas",
      value: traditional,
      icon: ChefHat,
      gradient: "from-purple-500 to-indigo-600",
      bgGradient: "from-purple-50 to-indigo-100",
      iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600",
      textColor: "text-purple-700"
    },
    {
      title: "Comerciais",
      value: commercial,
      icon: Store,
      gradient: "from-orange-500 to-red-600",
      bgGradient: "from-orange-50 to-red-100",
      iconBg: "bg-gradient-to-br from-orange-500 to-red-600",
      textColor: "text-orange-700"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.title}
            className={`relative overflow-hidden bg-gradient-to-br ${stat.bgGradient} border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className={`text-sm font-semibold ${stat.textColor} group-hover:scale-105 transition-transform duration-200`}>
                {stat.title}
              </CardTitle>
              <div className={`${stat.iconBg} p-2 rounded-xl shadow-lg group-hover:rotate-12 transition-transform duration-300`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-3xl font-bold ${stat.textColor} mb-1`}>
                {stat.value.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                ingredientes
              </div>
            </CardContent>
            {/* Decorative gradient overlay */}
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.gradient} opacity-5 rounded-full -mr-10 -mt-10`}></div>
          </Card>
        );
      })}
    </div>
  );
}