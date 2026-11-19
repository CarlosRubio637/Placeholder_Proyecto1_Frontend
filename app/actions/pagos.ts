"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  onlyDigits,
  parseExpiry,
  PAY_MESSAGES,
  validateCard,
  type CardErrors,
  type CardField,
  type FeePayment,
} from "@/lib/estado-cuenta";

// H1: pago de una cuota. H2: detalle de pagos y código de registro.
// Los datos de la tarjeta solo pasan por aquí hacia el backend: no se
// guardan ni se escriben en los registros del servidor.

export type PagoState = {
  errors?: CardErrors;
  formError?: string;
  rejected?: string;
  alreadyPaid?: boolean;
  notFound?: boolean;
};

function todaySV(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function firstMessage(body: { message?: unknown } | null) {
  const message = body?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

const FIELD_FROM_API: Record<string, CardField> = {
  cardNumber: "cardNumber",
  expMonth: "expiry",
  expYear: "expiry",
  cvv: "cvv",
  holderName: "holderName",
};

export async function pagarCuota(_prev: PagoState, formData: FormData): Promise<PagoState> {
  const feeId = String(formData.get("feeId") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const values = {
    cardNumber: String(formData.get("cardNumber") ?? ""),
    expiry: String(formData.get("expiry") ?? ""),
    cvv: String(formData.get("cvv") ?? ""),
    holderName: String(formData.get("holderName") ?? ""),
  };
  const errors = validateCard(values, todaySV());
  if (Object.keys(errors).length > 0) {
    return { errors };
  }
  const expiry = parseExpiry(values.expiry)!;

  let res: Response;
  try {
    res = await apiFetch(`cuotas/${encodeURIComponent(feeId)}/pagos`, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey,
        cardNumber: onlyDigits(values.cardNumber),
        expMonth: expiry.month,
        expYear: expiry.year,
        cvv: values.cvv,
        holderName: values.holderName.trim().replace(/\s+/g, " "),
      }),
    });
  } catch {
    // Sin el error: podría incluir el cuerpo con la tarjeta.
    console.error("Error de red al pagar la cuota", feeId);
    return { formError: PAY_MESSAGES.serverError };
  }

  if (res.status === 201 || res.status === 200) {
    const payment = (await res.json()) as { id: string; status: string; failureReason: string | null };
    revalidatePath("/estado-de-cuenta");
    if (payment.status === "APROBADO") {
      redirect(`/pagos/${payment.id}/recibo?aviso=pago-aprobado`);
    }
    return { rejected: PAY_MESSAGES.rejected(payment.failureReason ?? "sin motivo") };
  }

  const body = (await res.json().catch(() => null)) as { message?: unknown; field?: unknown } | null;
  const message = firstMessage(body);
  if (res.status === 400) {
    const field = typeof body?.field === "string" ? FIELD_FROM_API[body.field] : undefined;
    return field && message ? { errors: { [field]: message } } : { formError: message ?? PAY_MESSAGES.serverError };
  }
  if (res.status === 409) {
    revalidatePath("/estado-de-cuenta");
    return { alreadyPaid: true, formError: message ?? PAY_MESSAGES.alreadyPaid };
  }
  if (res.status === 404) {
    return { notFound: true, formError: PAY_MESSAGES.notFound };
  }
  if (res.status === 403) {
    return { formError: "No tienes permiso para esta acción." };
  }
  console.error(`Pagar cuota respondió ${res.status}`);
  return { formError: PAY_MESSAGES.serverError };
}

/** H2: pagos de una cuota, al expandirla en el estado de cuenta. */
export async function cargarPagosCuota(feeId: string): Promise<{ data?: FeePayment[]; error?: string }> {
  const res = await apiFetch(`cuotas/${encodeURIComponent(feeId)}/pagos`);
  if (res.ok) {
    return (await res.json()) as { data: FeePayment[] };
  }
  return { error: res.status === 404 ? PAY_MESSAGES.notFound : "No se pudieron cargar los pagos." };
}

export type CodigoState = { code?: string; error?: string };

/** H2: regenera el código de registro de una unidad (Administrador). */
export async function regenerarCodigo(_prev: CodigoState, formData: FormData): Promise<CodigoState> {
  const unitId = String(formData.get("unitId") ?? "");
  const res = await apiFetch(`admin/unidades/${encodeURIComponent(unitId)}/codigo-registro`, {
    method: "POST",
  });
  if (res.status === 201) {
    const body = (await res.json()) as { registrationCode: string };
    revalidatePath(`/admin/unidades/${unitId}`);
    return { code: body.registrationCode };
  }
  if (res.status === 404) return { error: "La unidad no existe." };
  console.error(`Regenerar código respondió ${res.status}`);
  return { error: "No se pudo regenerar el código. Intenta de nuevo." };
}
