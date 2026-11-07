"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import {
  registrarIncidencia,
  type RegistrarIncidenciaState,
} from "@/app/actions/incidencias";
import {
  LIMITS,
  LOCATIONS,
  MESSAGES,
  isValidPhoto,
  validateIncidencia,
  validatePhotos,
  type IncidenciaField,
  type IncidenciaValues,
} from "@/lib/validation/incidencia";

type Photo = { id: string; file: File; url: string };

const initialState: RegistrarIncidenciaState = {};
const emptyValues: IncidenciaValues = {
  title: "",
  description: "",
  location: "",
  locationDetail: "",
};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";

function trimmed(values: IncidenciaValues): IncidenciaValues {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    location: values.location,
    locationDetail: values.locationDetail.trim(),
  };
}

export function IncidenciaForm() {
  const [state, formAction, pending] = useActionState(registrarIncidencia, initialState);
  const [values, setValues] = useState<IncidenciaValues>(emptyValues);
  const [photos, setPhotos] = useState<Photo[]>([]);
  // Campos que el usuario ya tocó: sus errores se muestran desde ese momento.
  const [touched, setTouched] = useState<Partial<Record<IncidenciaField, boolean>>>({});
  // Campos editados después del último envío: ocultan el error del servidor.
  const [editedSinceSubmit, setEditedSinceSubmit] = useState<Set<IncidenciaField>>(new Set());
  // Aviso al elegir archivos (tipo/tamaño inválido o una cuarta foto).
  const [photoNotice, setPhotoNotice] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);

  // Libera las vistas previas al salir de la pantalla.
  const photosRef = useRef<Photo[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);

  const clean = trimmed(values);
  const clientErrors = validateIncidencia(clean);
  const photosError = validatePhotos(photos.map((photo) => photo.file));
  if (photosError) clientErrors.photos = photosError;
  const hasErrors = Object.keys(clientErrors).length > 0;

  function errorFor(field: IncidenciaField) {
    if (field === "photos" && photoNotice) return photoNotice;
    if (touched[field]) {
      const error = clientErrors[field];
      if (error) return error;
    }
    if (!editedSinceSubmit.has(field)) return state.errors?.[field];
    return undefined;
  }

  function markEdited(field: IncidenciaField) {
    setEditedSinceSubmit((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  }

  function update(field: keyof IncidenciaValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    markEdited(field);
  }

  function touch(field: IncidenciaField) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  function addPhotos(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    let notice: string | undefined;
    const next = [...photos];
    for (const file of files) {
      if (next.length >= LIMITS.maxPhotos) {
        notice = MESSAGES.photosTooMany;
        break;
      }
      if (!isValidPhoto(file)) {
        notice = MESSAGES.photoInvalid;
        continue;
      }
      next.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
    setPhotoNotice(notice);
    touch("photos");
    markEdited("photos");
  }

  function removePhoto(id: string) {
    const photo = photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setPhotoNotice(undefined);
    markEdited("photos");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ title: true, description: true, location: true, locationDetail: true, photos: true });
    if (hasErrors || pending) return;

    const formData = new FormData();
    formData.set("title", clean.title);
    formData.set("description", clean.description);
    formData.set("location", clean.location);
    formData.set("locationDetail", clean.locationDetail);
    for (const photo of photos) formData.append("photos", photo.file, photo.file.name);

    setEditedSinceSubmit(new Set());
    startTransition(() => formAction(formData));
  }

  const describedBy = (field: IncidenciaField, hint?: boolean) =>
    errorFor(field) ? `${field}-error` : hint ? `${field}-hint` : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Título
        </label>
        <input
          id="title"
          name="title"
          value={values.title}
          onChange={(e) => update("title", e.target.value)}
          onBlur={() => touch("title")}
          maxLength={LIMITS.titleMax}
          placeholder="Ej.: Fuga de agua en el pasillo"
          aria-invalid={errorFor("title") ? true : undefined}
          aria-describedby={describedBy("title")}
          className={inputClass}
        />
        <FieldError field="title" error={errorFor("title")} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="description" className="text-sm font-medium">
            Descripción
          </label>
          <span id="description-hint" className="text-xs text-zinc-500 tabular-nums">
            {clean.description.length.toLocaleString("es-SV")}/
            {LIMITS.descriptionMax.toLocaleString("es-SV")}
          </span>
        </div>
        <textarea
          id="description"
          name="description"
          rows={5}
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          onBlur={() => touch("description")}
          maxLength={LIMITS.descriptionMax}
          placeholder="Describe qué pasa, desde cuándo y cualquier detalle útil."
          aria-invalid={errorFor("description") ? true : undefined}
          aria-describedby={describedBy("description", true)}
          className={`${inputClass} resize-y`}
        />
        <FieldError field="description" error={errorFor("description")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="location" className="text-sm font-medium">
            Ubicación
          </label>
          <select
            id="location"
            name="location"
            value={values.location}
            onChange={(e) => {
              update("location", e.target.value);
              touch("location");
            }}
            onBlur={() => touch("location")}
            aria-invalid={errorFor("location") ? true : undefined}
            aria-describedby={describedBy("location")}
            className={`${inputClass} bg-background`}
          >
            <option value="" disabled>
              Selecciona la ubicación
            </option>
            {LOCATIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError field="location" error={errorFor("location")} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="locationDetail" className="text-sm font-medium">
            Referencia de la ubicación <span className="font-normal text-zinc-500">(opcional)</span>
          </label>
          <input
            id="locationDetail"
            name="locationDetail"
            value={values.locationDetail}
            onChange={(e) => update("locationDetail", e.target.value)}
            onBlur={() => touch("locationDetail")}
            maxLength={LIMITS.locationDetailMax}
            placeholder="Ej.: Piso 3, pasillo norte"
            aria-invalid={errorFor("locationDetail") ? true : undefined}
            aria-describedby={describedBy("locationDetail")}
            className={inputClass}
          />
          <FieldError field="locationDetail" error={errorFor("locationDetail")} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2" aria-describedby={describedBy("photos", true)}>
        <legend className="text-sm font-medium">Fotografías</legend>
        <p id="photos-hint" className="text-sm text-zinc-500">
          De 1 a 3 imágenes JPG o PNG, de hasta 5 MB cada una.
        </p>

        {photos.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <li
                key={photo.id}
                className="flex flex-col overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800"
              >
                {/* Vista previa local (blob:), no pasa por next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Fotografía ${index + 1}: ${photo.file.name}`}
                  className="aspect-[4/3] w-full bg-zinc-100 object-cover dark:bg-zinc-900"
                />
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="truncate text-xs text-zinc-500" title={photo.file.name}>
                    {photo.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="shrink-0 text-sm font-medium text-red-700 underline-offset-4 hover:underline dark:text-red-400"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
        <div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={photos.length >= LIMITS.maxPhotos}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700"
          >
            {photos.length === 0 ? "Agregar fotografía" : "Agregar otra"}{" "}
            <span className="text-zinc-500">
              ({photos.length}/{LIMITS.maxPhotos})
            </span>
          </button>
        </div>
        <FieldError field="photos" error={errorFor("photos")} />
      </fieldset>

      <p aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.formError}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={hasErrors || pending}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Registrando…" : "Registrar"}
        </button>
        <Link href="/incidencias" className="text-sm underline underline-offset-4">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function FieldError({ field, error }: { field: IncidenciaField; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${field}-error`} className="text-sm text-red-600">
      {error}
    </p>
  );
}
