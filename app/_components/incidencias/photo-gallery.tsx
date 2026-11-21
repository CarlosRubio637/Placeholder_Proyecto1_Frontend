"use client";

import { useRef, useState } from "react";

type Photo = { id: string; url: string };

// Miniaturas de las fotos de una incidencia; al hacer clic se amplían en un
// <dialog> (H11). Las imágenes pasan por /archivos, que agrega el token.
export function PhotoGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(0);

  function open(index: number) {
    setCurrent(index);
    dialog.current?.showModal();
  }

  const src = (photo: Photo) => `/archivos/${photo.url}`;
  const photo = photos[current];

  return (
    <>
      <ul className="grid grid-cols-3 gap-3">
        {photos.map((p, index) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => open(index)}
              className="block w-full overflow-hidden rounded-md border border-zinc-200 focus:outline-2 focus:outline-offset-2 dark:border-zinc-800"
              aria-label={`Ampliar fotografía ${index + 1} de ${photos.length}`}
            >
              {/* Imagen protegida servida por /archivos; no pasa por next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src(p)}
                alt={`Fotografía ${index + 1} de la incidencia “${title}”`}
                className="aspect-[4/3] w-full bg-zinc-100 object-cover dark:bg-zinc-900"
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClick={(event) => {
          // Clic fuera de la imagen (en el fondo) cierra.
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="m-auto max-h-[90vh] max-w-[min(90vw,1000px)] rounded-lg bg-background p-0 text-foreground backdrop:bg-black/70"
      >
        {photo ? (
          <div className="flex flex-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src(photo)}
              alt={`Fotografía ${current + 1} de la incidencia “${title}”`}
              className="max-h-[75vh] w-full object-contain"
            />
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="tabular-nums text-zinc-500">
                {current + 1} de {photos.length}
              </span>
              <div className="flex gap-2">
                {photos.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrent((current - 1 + photos.length) % photos.length)}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrent((current + 1) % photos.length)}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
                    >
                      Siguiente
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => dialog.current?.close()}
                  className="rounded-md bg-foreground px-3 py-1.5 font-medium text-background"
                  autoFocus
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
