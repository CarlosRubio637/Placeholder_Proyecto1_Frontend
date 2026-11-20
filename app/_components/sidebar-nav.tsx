"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/navigation";

// Íconos del menú (SVG en línea, trazo de 24×24), elegidos por la ruta. Una
// ruta sin ícono se muestra solo con su texto.
const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  areas: (
    <>
      <path d="M3 21h18M5 21V10l7-5 7 5v11" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  incidencias: (
    <>
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  paquetes: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  visitas: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M17 11l2 2 4-4" />
    </>
  ),
  asambleas: (
    <>
      <path d="M4 4h16v12H4z" />
      <path d="M8 20h8M12 16v4M8 9l2 2 4-4" />
    </>
  ),
  comunicados: (
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z" />
      <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
    </>
  ),
  perfil: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  notificaciones: (
    <>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  cuotas: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  reporte: <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />,
  entradas: (
    <>
      <path d="M14 3h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5" />
      <path d="M3 12h11M10 8l4 4-4 4" />
    </>
  ),
};

function iconFor(href: string): React.ReactNode {
  if (href === "/") return ICONS.home;
  if (href.includes("/reportes/")) return ICONS.reporte;
  if (href === "/reservas") return ICONS.areas;
  const key = href.split("/").filter((part) => part && part !== "admin" && part !== "seguridad")[0];
  return key ? ICONS[key] : undefined;
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menú principal">
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors hover:bg-zinc-100 md:border-l-4 md:border-transparent md:py-2.5 md:hover:bg-zinc-700/60 md:aria-[current=page]:border-sage aria-[current=page]:bg-primary! aria-[current=page]:font-medium aria-[current=page]:text-white dark:hover:bg-zinc-900 md:dark:hover:bg-zinc-700 dark:aria-[current=page]:bg-primary!"
              >
                {iconFor(item.href) ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4.5 shrink-0 opacity-80"
                  >
                    {iconFor(item.href)}
                  </svg>
                ) : null}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
