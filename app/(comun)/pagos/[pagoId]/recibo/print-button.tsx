"use client";

// H1: imprime el recibo con la impresión del navegador.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
    >
      Imprimir
    </button>
  );
}
