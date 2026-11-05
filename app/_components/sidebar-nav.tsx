"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/navigation";

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menú principal">
      <ul className="flex gap-1 md:flex-col">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="block rounded-md px-3 py-2 text-sm hover:bg-zinc-100 aria-[current=page]:bg-zinc-200 aria-[current=page]:font-medium dark:hover:bg-zinc-900 dark:aria-[current=page]:bg-zinc-800"
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
