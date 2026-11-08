import { create } from "zustand";
import { contarNoLeidas } from "@/app/actions/notificaciones";

// Contador global de No leídas (H31). Vive aquí porque lo usa el encabezado
// de todas las pantallas y la bandeja lo actualiza al marcar notificaciones.
type NotificationsState = {
  /** null = todavía no se consultó o la última consulta falló. */
  unreadCount: number | null;
  refreshUnread: () => Promise<void>;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  unreadCount: null,
  refreshUnread: async () => {
    const count = await contarNoLeidas();
    // Si falla, se conserva el último valor conocido.
    if (count !== null) set({ unreadCount: count });
  },
}));
