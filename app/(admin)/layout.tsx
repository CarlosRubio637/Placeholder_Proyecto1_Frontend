import { RoleLayout } from "@/app/_components/role-layout";

// Pantallas solo para el rol ADMINISTRADOR (H38).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RoleLayout role="ADMINISTRADOR">{children}</RoleLayout>;
}
