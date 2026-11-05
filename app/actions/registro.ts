"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  readRegistroValues,
  validateRegistro,
  type RegistroErrors,
  type RegistroValues,
} from "@/lib/validation/registro";

export type RegistroState = {
  errors?: RegistroErrors;
  formError?: string;
  // Valores para volver a llenar el formulario (sin las contraseñas).
  values?: Omit<RegistroValues, "password" | "confirmPassword">;
};

function serverMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

export async function registro(
  _prevState: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  const values = readRegistroValues(formData);
  const keep = {
    fullName: values.fullName,
    email: values.email,
    phone: values.phone,
    unitCode: values.unitCode,
  };

  const errors = validateRegistro(values);
  if (Object.keys(errors).length > 0) {
    return { errors, values: keep };
  }

  let res: Response;
  try {
    res = await apiFetch("auth/registro", {
      method: "POST",
      body: JSON.stringify({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        unitCode: values.unitCode,
        password: values.password,
      }),
    });
  } catch (error) {
    console.error("Error al crear la cuenta:", error);
    return { formError: "No se pudo crear la cuenta. Intenta más tarde.", values: keep };
  }

  if (res.status === 201) {
    redirect("/login?aviso=cuenta-creada");
  }

  const message = serverMessage(await res.json().catch(() => null));

  // 404: el código de unidad no existe → se muestra junto a ese campo.
  if (res.status === 404) {
    return {
      errors: { unitCode: message ?? "El código de unidad no existe." },
      values: keep,
    };
  }
  // 409: correo repetido o unidad con 4 residentes → mensaje del servidor.
  if (res.status === 409 || res.status === 400) {
    return {
      formError: message ?? "Revisa los datos del formulario.",
      values: keep,
    };
  }

  console.error(`auth/registro respondió ${res.status}`);
  return { formError: "No se pudo crear la cuenta. Intenta más tarde.", values: keep };
}
