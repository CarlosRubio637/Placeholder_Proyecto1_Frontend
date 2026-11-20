"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Vuelve a pedir la página al servidor cada `ms` mientras está abierta
// (H12: la bandeja cada 60 segundos). El temporizador se detiene al salir.
export function AutoRefresh({ ms }: { ms: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), ms);
    return () => clearInterval(timer);
  }, [router, ms]);
  return null;
}
