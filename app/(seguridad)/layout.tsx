import { RoleLayout } from "@/app/_components/role-layout";

// Pantallas solo para el rol SEGURIDAD (H38).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RoleLayout role="SEGURIDAD">{children}</RoleLayout>;
}
