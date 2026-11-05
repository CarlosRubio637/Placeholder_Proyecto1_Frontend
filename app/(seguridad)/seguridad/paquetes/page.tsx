'use client';

import { useState } from 'react';

// Tipado y datos iniciales
type Package = {
  id: string; code: string; unit: string; courier: string; 
  trackingNumber: string; receivedAt: string; notes: string;
};

const initialPackages: Package[] = [
  { id: '1', code: 'PQ-20261031-0014', unit: 'A-101', courier: 'DHL', trackingNumber: '4581-2203', receivedAt: '31/10 10:42', notes: 'Caja mediana' },
  { id: '2', code: 'PQ-20261031-0013', unit: 'C-304', courier: 'Correos de El Salvador', trackingNumber: '—', receivedAt: '31/10 09:20', notes: '' },
];

const mockTowers = [{ id: 'A', name: 'Torre A' }, { id: 'B', name: 'Torre B' }, { id: 'C', name: 'Torre C' }];
const unitsByTower: Record<string, { id: string; name: string }[]> = {
  A: [{ id: 'A-101', name: 'A-101' }, { id: 'A-102', name: 'A-102' }],
  B: [{ id: 'B-101', name: 'B-101' }, { id: 'B-202', name: 'B-202' }],
  C: [{ id: 'C-304', name: 'C-304' }],
};

export default function PaqueteriaSeguridadPage() {
  const [packages, setPackages] = useState<Package[]>(initialPackages);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados del modal
  const [selectedTower, setSelectedTower] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  const availableUnits = selectedTower ? unitsByTower[selectedTower] || [] : [];

  // Filtrado funcional de la tabla
  const filteredPackages = packages.filter(pkg => 
    pkg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRegisterPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTower || !selectedUnit || !courier) return;

    const now = new Date();
    const newPkg: Package = {
      id: Date.now().toString(),
      code: `PQ-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`,
      unit: selectedUnit,
      courier,
      trackingNumber: trackingNumber.trim() || '—',
      receivedAt: `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      notes,
    };

    setPackages([newPkg, ...packages]);
    setIsModalOpen(false);
    setSelectedTower(''); setSelectedUnit(''); setCourier(''); setTrackingNumber(''); setNotes('');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paquetería</h1>
          <p className="text-sm text-gray-500">/seguridad/paquetes</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-700 hover:bg-teal-800 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Registrar paquete
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
        <input
          type="text"
          id="search"
          placeholder="Código, guía o unidad"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guía</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recibido</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observaciones</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPackages.map((pkg) => (
              <tr key={pkg.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pkg.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.courier}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.trackingNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.receivedAt}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.notes}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => setPackages(packages.filter(p => p.id !== pkg.id))} className="bg-teal-700 hover:bg-teal-800 text-white px-3 py-1 rounded text-sm transition-colors">
                    Entregar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">Pendientes de entrega · 20 por página</span>
          <div className="space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50">Anterior</button>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100">Siguiente</button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Registrar llegada de paquete</h2>
            <form onSubmit={handleRegisterPackage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Torre *</label>
                <select value={selectedTower} onChange={(e) => { setSelectedTower(e.target.value); setSelectedUnit(''); }} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border">
                  <option value="">Selecciona</option>
                  {mockTowers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unidad *</label>
                <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} disabled={!selectedTower} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border disabled:bg-gray-50">
                  <option value="">{selectedTower ? 'Selecciona unidad' : 'Selecciona (Elige torre primero)'}</option>
                  {availableUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Empresa de mensajería *</label>
                <input type="text" value={courier} onChange={(e) => setCourier(e.target.value)} required placeholder="Ej. DHL, Amazon" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Número de guía</label>
                <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Opcional" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Caja grande, frágil..." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"></textarea>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-teal-700 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-teal-800 transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}