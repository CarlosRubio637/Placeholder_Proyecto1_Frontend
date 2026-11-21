import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import {
  NOT_FOUND_MESSAGE,
  audienceLabel,
  categoryLabel,
  fechaCorta,
  fechaVigencia,
} from "@/lib/comunicados";
import {
  READERS_PAGE_SIZE,
  adminComunicadosHref,
  lastPageOf,
  lecturasHref,
  lecturasText,
  parseReadsParams,
  porcentajeText,
} from "@/lib/comunicados-admin";
import { getLecturas } from "@/lib/comunicados-api";
import { FiltroLectura } from "./filtro-lectura";
import { TablaDestinatarios } from "./tabla-destinatarios";

export const metadata: Metadata = {
  title: "Lecturas del comunicado",
};

function VolverLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-sm underline underline-offset-4">
      Volver a comunicados
    </Link>
  );
}

export default async function LecturasPage(
  props: PageProps<"/admin/comunicados/[id]">,
) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const { id } = await props.params;
  const { filtro, lista } = parseReadsParams(await props.searchParams);
  const volver = adminComunicadosHref(lista);
  const result = await getLecturas(id, filtro);

  if (!result.ok) {
    return (
      <div className="flex max-w-3xl flex-col items-start gap-4">
        <p role="alert" className="text-lg font-medium">
          {result.error === "forbidden"
            ? "No tienes permiso para ver esta página."
            : NOT_FOUND_MESSAGE}
        </p>
        <VolverLink href={volver} />
      </div>
    );
  }

  const { announcement, total } = result.lecturas;
  const lastPage = lastPageOf(total, READERS_PAGE_SIZE);
  if (filtro.page > lastPage)
    redirect(lecturasHref(id, { ...filtro, page: lastPage }, lista));

  return (
    <div className="flex min-w-0 max-w-5xl flex-col gap-6">
      <VolverLink href={volver} />

      <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <header className="flex flex-col gap-2">
          <span className="w-fit rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {categoryLabel(announcement.category)}
          </span>
          <h1 className="text-2xl font-semibold wrap-anywhere">
            {announcement.title}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Para{" "}
            {audienceLabel(
              announcement.audience === "TODOS" ? null : announcement.towers,
            )}
            . Publicado el {fechaCorta(announcement.publishedAt)}.{" "}
            {announcement.status === "VIGENTE"
              ? "Vigente hasta el"
              : "Archivado, vigente hasta el"}{" "}
            {fechaVigencia(announcement.expiresOn)}.
          </p>
        </header>
        <p className="leading-relaxed wrap-anywhere whitespace-pre-wrap">
          {announcement.body}
        </p>
        <p className="border-t border-zinc-200 pt-4 text-sm font-medium dark:border-zinc-800">
          Lecturas:{" "}
          {lecturasText(announcement.readCount, announcement.recipientCount)} (
          {porcentajeText(announcement.readPct)})
        </p>
      </article>

      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">Destinatarios</h2>
          <FiltroLectura id={id} read={filtro.read} lista={lista} />
        </div>
        <TablaDestinatarios
          id={id}
          lecturas={result.lecturas}
          filtro={filtro}
          lista={lista}
        />
      </section>
    </div>
  );
}
