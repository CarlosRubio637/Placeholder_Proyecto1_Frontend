// Reglas del formulario "Crear cuenta" (H38). Deben coincidir con las
// validaciones del DTO de POST /auth/registro en el backend.

export type RegistroValues = {
  fullName: string;
  email: string;
  phone: string;
  unitCode: string;
  password: string;
  confirmPassword: string;
};

export type RegistroField = keyof RegistroValues;
export type RegistroErrors = Partial<Record<RegistroField, string>>;

// Letras (con tildes, diéresis y ñ), espacios, apóstrofo y guion.
const FULL_NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;
const HAS_LETTER_REGEX = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{4}-\d{4}$/;
const UNIT_CODE_REGEX = /^[A-Z0-9]{8}$/;

export function readRegistroValues(formData: FormData): RegistroValues {
  const text = (name: RegistroField) => String(formData.get(name) ?? "");
  return {
    fullName: text("fullName").trim().replace(/\s+/g, " "),
    email: text("email").trim(),
    phone: text("phone").trim(),
    unitCode: text("unitCode").trim().toUpperCase(),
    password: text("password"),
    confirmPassword: text("confirmPassword"),
  };
}

export function validateRegistro(values: RegistroValues): RegistroErrors {
  const errors: RegistroErrors = {};
  const { fullName, email, phone, unitCode, password, confirmPassword } = values;

  if (fullName.length < 2 || fullName.length > 80) {
    errors.fullName = "El nombre debe tener de 2 a 80 caracteres.";
  } else if (!FULL_NAME_REGEX.test(fullName) || !HAS_LETTER_REGEX.test(fullName)) {
    errors.fullName = "Usa solo letras, espacios, apóstrofo o guion.";
  }

  if (!EMAIL_REGEX.test(email)) {
    errors.email = "Ingresa un correo válido.";
  } else if (email.length > 254) {
    errors.email = "El correo no puede tener más de 254 caracteres.";
  }

  if (!PHONE_REGEX.test(phone)) {
    errors.phone = "Ingresa el teléfono con el formato 0000-0000.";
  }

  if (!UNIT_CODE_REGEX.test(unitCode)) {
    errors.unitCode = "El código de unidad tiene 8 caracteres en mayúsculas.";
  }

  if (password.length < 8 || password.length > 72) {
    errors.password = "La contraseña debe tener de 8 a 72 caracteres.";
  } else if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    errors.password = "La contraseña necesita una minúscula, una mayúscula y un número.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }

  return errors;
}
