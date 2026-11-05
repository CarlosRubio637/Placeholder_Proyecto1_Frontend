import { RoleLayout } from "@/app/_components/role-layout";

// Pantallas solo para el rol RESIDENTE (H38).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RoleLayout role="RESIDENTE">{children}</RoleLayout>;
}
