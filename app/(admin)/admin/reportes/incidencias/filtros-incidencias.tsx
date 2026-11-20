import { REPORTE_INCIDENCIAS_PATH, type Periodo } from "@/lib/validation/reporte-incidencias";
import { FiltrosPeriodo } from "../_components/filtros-periodo";

// Selector de periodo del reporte de incidencias (H34). El formulario es el de
// todos los reportes (H33); aquí solo se fija la ruta y la ayuda.
export function FiltrosIncidencias(props: { periodo: Periodo; desde: string; hasta: string }) {
  return (
    <FiltrosPeriodo path={REPORTE_INCIDENCIAS_PATH} ayuda="por fecha de creación" {...props} />
  );
}
