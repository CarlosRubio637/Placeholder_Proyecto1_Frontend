"use client";

// H1: imprime el recibo con la impresión del navegador.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-primary hover:bg-primary-hover px-4 py-2 font-medium text-primary-foreground"
    >
      Imprimir
    </button>
  );
}
