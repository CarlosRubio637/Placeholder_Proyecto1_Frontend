import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PAY_MESSAGES, type FeeDetail, type PaymentReceipt } from "@/lib/estado-cuenta";
import ReciboPage from "@/app/(comun)/pagos/[pagoId]/recibo/page";
import PagarCuotaPage from "./page";
import { PayForm } from "./pay-form";

const apiFetch = vi.hoisted(() => vi.fn());
const fetchFee = vi.hoisted(() => vi.fn());
const fetchReceipt = vi.hoisted(() => vi.fn());
// Solo registra a dónde redirige (el redirect real corta la acción lanzando un error).
const redirect = vi.hoisted(() => vi.fn());
const pagar = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireRole: vi.fn(async () => ({ id: "u1", role: "RESIDENTE", unit: { code: "A-101" } })),
  requireAnyRole: vi.fn(async () => ({ id: "u1", role: "RESIDENTE", unit: { code: "A-101" } })),
}));
vi.mock("@/lib/estado-cuenta-api", () => ({ fetchFee, fetchReceipt }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect, unstable_rethrow: vi.fn() }));
// El formulario usa la acción a través de este mock; por defecto corre la real.
vi.mock("@/app/actions/pagos", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/app/actions/pagos")>();
  pagar.mockImplementation(real.pagarCuota);
  return { ...real, pagarCuota: (...args: Parameters<typeof real.pagarCuota>) => pagar(...args) };
});

const FEE: FeeDetail = {
  id: "fee-1",
  period: "2026-11",
  concept: "Cuota de mantenimiento",
  amount: 45,
  dueDate: "2026-11-30",
  status: "PENDIENTE",
};

const RECEIPT: PaymentReceipt = {
  id: "pay-1",
  transactionNumber: "TX-20261122-000001",
  status: "APROBADO",
  failureReason: null,
  amount: 45,
  cardLast4: "4242",
  holderName: "Ana Lopez",
  createdAt: "2026-11-22T18:00:00Z",
  unit: { code: "A-101" },
  fee: { id: "fee-1", period: "2026-11", concept: "Cuota de mantenimiento", dueDate: "2026-11-30", status: "PAGADO" },
};

function field(label: string | RegExp) {
  return screen.getByLabelText(label) as HTMLInputElement;
}
function payButton() {
  return screen.getByRole("button", { name: /Pagar|Procesando/ }) as HTMLButtonElement;
}
function type(label: string | RegExp, value: string) {
  fireEvent.change(field(label), { target: { value } });
}
function fillValid(card = "4242424242424242") {
  type("Número de tarjeta", card);
  type("Vencimiento (MM/AA)", "12/30");
  type("Código de seguridad", "123");
  type("Nombre del titular", "Ana Lopez");
}
function json(status: number, body: unknown) {
  return { status, ok: status < 300, json: async () => body } as Response;
}
async function submit() {
  await act(async () => {
    fireEvent.click(payButton());
  });
}

async function renderPage(fee: FeeDetail | null = FEE) {
  fetchFee.mockResolvedValue(fee);
  const page = await PagarCuotaPage({
    params: Promise.resolve({ cuotaId: "fee-1" }),
  } as PageProps<"/cuotas/[cuotaId]/pagar">);
  render(page);
}

