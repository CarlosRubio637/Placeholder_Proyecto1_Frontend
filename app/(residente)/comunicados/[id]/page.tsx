import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/api";
import { todaySV } from "@/lib/areas";
import {
  NOT_FOUND_MESSAGE,
  categoryLabel,
  comunicadosHref,
  fechaCorta,
  fechaVigencia,
  lecturaText,
  parseListParams,
} from "@/lib/comunicados";
import { abrirComunicado } from "@/lib/comunicados-api";

export const metadata: Metadata = {
  title: "Comunicado",
};

function VolverLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-sm underline underline-offset-4">
      Volver a comunicados
    </Link>
  );
}

export default async function ComunicadoPage(
  props: PageProps<"/comunicados/[id]">,
) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const { id } = await props.params;
  const volver = comunicadosHref(parseListParams(await props.searchParams));
  const result = await abrirComunicado(id);

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

  const comunicado = result.comunicado;
  const archived = comunicado.expiresOn < todaySV();

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <VolverLink href={volver} />
      <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <header className="flex flex-col gap-2">
          <span className="w-fit rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {categoryLabel(comunicado.category)}
          </span>
          <h1 className="text-2xl font-semibold wrap-anywhere">
            {comunicado.title}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Publicado el {fechaCorta(comunicado.publishedAt)}.{" "}
            {archived ? "Archivado, vigente hasta el" : "Vigente hasta el"}{" "}
            {fechaVigencia(comunicado.expiresOn)}.
          </p>
        </header>
        <p className="leading-relaxed wrap-anywhere whitespace-pre-wrap">
          {comunicado.body}
        </p>
        <p className="border-t border-zinc-200 pt-4 text-sm text-emerald-700 dark:border-zinc-800 dark:text-emerald-400">
          {lecturaText(comunicado.readAt)}
        </p>
      </article>
    </div>
  );
}
