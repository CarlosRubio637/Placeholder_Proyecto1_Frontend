import { apiFetch } from "@/lib/api";
import type {
  AccountStatement,
  AdminUnit,
  FeeDetail,
  FeeStatus,
  PaymentReceipt,
} from "@/lib/estado-cuenta";
import { STATEMENT_PAGE_SIZE } from "@/lib/estado-cuenta";

// Consultas de H1 y H2 al backend (solo servidor: usan la cookie de sesión).

export type StatementFilters = { year?: number; status?: FeeStatus; page: number };

function statementQuery(filters: StatementFilters): string {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(STATEMENT_PAGE_SIZE),
  });
  if (filters.year) query.set("year", String(filters.year));
  if (filters.status) query.set("status", filters.status);
  return query.toString();
}

/** GET /estado-cuenta: la unidad sale del token del residente. */
export async function fetchMyStatement(filters: StatementFilters): Promise<AccountStatement> {
  const res = await apiFetch(`estado-cuenta?${statementQuery(filters)}`);
  if (!res.ok) throw new Error(`GET estado-cuenta respondió ${res.status}`);
  return res.json();
}

/** GET /unidades/:unitId/estado-cuenta (Administrador). Null si no existe. */
export async function fetchUnitStatement(
  unitId: string,
  filters: StatementFilters,
): Promise<AccountStatement | null> {
  const res = await apiFetch(`unidades/${encodeURIComponent(unitId)}/estado-cuenta?${statementQuery(filters)}`);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`GET estado-cuenta de unidad respondió ${res.status}`);
  return res.json();
}

/** GET /admin/unidades/:unitId. Null si no existe. */
export async function fetchAdminUnit(unitId: string): Promise<AdminUnit | null> {
  const res = await apiFetch(`admin/unidades/${encodeURIComponent(unitId)}`);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`GET admin/unidades respondió ${res.status}`);
  return res.json();
}

/** GET /cuotas/:cuotaId. Null si no existe o es de otra unidad. */
export async function fetchFee(feeId: string): Promise<FeeDetail | null> {
  const res = await apiFetch(`cuotas/${encodeURIComponent(feeId)}`);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`GET cuota respondió ${res.status}`);
  return res.json();
}

/** GET /pagos/:pagoId. Null si no existe o es de otra unidad. */
export async function fetchReceipt(paymentId: string): Promise<PaymentReceipt | null> {
  const res = await apiFetch(`pagos/${encodeURIComponent(paymentId)}`);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`GET pago respondió ${res.status}`);
  return res.json();
}
