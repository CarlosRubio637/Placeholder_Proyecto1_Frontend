// Áreas comunes (H9): tipos de GET /admin/areas y utilidades de fecha.
// Sin dependencias del servidor: lo importan también componentes de cliente.
// La consulta al backend está en lib/areas-api.ts.

export type AreaBlock = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export type Area = {
  id: string;
  name: string;
  capacity: number;
  rules: string | null;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  isActive: boolean;
  futureReservations: number;
  blocks: AreaBlock[];
};

/** Hoy en El Salvador, "AAAA-MM-DD" (no depende de la zona del navegador). */
export function todaySV(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** "AAAA-MM-DD" → "DD/MM/AAAA". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Texto de la confirmación de H9. */
export function cancellationQuestion(count: number): string {
  const reservas = count === 1 ? "reserva confirmada" : "reservas confirmadas";
  return `Este cambio cancelará ${count} ${reservas} y se avisará a los residentes. ¿Continuar?`;
}
