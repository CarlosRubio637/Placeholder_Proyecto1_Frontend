import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoleLayout } from "@/app/_components/role-layout";
import LoginPage from "@/app/login/page";
import { GET as sesionExpirada } from "@/app/sesion/expirada/route";
import type { CurrentUser } from "@/lib/api";
import { NAV_BY_ROLE } from "@/lib/navigation";
import { proxy } from "@/proxy";
import { RegistroForm } from "./registro-form";

const apiFetch = vi.hoisted(() => vi.fn());
const getCurrentUser = vi.hoisted(() => vi.fn());
const getSession = vi.hoisted(() => vi.fn());
// Solo registra a dónde redirige (el redirect real corta la acción lanzando un error).
const redirect = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/api")>();
  apiFetch.mockImplementation(real.apiFetch);
  return { ...real, apiFetch: (...args: Parameters<typeof real.apiFetch>) => apiFetch(...args), getCurrentUser };
});
vi.mock("@/lib/session", () => ({ SESSION_COOKIE: "session", getSession }));
vi.mock("next/navigation", () => ({
  redirect,
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions/auth", () => ({ login: vi.fn(), logout: vi.fn() }));
vi.mock("@/app/_components/notification-bell", () => ({ NotificationBell: () => null }));

const user = (role: CurrentUser["role"]): CurrentUser => ({
  id: "u1",
  email: "persona@condominio.test",
  role,
  fullName: "Persona de Prueba",
  unit: role === "RESIDENTE" ? { id: "unit-1", code: "A-101" } : null,
});

function json(status: number, body: unknown) {
  return { status, ok: status < 300, json: async () => body } as Response;
}
function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function fillValid() {
  type("Nombre completo", "Ana María O'Neil-López");
  type("Correo electrónico", "ana@condominio.test");
  type("Teléfono", "7000-0000");
  type("Código de unidad", "ABCD2345");
  type("Contraseña", "Clave1234");
  type("Confirmar contraseña", "Clave1234");
}
async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
  });
}

