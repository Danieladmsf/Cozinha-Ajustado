import React from "react";
import Link from "next/link";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Home,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SidebarNav({
  navigation,
  currentPageName,
  sidebarCollapsed,
  setSidebarCollapsed,
  isHovering,
  setIsHovering,
  setActiveItem,
  handleMouseEnter,
  handleMouseLeave
}) {
  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 h-full bg-white border-r shadow-sm transition-all duration-200",
        "lg:relative",
        sidebarCollapsed && !isHovering ? "lg:w-20" : "w-64"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          {(!sidebarCollapsed || isHovering) ? (
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">
              Cozinha e Afeto
            </h1>
          ) : (
            <Home className="h-5 w-5 text-blue-600 mx-auto" />
          )}
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed && !isHovering ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = currentPageName === item.href;
              const isRecipes = item.href === "Recipes";
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "sidebar-nav-item flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md",
                    isActive
                      ? "active text-blue-700 bg-blue-50"
                      : "text-gray-600 hover:bg-gray-50",
                    sidebarCollapsed && !isHovering ? "justify-center px-2" : ""
                  )}
                  onClick={() => {
                    if (window.innerWidth >= 1024) {
                      setSidebarCollapsed(true);
                      setIsHovering(false);
                    }
                    setActiveItem(item.href);
                  }}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 sidebar-icon",
                      isActive ? "text-blue-600" : "text-gray-400"
                    )}
                  />
                  
                  {(!sidebarCollapsed || isHovering) && (
                    <span className={cn(
                      "sidebar-text whitespace-nowrap",
                      isActive ? "text-blue-700" : "text-gray-600"
                    )}>
                      {item.name}
                    </span>
                  )}
                  
                  {isRecipes && isActive && !sidebarCollapsed && (
                    <span className="absolute right-3 h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
        
        <div className="p-4 border-t text-center">
          {(!sidebarCollapsed || isHovering) && (
            <div className="text-xs text-gray-500">
              Cozinha e Afeto © 2024
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}