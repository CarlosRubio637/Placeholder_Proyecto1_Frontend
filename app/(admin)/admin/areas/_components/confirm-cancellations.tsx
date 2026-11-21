import { cancellationQuestion } from "@/lib/areas";

// Confirmación de H9 cuando el backend responde 409 RESERVAS_AFECTADAS.
// "Continuar" es un submit del mismo formulario con
// confirmCancellations=true; el navegador agrega el name/value del botón que
// envía al FormData.
export function ConfirmCancellations({
  count,
  pending,
  onCancel,
}: {
  count: number;
  pending: boolean;
  onCancel: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="confirmar-cancelaciones"
      className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    >
      <p id="confirmar-cancelaciones" className="font-medium">
        {cancellationQuestion(count)}
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          name="confirmCancellations"
          value="true"
          disabled={pending}
          className="rounded-md bg-amber-700 px-3 py-1.5 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Aplicando..." : "Continuar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-md border border-amber-400 px-3 py-1.5 dark:border-amber-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
