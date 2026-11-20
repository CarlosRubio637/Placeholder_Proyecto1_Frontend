"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/navigation";

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
                className="block whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors hover:bg-zinc-100 md:border-l-4 md:border-transparent md:py-2.5 md:hover:bg-zinc-700/60 md:aria-[current=page]:border-sage aria-[current=page]:bg-primary! aria-[current=page]:font-medium aria-[current=page]:text-white dark:hover:bg-zinc-900 md:dark:hover:bg-zinc-700 dark:aria-[current=page]:bg-primary!"
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
