'use client';

import { useState, useEffect, useCallback } from 'react';

// Tipado estricto según el diseño técnico de H20
type Package = {
  id: string;
  code: string;
  courier: string;
  trackingNumber: string;
  receivedAt: string;
  notes: string;
  daysWaiting?: number;
  deliveredAt?: string;
  pickedUpByName?: string;
  pickedUpByDocLast4?: string;
};

// Tipo de la respuesta esperada del backend de NestJS
type ApiResponse = {
  pendingCount: number;
  data: Package[];
  total: number;
  page: number;
  pageSize: number;
};

export default function MisPaquetesResidentePage() {
  const [activeTab, setActiveTab] = useState<'PENDIENTE_ENTREGA' | 'ENTREGADO'>('PENDIENTE_ENTREGA');
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para Paginación e Indicadores
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10; // Según criterio de aceptación

  // Función principal para consultar al backend
  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    
    try {
      /* 
        ===============================================================
        AQUÍ VA LA CONEXIÓN REAL A NESTJS CUANDO ESTÉ LISTO EL BACKEND
        ===============================================================
        const response = await fetch(`/api/v1/paquetes/mios?status=${activeTab}&page=${page}&pageSize=${pageSize}`);
        if (!response.ok) throw new Error('Error al cargar paquetes');
        const result: ApiResponse = await response.json();
        
        setPackages(result.data);
        setPendingCount(result.pendingCount);
        setTotalItems(result.total);
      */

      // --- SIMULACIÓN DEL BACKEND PARA PRUEBAS FRONTEND ---
      await new Promise(resolve => setTimeout(resolve, 600)); // Simular retraso de red
      
      if (activeTab === 'PENDIENTE_ENTREGA') {
        setPackages([
          { id: '1', code: 'PQ-20261031-0014', courier: 'DHL', trackingNumber: '4581-2203', receivedAt: '31/10/2026 10:42', daysWaiting: 0, notes: 'Caja mediana' },
          { id: '2', code: 'PQ-20261029-0009', courier: 'Amazon', trackingNumber: '—', receivedAt: '29/10/2026 15:10', daysWaiting: 2, notes: 'Sobre' },
        ]);
        setPendingCount(2);
        setTotalItems(2);
      } else {
        // Simular que no hay entregados en la página 2, o devolver datos en la página 1
        if (page === 1) {
          setPackages([
            { id: '3', code: 'PQ-20261025-0001', courier: 'FedEx', trackingNumber: '9999-1111', receivedAt: '25/10/2026 09:00', deliveredAt: '26/10/2026 14:30', pickedUpByName: 'Ana María López', pickedUpByDocLast4: '4321', notes: 'Caja grande' }
          ]);
          setTotalItems(1);
        } else {
          setPackages([]);
          setTotalItems(1);
        }
      }
    } catch (error) {
      console.error(error);
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page]); // Dependencias: si cambia la pestaña o la página, se reconstruye la función

  // Ejecutar fetch al abrir, al cambiar de pestaña o al cambiar de página
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Manejo de cambio de pestaña (reinicia a la página 1)
  const handleTabChange = (tab: 'PENDIENTE_ENTREGA' | 'ENTREGADO') => {
    setActiveTab(tab);
    setPage(1); 
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Mis paquetes</h1>
          <p className="text-sm text-gray-500">/paquetes</p>
        </div>
      </div>

      {/* Pestañas y Botón Actualizar */}
      <div className="flex justify-between items-end border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => handleTabChange('PENDIENTE_ENTREGA')}
            className={`pb-4 text-sm font-medium transition-colors ${
              activeTab === 'PENDIENTE_ENTREGA' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pendientes {pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
          <button
            onClick={() => handleTabChange('ENTREGADO')}
            className={`pb-4 text-sm font-medium transition-colors ${
              activeTab === 'ENTREGADO' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Entregados
          </button>
        </div>
        
        {/* Botón Actualizar según Jira */}
        <button
          onClick={fetchPackages}
          disabled={isLoading}
          className="mb-3 text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50 transition-colors flex items-center"
        >
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Guía</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recibido</th>
                
                {activeTab === 'PENDIENTE_ENTREGA' ? (
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Días en portería</th>
                ) : (
                  <>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha de entrega</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recogido por</th>
                  </>
                )}
                
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Observaciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* ESTADO 1: Cargando */}
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-4 h-4 rounded-full animate-pulse bg-teal-600"></div>
                      <div className="w-4 h-4 rounded-full animate-pulse bg-teal-600 delay-75"></div>
                      <div className="w-4 h-4 rounded-full animate-pulse bg-teal-600 delay-150"></div>
                    </div>
                  </td>
                </tr>
              ) : 
              /* ESTADO 2: Vacío (Mensajes exactos de Jira) */
              packages.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500">
                    {activeTab === 'PENDIENTE_ENTREGA' 
                      ? 'No tienes paquetes pendientes.' 
                      : 'Todavía no hay paquetes entregados.'}
                  </td>
                </tr>
              ) : 
              /* ESTADO 3: Con Datos */
              (
                packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pkg.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pkg.courier}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pkg.trackingNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pkg.receivedAt}</td>
                    
                    {activeTab === 'PENDIENTE_ENTREGA' ? (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{pkg.daysWaiting}</td>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pkg.deliveredAt}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pkg.pickedUpByName} <span className="text-gray-500">(***{pkg.pickedUpByDocLast4})</span>
                        </td>
                      </>
                    )}
                    
                    <td className="px-6 py-4 text-sm text-gray-900">{pkg.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con Paginación real */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {isLoading ? 'Calculando...' : `${totalItems} paquetes · ${pageSize} por página`}
          </span>
          <div className="space-x-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading || totalItems === 0}
              className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}