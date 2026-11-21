"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AVISO_PARAMS } from "@/lib/dentro-client";

/** Cuánto tiempo queda visible el aviso. */
const VISIBLE_MS = 15_000;

type Aviso = { tipo: "exito" | "alerta"; texto: string };

// Avisos de la salida (H17). La página resuelve el texto a partir de la clave
// de la URL; este componente lo muestra, quita la clave de la URL (para que
// Actualizar y las recargas de 30 s no lo repitan) y lo oculta a los 15 s.
export function AvisoSalida({ aviso }: { aviso: Aviso | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [shown, setShown] = useState<Aviso | null>(aviso);
  const [lastProp, setLastProp] = useState<Aviso | null>(aviso);

  // Un aviso nuevo (otra salida) reemplaza al que se ve. Se ajusta durante el
  // render, sin efecto, porque depende solo de la prop.
  if (aviso && (aviso.texto !== lastProp?.texto || aviso.tipo !== lastProp?.tipo)) {
    setLastProp(aviso);
    setShown(aviso);
  } else if (!aviso && lastProp) {
    // La clave ya salió de la URL: el siguiente aviso, aunque sea igual, se muestra.
    setLastProp(null);
  }

  // Quita la clave del aviso de la URL, conservando los filtros.
  useEffect(() => {
    if (!AVISO_PARAMS.some((name) => params.has(name))) return;
    const next = new URLSearchParams(params);
    for (const name of AVISO_PARAMS) next.delete(name);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  // Lo oculta pasado un rato.
  useEffect(() => {
    if (!shown) return;
    const id = setTimeout(() => setShown(null), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [shown]);

  if (!shown) return null;
  return shown.tipo === "exito" ? (
    <p
      role="status"
      className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
    >
      {shown.texto}
    </p>
  ) : (
    <p
      role="alert"
      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    >
      {shown.texto}
    </p>
  );
}
