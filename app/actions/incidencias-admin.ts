"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { GESTION_MESSAGES, isPriority, type IncidentPriority } from "@/lib/incidencias";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GestionInput = {
  id: string;
  /** Solo si cambió. */
  priority?: IncidentPriority;
  /** Solo si cambió: uuid, o null para quitar el responsable. */
  assigneeId?: string | null;
};

export type GestionState = {
  ok?: string;
  error?: string;
  /** Campo al que pertenece el error (assigneeId o priority). */
  field?: "priority" | "assigneeId";
};

function firstMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

function readInput(raw: unknown): GestionInput | null {
  const input = (raw ?? {}) as Record<string, unknown>;
  if (typeof input.id !== "string" || !UUID_REGEX.test(input.id)) return null;
  const result: GestionInput = { id: input.id };
  if (input.priority !== undefined) {
    if (!isPriority(input.priority)) return null;
    result.priority = input.priority;
  }
  if (input.assigneeId !== undefined) {
    if (input.assigneeId !== null && (typeof input.assigneeId !== "string" || !UUID_REGEX.test(input.assigneeId))) {
      return null;
    }
    result.assigneeId = input.assigneeId;
  }
  return result;
}

// PATCH /admin/incidencias/:id (H12): cambia la prioridad o el responsable.
export async function guardarGestion(_prev: GestionState, raw: GestionInput): Promise<GestionState> {
  const input = readInput(raw);
  if (!input) return { error: "Revisa los datos de la gestión." };
  const { id, ...changes } = input;
  if (Object.keys(changes).length === 0) return { error: GESTION_MESSAGES.noChanges };

  let res: Response;
  try {
    res = await apiFetch(`admin/incidencias/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
  } catch (error) {
    // Un 401 redirige dentro de apiFetch (sesión expirada): deja pasar esa redirección.
    unstable_rethrow(error);
    console.error("Error al guardar la gestión de la incidencia:", error);
    return { error: "No se pudieron guardar los cambios. Intenta más tarde." };
  }

  if (res.ok) {
    revalidatePath(`/incidencias/${id}`);
    revalidatePath("/admin/incidencias");
    return { ok: GESTION_MESSAGES.saved };
  }

  const payload = await res.json().catch(() => null);
  const message = firstMessage(payload);
  if (res.status === 400) {
    const field = (payload as { field?: unknown } | null)?.field;
    return {
      error: message ?? "Revisa los datos de la gestión.",
      field: field === "assigneeId" || field === "priority" ? field : undefined,
    };
  }
  if (res.status === 403) return { error: "No tienes permiso para esta acción." };
  if (res.status === 404) return { error: "La incidencia ya no existe." };
  if (res.status === 409) return { error: message ?? GESTION_MESSAGES.resolved };
  console.error(`PATCH admin/incidencias/${id} respondió ${res.status}`);
  return { error: "No se pudieron guardar los cambios. Intenta más tarde." };
}