describe("H1. Pago de cuota de mantenimiento con pasarela simulada", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    redirect.mockClear();
    pagar.mockClear();
  });

  it("AC1: muestra concepto, periodo, vencimiento y monto total de la cuota Pendiente", async () => {
    await renderPage();

    expect(screen.getByText("Cuota de mantenimiento")).toBeTruthy();
    expect(screen.getByText("noviembre 2026")).toBeTruthy();
    expect(screen.getByText("30/11/2026")).toBeTruthy();
    expect(screen.getByText("Pendiente")).toBeTruthy();
    expect(screen.getByText("$45.00")).toBeTruthy();
  });

  it("AC1: el monto no es editable (no hay pagos parciales)", async () => {
    await renderPage();

    const inputs = Array.from(document.querySelectorAll("input:not([type=hidden])")).map(
      (input) => (input as HTMLInputElement).name,
    );
    expect(inputs).toEqual(["cardNumber", "expiry", "cvv", "holderName"]);
    expect(payButton().textContent).toBe("Pagar $45.00");
  });

  it("AC1: también se puede pagar una cuota Morosa", async () => {
    await renderPage({ ...FEE, status: "MOROSO" });
    expect(screen.getByText("Moroso")).toBeTruthy();
    expect(payButton()).toBeTruthy();
  });

  it("AC1: una cuota Pagada muestra el aviso y no el formulario", async () => {
    await renderPage({ ...FEE, status: "PAGADO" });

    expect(screen.getByText("Esta cuota ya está pagada.")).toBeTruthy();
    expect(screen.queryByLabelText("Número de tarjeta")).toBeNull();
  });

  it("AC2: cada campo inválido muestra su mensaje y Pagar queda deshabilitado", () => {
    render(<PayForm feeId="fee-1" amount={45} />);

    type("Número de tarjeta", "4242 4242 4242");
    type("Vencimiento (MM/AA)", "01/20");
    type("Código de seguridad", "12");
    type("Nombre del titular", "An");

    expect(screen.getByText("Ingresa los 16 dígitos de la tarjeta.")).toBeTruthy();
    expect(screen.getByText("Fecha de vencimiento inválida o vencida (MM/AA).")).toBeTruthy();
    expect(screen.getByText("Ingresa los 3 dígitos del código de seguridad.")).toBeTruthy();
    expect(screen.getByText("Ingresa el nombre como aparece en la tarjeta (3 a 60 letras).")).toBeTruthy();
    expect(payButton().disabled).toBe(true);
  });

  it("AC2: rechaza un mes 13 y un titular con números", () => {
    render(<PayForm feeId="fee-1" amount={45} />);
    fillValid();

    type("Vencimiento (MM/AA)", "13/30");
    type("Nombre del titular", "Ana 123");

    expect(screen.getByText("Fecha de vencimiento inválida o vencida (MM/AA).")).toBeTruthy();
    expect(screen.getByText("Ingresa el nombre como aparece en la tarjeta (3 a 60 letras).")).toBeTruthy();
    expect(payButton().disabled).toBe(true);
  });

  it("AC2: con datos válidos no hay mensajes y Pagar se habilita; la tarjeta se agrupa de 4 en 4", () => {
    render(<PayForm feeId="fee-1" amount={45} />);

    fillValid();

    expect(field("Número de tarjeta").value).toBe("4242 4242 4242 4242");
    expect(document.querySelectorAll("p.text-red-600:not(:empty)")).toHaveLength(0);
    expect(payButton().disabled).toBe(false);
  });

  it("AC3: mientras procesa, el botón se deshabilita con \"Procesando pago\" y un segundo clic no envía otra solicitud", async () => {
    let finish: (value: object) => void = () => {};
    pagar.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    render(<PayForm feeId="fee-1" amount={45} />);
    fillValid();

    await submit();

    expect(payButton().textContent).toBe(PAY_MESSAGES.processing);
    expect(payButton().disabled).toBe(true);
    await act(async () => {
      fireEvent.submit(payButton().closest("form")!);
    });
    expect(pagar).toHaveBeenCalledTimes(1);

    await act(async () => finish({}));
    expect(payButton().textContent).toBe("Pagar $45.00");
  });

  it("AC4: con pago aprobado redirige al recibo con el aviso", async () => {
    apiFetch.mockResolvedValue(json(201, { id: "pay-1", status: "APROBADO", failureReason: null }));
    render(<PayForm feeId="fee-1" amount={45} />);
    fillValid();

    await submit();

    expect(apiFetch).toHaveBeenCalledWith(
      "cuotas/fee-1/pagos",
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = apiFetch.mock.calls[0] as [string, { body: string }];
    expect(JSON.parse(init.body)).toMatchObject({
      cardNumber: "4242424242424242",
      expMonth: 12,
      expYear: 2030,
      cvv: "123",
      holderName: "Ana Lopez",
    });
    expect(redirect).toHaveBeenCalledWith("/pagos/pay-1/recibo?aviso=pago-aprobado");
  });

  it("AC4: el recibo muestra transacción, fecha y hora, unidad, concepto, periodo, monto, últimos 4 dígitos y Pagado", async () => {
    fetchReceipt.mockResolvedValue(RECEIPT);

    const page = await ReciboPage({
      params: Promise.resolve({ pagoId: "pay-1" }),
      searchParams: Promise.resolve({ aviso: "pago-aprobado" }),
    } as PageProps<"/pagos/[pagoId]/recibo">);
    render(page);

    expect(screen.getByText("Pago aprobado")).toBeTruthy();
    expect(screen.getByText("TX-20261122-000001")).toBeTruthy();
    expect(screen.getByText(/22\/11\/2026/)).toBeTruthy();
    expect(screen.getByText("A-101")).toBeTruthy();
    expect(screen.getByText("Cuota de mantenimiento")).toBeTruthy();
    expect(screen.getByText("noviembre 2026")).toBeTruthy();
    expect(screen.getByText("$45.00")).toBeTruthy();
    expect(screen.getByText("•••• 4242")).toBeTruthy();
    expect(screen.getByText("Pagado")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Imprimir" })).toBeTruthy();
  });

  it("AC5: con pago rechazado queda en el formulario con \"Pago rechazado: <motivo>\"", async () => {
    apiFetch.mockResolvedValue(
      json(201, { id: "pay-2", status: "RECHAZADO", failureReason: "Fondos insuficientes" }),
    );
    render(<PayForm feeId="fee-1" amount={45} />);
    fillValid("4000000000000002");

    await submit();

    expect(screen.getByRole("alert").textContent).toBe("Pago rechazado: Fondos insuficientes");
    expect(redirect).not.toHaveBeenCalled();
    expect(field("Número de tarjeta").value).toBe("4000 0000 0000 0002");
    expect(payButton().textContent).toBe("Pagar $45.00");
  });

  it("AC5: un nuevo intento después del rechazo usa otra llave de idempotencia", async () => {
    apiFetch.mockResolvedValue(
      json(201, { id: "pay-2", status: "RECHAZADO", failureReason: "Fondos insuficientes" }),
    );
    render(<PayForm feeId="fee-1" amount={45} />);
    fillValid("4000000000000002");

    await submit();
    await submit();

    const keys = apiFetch.mock.calls.map(([, init]) => JSON.parse((init as { body: string }).body).idempotencyKey);
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });
});
