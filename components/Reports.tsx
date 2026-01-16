import React from 'react';
import { Product, LedgerEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface ReportsProps {
  inventory: Product[];
  ledger: LedgerEntry[];
}

const Reports: React.FC<ReportsProps> = ({ inventory, ledger }) => {
  // Perhitungan Aset Stok
  const nilaiAsetStok = inventory.reduce((sum, item) => sum + (item.harga_beli * item.stok), 0);
  const potensiOmset = inventory.reduce((sum, item) => sum + (item.harga_jual * item.stok), 0);
  
  // Perhitungan Kas
  const kasTotal = ledger.reduce((sum, item) => sum + (item.debit || 0) - (item.kredit || 0), 0);
  
  // Perhitungan Laba Rugi Sederhana (Berdasarkan Kategori Ledger)
  // Asumsi: Debit kategori 'Penjualan' adalah Omset
  // Asumsi: Kredit kategori 'Belanja Stok' adalah Pengeluaran HPP (Simple approach)
  // Asumsi: Kredit kategori lain adalah Operasional
  
  const omsetPenjualan = ledger
    .filter(l => l.kategori === 'Penjualan')
    .reduce((sum, l) => sum + (l.debit || 0), 0);
    
  const belanjaStok = ledger
    .filter(l => l.kategori === 'Belanja Stok')
    .reduce((sum, l) => sum + (l.kredit || 0), 0);

  const biayaOperasional = ledger
    .filter(l => l.kredit > 0 && l.kategori !== 'Belanja Stok')
    .reduce((sum, l) => sum + l.kredit, 0);

  const labaBersih = omsetPenjualan - belanjaStok - biayaOperasional;

  // Chart Data: Komposisi Aset
  const assetData = [
    { name: 'Uang Kas Tunai', value: Math.max(0, kasTotal), color: '#3B82F6' },
    { name: 'Nilai Stok Barang', value: nilaiAsetStok, color: '#10B981' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Laporan Keuangan Real-time</h2>

      {/* Neraca Sederhana */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Neraca Keuangan (Posisi Aset)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {assetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => `Rp ${value.toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Kas di Tangan</span>
              <span className="font-bold">Rp {kasTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Nilai Aset Stok (Modal)</span>
              <span className="font-bold">Rp {nilaiAsetStok.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
              <span>Total Aset</span>
              <span className="text-blue-600">Rp {(kasTotal + nilaiAsetStok).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Laba Rugi */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-700 mb-6">Estimasi Laba / Rugi</h3>
          
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-xs text-green-600 uppercase font-bold">Total Penjualan (Omset)</p>
                <p className="text-xl font-bold text-gray-800">Rp {omsetPenjualan.toLocaleString()}</p>
              </div>
            </div>

            <div className="relative pl-8 space-y-3 border-l-2 border-gray-200 ml-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>(-) Pembelian Stok Barang</span>
                <span className="font-mono text-red-500">Rp {belanjaStok.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>(-) Biaya Operasional</span>
                <span className="font-mono text-red-500">Rp {biayaOperasional.toLocaleString()}</span>
              </div>
            </div>

            <div className={`p-4 rounded-lg flex justify-between items-center ${labaBersih >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
              <div>
                <p className={`text-xs uppercase font-bold ${labaBersih >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {labaBersih >= 0 ? 'Laba Bersih' : 'Rugi'}
                </p>
                <p className={`text-2xl font-bold ${labaBersih >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  Rp {labaBersih.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="text-xs text-gray-400 mt-4 text-center">
              * Perhitungan berdasarkan arus kas masuk/keluar di Buku Kas.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;