import * as React from "react"
import { cn } from "@/lib/utils"

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
  outline: "text-foreground",
  success: "bg-green-500 text-white hover:bg-green-600", // Mantido como verde forte para sucesso
  warning: "bg-amber-100 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-900/50 dark:text-amber-300", // Laranja/Amarelo para aviso
  neutral: "bg-gray-100 text-gray-700 border-gray-300", // NOVA VARIANTE NEUTRA
}

const Badge = ({ 
  className = "", 
  variant = "default", 
  ...props 
}) => {
  // Certifique-se de que a variante solicitada exista, caso contrário, use 'default'
  const selectedVariant = variants[variant] ? variant : "default";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        selectedVariant === "outline" ? "border-current" : "border-transparent", // Para outline, usa a cor do texto para a borda, senão transparente
        variants[selectedVariant], // Aplica a classe da variante selecionada
        className
      )}
      {...props}
    />
  )
}

export { Badge }
export default Badge