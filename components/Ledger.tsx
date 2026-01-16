import React, { useState } from 'react';
import { LedgerEntry } from '../types';
import { ArrowDownLeft, ArrowUpRight, Download, Filter } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface LedgerProps {
  data: LedgerEntry[];
}

const Ledger: React.FC<LedgerProps> = ({ data }) => {
  // State Filter Bulan
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Filter Data berdasarkan Bulan
  const filteredData = data.filter(item => item.tanggal.startsWith(selectedMonth));

  // Sorting data terbaru diatas
  const sortedData = [...filteredData].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  
  const totalDebit = filteredData.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
  const totalKredit = filteredData.reduce((acc, curr) => acc + (Number(curr.kredit) || 0), 0);
  const saldoPeriode = totalDebit - totalKredit;

  const handleExport = () => {
    const exportData = sortedData.map(d => ({
      Tanggal: new Date(d.tanggal).toLocaleDateString('id-ID'),
      Kategori: d.kategori,
      Deskripsi: d.deskripsi,
      Masuk: d.debit,
      Keluar: d.kredit
    }));
    exportToExcel(exportData, `Buku_Kas_${selectedMonth}`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
         <h2 className="text-2xl font-bold text-gray-800">Buku Kas & Operasional</h2>
         
         <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
           <Filter size={18} className="text-gray-400" />
           <input 
             type="month" 
             value={selectedMonth}
             onChange={(e) => setSelectedMonth(e.target.value)}
             className="border-none outline-none text-sm text-gray-700 font-medium"
           />
           <div className="h-6 w-px bg-gray-300 mx-2"></div>
           <button 
             onClick={handleExport}
             className="text-sm font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
           >
             <Download size={16} /> Ekspor Excel
           </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
          <div className="flex items-center space-x-3 text-green-600 mb-2">
            <div className="p-2 bg-green-100 rounded-lg"><ArrowDownLeft size={20} /></div>
            <span className="font-semibold text-sm uppercase">Pemasukan (Bulan Ini)</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">Rp {totalDebit.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
          <div className="flex items-center space-x-3 text-red-600 mb-2">
            <div className="p-2 bg-red-100 rounded-lg"><ArrowUpRight size={20} /></div>
            <span className="font-semibold text-sm uppercase">Pengeluaran (Bulan Ini)</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">Rp {totalKredit.toLocaleString()}</p>
        </div>

        <div className="bg-blue-600 p-6 rounded-xl shadow-md text-white">
           <div className="mb-2 opacity-80 font-semibold text-sm uppercase">Selisih Periode Ini</div>
           <p className="text-3xl font-bold">Rp {saldoPeriode.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-700">Riwayat Mutasi Kas: {new Date(selectedMonth).toLocaleDateString('id-ID', {month: 'long', year: 'numeric'})}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Deskripsi</th>
                <th className="p-4 text-right text-green-600">Debit (Masuk)</th>
                <th className="p-4 text-right text-red-600">Kredit (Keluar)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">Belum ada data transaksi di bulan ini</td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(row.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
                    </td>
                    <td className="p-4 text-sm">
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{row.kategori}</span>
                    </td>
                    <td className="p-4 text-sm text-gray-800">{row.deskripsi}</td>
                    <td className="p-4 text-right font-mono text-sm text-green-600">
                      {row.debit > 0 ? `+ Rp ${row.debit.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-red-600">
                      {row.kredit > 0 ? `- Rp ${row.kredit.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Ledger;