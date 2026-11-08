import { RoleLayout } from "@/app/_components/role-layout";

// Pantallas que comparten Residente y Administrador (H6).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RoleLayout role={["RESIDENTE", "ADMINISTRADOR"]}>{children}</RoleLayout>;
}