describe("H38. Roles, registro de residentes y protección de rutas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("API_URL", "http://localhost:3000/api/v1/");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("AC1: \"Crear cuenta\" pide nombre, correo, teléfono, código de unidad, contraseña y su confirmación", () => {
    render(<RegistroForm />);

    const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
    expect(input("Nombre completo").maxLength).toBe(80);
    expect(input("Correo electrónico").maxLength).toBe(254);
    expect(input("Teléfono").placeholder).toBe("0000-0000");
    expect(input("Código de unidad").maxLength).toBe(8);
    expect(input("Contraseña").type).toBe("password");
    expect(input("Contraseña").maxLength).toBe(72);
    expect(input("Confirmar contraseña").type).toBe("password");
  });

  it("AC1: /registro es pública; sin sesión las demás rutas van a /login", () => {
    const open = proxy(new NextRequest("http://localhost:3001/registro"));
    const closed = proxy(new NextRequest("http://localhost:3001/estado-de-cuenta"));

    expect(open.headers.get("location")).toBeNull();
    expect(closed.headers.get("location")).toBe("http://localhost:3001/login");
  });

  it("AC1: cada campo inválido muestra su mensaje y no se llama al backend", async () => {
    render(<RegistroForm />);
    type("Nombre completo", "A");
    type("Correo electrónico", "ana@");
    type("Teléfono", "70000000");
    type("Código de unidad", "abc");
    type("Contraseña", "clave1234");
    type("Confirmar contraseña", "otra");

    await submit();

    expect(screen.getByText("El nombre debe tener de 2 a 80 caracteres.")).toBeTruthy();
    expect(screen.getByText("Ingresa un correo válido.")).toBeTruthy();
    expect(screen.getByText("Ingresa el teléfono con el formato 0000-0000.")).toBeTruthy();
    expect(screen.getByText("El código de unidad tiene 8 caracteres en mayúsculas.")).toBeTruthy();
    expect(screen.getByText("La contraseña necesita una minúscula, una mayúscula y un número.")).toBeTruthy();
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("AC1: rechaza nombres con números y contraseñas de menos de 8; conserva los datos sin las contraseñas", async () => {
    render(<RegistroForm />);
    fillValid();
    type("Nombre completo", "Ana 2");
    type("Contraseña", "Ab1");
    type("Confirmar contraseña", "Ab1");

    await submit();

    expect(screen.getByText("Usa solo letras, espacios, apóstrofo o guion.")).toBeTruthy();
    expect(screen.getByText("La contraseña debe tener de 8 a 72 caracteres.")).toBeTruthy();
    expect((screen.getByLabelText("Correo electrónico") as HTMLInputElement).value).toBe("ana@condominio.test");
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).value).toBe("");
  });

  it("AC1: el código de unidad inexistente (404) se muestra junto a su campo", async () => {
    getSession.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn(async () => json(404, { message: "El código de unidad no existe." })));
    render(<RegistroForm />);
    fillValid();

    await submit();

    const unitCode = screen.getByLabelText("Código de unidad");
    expect(unitCode.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("El código de unidad no existe.")).toBeTruthy();
  });

  it("AC2: con registro exitoso redirige a /login con el aviso \"Cuenta creada. Inicia sesión.\"", async () => {
    getSession.mockResolvedValue(undefined);
    const fetchMock = vi.fn(async () => json(201, { id: "u9", role: "RESIDENTE" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<RegistroForm />);
    fillValid();

    await submit();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, { body: string }];
    expect(url.toString()).toBe("http://localhost:3000/api/v1/auth/registro");
    expect(JSON.parse(init.body)).not.toHaveProperty("role");
    expect(JSON.parse(init.body)).not.toHaveProperty("confirmPassword");
    expect(redirect).toHaveBeenCalledWith("/login?aviso=cuenta-creada");

    render(await LoginPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ aviso: "cuenta-creada" }) } as PageProps<"/login">));
    expect(screen.getByRole("status").textContent).toBe("Cuenta creada. Inicia sesión.");
  });

  it("AC3: si el rol no coincide, el layout muestra \"No tienes permiso para ver esta página.\" y un enlace a Inicio", async () => {
    getCurrentUser.mockResolvedValue(user("RESIDENTE"));

    render(await RoleLayout({ role: "ADMINISTRADOR", children: <p>Contenido de administración</p> }));

    expect(screen.getByText("No tienes permiso para ver esta página.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir a Inicio" }).getAttribute("href")).toBe("/");
    expect(screen.queryByText("Contenido de administración")).toBeNull();
  });

  it("AC3: con el rol correcto muestra la página", async () => {
    getCurrentUser.mockResolvedValue(user("SEGURIDAD"));

    render(await RoleLayout({ role: "SEGURIDAD", children: <p>Entradas</p> }));

    expect(screen.queryByText("No tienes permiso para ver esta página.")).toBeNull();
    expect(screen.getAllByText("Entradas").length).toBeGreaterThan(0);
  });

  it("AC3: el menú lateral muestra solo las opciones del rol de la sesión", async () => {
    getCurrentUser.mockResolvedValue(user("RESIDENTE"));

    render(await RoleLayout({ role: "RESIDENTE", children: null }));

    const nav = screen.getByRole("navigation");
    const hrefs = within(nav).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(NAV_BY_ROLE.RESIDENTE.map((item) => item.href));
    expect(hrefs.some((href) => href?.startsWith("/admin") || href?.startsWith("/seguridad"))).toBe(false);
  });

  it("AC3: cada rol tiene su propio menú, sin rutas de otros grupos", () => {
    const otherGroups = (href: string, own: string) =>
      ["/admin", "/seguridad"].filter((prefix) => prefix !== own).some((prefix) => href.startsWith(prefix));

    expect(NAV_BY_ROLE.RESIDENTE.some((i) => otherGroups(i.href, ""))).toBe(false);
    expect(NAV_BY_ROLE.ADMINISTRADOR.some((i) => otherGroups(i.href, "/admin"))).toBe(false);
    expect(NAV_BY_ROLE.SEGURIDAD.some((i) => otherGroups(i.href, "/seguridad"))).toBe(false);
  });

  it("AC4: si el backend responde 401 con sesión, apiFetch manda a la ruta que borra la cookie", async () => {
    getSession.mockResolvedValue("token-vencido");
    vi.stubGlobal("fetch", vi.fn(async () => json(401, { message: "Unauthorized" })));
    const real = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

    await real.apiFetch("estado-cuenta");

    expect(redirect).toHaveBeenCalledWith("/sesion/expirada");
  });

  it("AC4: sin sesión, un 401 no redirige (por ejemplo, credenciales inválidas en el login)", async () => {
    getSession.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn(async () => json(401, { message: "Credenciales inválidas." })));
    const real = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

    const res = await real.apiFetch("auth/login", { method: "POST", body: "{}" });

    expect(res.status).toBe(401);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("AC4: la ruta borra la cookie de sesión y redirige a /login con \"Tu sesión expiró. Inicia sesión de nuevo.\"", async () => {
    const response = sesionExpirada(
      new NextRequest("http://localhost:3001/sesion/expirada", { headers: { cookie: "session=token-vencido" } }),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3001/login?aviso=sesion-expirada");
    expect(response.headers.get("set-cookie")).toMatch(/^session=;.*Expires=Thu, 01 Jan 1970/);

    render(await LoginPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ aviso: "sesion-expirada" }) } as PageProps<"/login">));
    expect(screen.getByRole("status").textContent).toBe("Tu sesión expiró. Inicia sesión de nuevo.");
  });
});
