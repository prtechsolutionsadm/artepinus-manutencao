import { BarChart3, Bell, Building2, CalendarDays, ClipboardList, House, Plus, UserRound, Users, Wrench, type LucideIcon } from "lucide-react";
import type { IconeMenu } from "@/lib/menu";

export const ICONES: Record<IconeMenu, LucideIcon> = {
  inicio: House,
  requisicoes: ClipboardList,
  nova: Plus,
  agenda: CalendarDays,
  relatorios: BarChart3,
  equipamentos: Wrench,
  usuarios: Users,
  setores: Building2,
  perfil: UserRound,
  notificacoes: Bell,
};
