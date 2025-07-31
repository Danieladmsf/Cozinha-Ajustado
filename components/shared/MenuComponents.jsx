'use client';

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Calendar as CalendarIcon,
  Utensils,
  Plus,
  X,
  Settings,
  StickyNote,
  Clipboard,
  ClipboardList,
  Eye,
  EyeOff,
  MoreVertical,
  ListPlus,
  Trash2,
  MessageCircle,
  SlidersHorizontal,
  Copy,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  Apple,
  ChevronUp,
  ChevronDown,
  Calendar,
  Plus as PlusIcon,
  Filter,
  ListFilter,
  Save,
  Trash,
  Edit,
  Check,
  AlertTriangle,
  RotateCcw,
  Info,
  RefreshCw,
  Printer,
  Database,
  Droplet,
  Loader2,
  ChevronsUpDown,
  AlertCircle,
  Package,
  Search
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { nutrientConfig } from "./nutrientConfig";

// Função auxiliar para truncamento de texto
export const truncateText = (text, maxLength = 32) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Função para mapear dias da semana
export const getDayName = (dayNumber) => {
  const dayNames = {
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta"
  };
  return dayNames[dayNumber] || "";
};