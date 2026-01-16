import React, { useState } from 'react';
import { Product, LedgerEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Download, Calendar } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface ReportsProps {
  inventory: Product[];
  ledger: LedgerEntry[];
}

const Reports: React.FC<ReportsProps> = ({ inventory, ledger }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Filter Data Ledger per bulan untuk Laba Rugi
  const monthlyLedger = ledger.filter(l => l.tanggal.startsWith(selectedMonth));

  // Perhitungan Aset Stok (Snapshot Saat Ini - tidak terpengaruh filter bulan)
  const nilaiAsetStok = inventory.reduce((sum, item) => sum + (item.harga_beli * item.stok), 0);
  
  // Perhitungan Kas Total (Akumulatif - tidak terpengaruh filter bulan, kecuali kita mau saldo awal)
  const kasTotal = ledger.reduce((sum, item) => sum + (item.debit || 0) - (item.kredit || 0), 0);
  
  // --- Perhitungan Laporan Laba Rugi Bulanan ---
  const omsetPenjualan = monthlyLedger
    .filter(l => l.kategori === 'Penjualan')
    .reduce((sum, l) => sum + (l.debit || 0), 0);
    
  const belanjaStok = monthlyLedger
    .filter(l => l.kategori === 'Belanja Stok')
    .reduce((sum, l) => sum + (l.kredit || 0), 0);

  const biayaOperasional = monthlyLedger
    .filter(l => l.kredit > 0 && l.kategori !== 'Belanja Stok')
    .reduce((sum, l) => sum + l.kredit, 0);

  const labaBersih = omsetPenjualan - belanjaStok - biayaOperasional;

  // Chart Data: Komposisi Aset
  const assetData = [
    { name: 'Uang Kas Tunai', value: Math.max(0, kasTotal), color: '#3B82F6' },
    { name: 'Nilai Stok Barang', value: nilaiAsetStok, color: '#10B981' },
  ];

  const handleExportMonthly = () => {
    const dataExport = [
      { Item: 'Periode', Nilai: selectedMonth },
      { Item: 'Omset Penjualan', Nilai: omsetPenjualan },
      { Item: 'Belanja Stok', Nilai: -belanjaStok },
      { Item: 'Biaya Operasional', Nilai: -biayaOperasional },
      { Item: 'LABA BERSIH', Nilai: labaBersih },
      { Item: '---', Nilai: '---' },
      { Item: 'Total Aset Stok (Saat Ini)', Nilai: nilaiAsetStok },
      { Item: 'Total Kas (Saat Ini)', Nilai: kasTotal },
    ];
    exportToExcel(dataExport, `Laporan_Keuangan_${selectedMonth}`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Laporan Keuangan & Analisa</h2>
        
        <div className="flex gap-3">
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300">
             <Calendar size={16} className="text-gray-500" />
             <input 
               type="month" 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="text-sm outline-none text-gray-700"
             />
          </div>
          <button 
            onClick={handleExportMonthly}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow"
          >
            <Download size={16} /> Export Excel Bulanan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Laba Rugi Bulanan */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="mb-6 flex justify-between items-center">
             <h3 className="text-lg font-bold text-gray-700">Laporan Laba Rugi (Bulanan)</h3>
             <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{new Date(selectedMonth).toLocaleDateString('id-ID', {month: 'long', year: 'numeric'})}</span>
          </div>
          
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
          </div>
        </div>

        {/* Neraca Sederhana (Chart) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Posisi Aset Saat Ini</h3>
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
            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
              <span>Total Aset</span>
              <span className="text-blue-600">Rp {(kasTotal + nilaiAsetStok).toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              * Grafik menunjukkan posisi keuangan akumulatif saat ini, bukan per bulan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;