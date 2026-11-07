// Reglas del formulario "Reportar incidencia" (H10). Deben coincidir con
// CreateIncidentDto y la validación de fotos del backend (POST /incidencias).

export const LOCATIONS = [
  { value: "TORRE_A", label: "Torre A" },
  { value: "TORRE_B", label: "Torre B" },
  { value: "TORRE_C", label: "Torre C" },
  { value: "ESTACIONAMIENTO", label: "Estacionamiento" },
  { value: "PISCINA", label: "Piscina" },
  { value: "GIMNASIO", label: "Gimnasio" },
  { value: "SALON", label: "Salón de eventos" },
  { value: "ASADOR", label: "Asador" },
  { value: "LOBBY", label: "Lobby" },
  { value: "AREAS_VERDES", label: "Áreas verdes" },
  { value: "OTRA", label: "Otra" },
] as const;

export type IncidentLocation = (typeof LOCATIONS)[number]["value"];

export const LIMITS = {
  titleMin: 5,
  titleMax: 80,
  descriptionMin: 10,
  descriptionMax: 1000,
  locationDetailMax: 100,
  maxPhotos: 3,
  maxPhotoBytes: 5 * 1024 * 1024,
} as const;

export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"] as const;

export const MESSAGES = {
  title: "El título debe tener entre 5 y 80 caracteres.",
  description: "La descripción debe tener entre 10 y 1,000 caracteres.",
  location: "Selecciona una ubicación.",
  locationDetail: "La referencia de la ubicación no puede superar los 100 caracteres.",
  photosRequired: "Agrega al menos una fotografía.",
  photoInvalid: "Solo se permiten imágenes JPG o PNG de hasta 5 MB.",
  photosTooMany: "Puedes adjuntar como máximo 3 fotografías.",
} as const;

export type IncidenciaValues = {
  title: string;
  description: string;
  location: string;
  locationDetail: string;
};

export type IncidenciaField = keyof IncidenciaValues | "photos";
export type IncidenciaErrors = Partial<Record<IncidenciaField, string>>;

export function readIncidenciaValues(formData: FormData): IncidenciaValues {
  const text = (name: keyof IncidenciaValues) => String(formData.get(name) ?? "").trim();
  return {
    title: text("title"),
    description: text("description"),
    location: text("location"),
    locationDetail: text("locationDetail"),
  };
}

/** Errores de los campos de texto (los de las fotos van aparte). */
export function validateIncidencia(values: IncidenciaValues): IncidenciaErrors {
  const errors: IncidenciaErrors = {};
  const { title, description, location, locationDetail } = values;

  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) {
    errors.title = MESSAGES.title;
  }
  if (description.length < LIMITS.descriptionMin || description.length > LIMITS.descriptionMax) {
    errors.description = MESSAGES.description;
  }
  if (!LOCATIONS.some((option) => option.value === location)) {
    errors.location = MESSAGES.location;
  }
  if (locationDetail.length > LIMITS.locationDetailMax) {
    errors.locationDetail = MESSAGES.locationDetail;
  }
  return errors;
}

type PhotoLike = { type: string; size: number };

/** Una foto es válida si es JPG o PNG de hasta 5 MB (el backend revisa además el contenido). */
export function isValidPhoto(file: PhotoLike): boolean {
  return (
    (ALLOWED_PHOTO_TYPES as readonly string[]).includes(file.type) &&
    file.size > 0 &&
    file.size <= LIMITS.maxPhotoBytes
  );
}

/** Error del conjunto de fotos, o undefined si está bien. */
export function validatePhotos(files: PhotoLike[]): string | undefined {
  if (files.length === 0) return MESSAGES.photosRequired;
  if (files.length > LIMITS.maxPhotos) return MESSAGES.photosTooMany;
  if (!files.every(isValidPhoto)) return MESSAGES.photoInvalid;
  return undefined;
}
