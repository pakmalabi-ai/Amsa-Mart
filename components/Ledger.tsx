import React from 'react';
import { LedgerEntry } from '../types';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface LedgerProps {
  data: LedgerEntry[];
}

const Ledger: React.FC<LedgerProps> = ({ data }) => {
  // Sorting data terbaru diatas
  const sortedData = [...data].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  
  const totalDebit = data.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
  const totalKredit = data.reduce((acc, curr) => acc + (Number(curr.kredit) || 0), 0);
  const saldoAkhir = totalDebit - totalKredit;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
          <div className="flex items-center space-x-3 text-green-600 mb-2">
            <div className="p-2 bg-green-100 rounded-lg"><ArrowDownLeft size={20} /></div>
            <span className="font-semibold text-sm uppercase">Total Pemasukan (Debit)</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">Rp {totalDebit.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
          <div className="flex items-center space-x-3 text-red-600 mb-2">
            <div className="p-2 bg-red-100 rounded-lg"><ArrowUpRight size={20} /></div>
            <span className="font-semibold text-sm uppercase">Total Pengeluaran (Kredit)</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">Rp {totalKredit.toLocaleString()}</p>
        </div>

        <div className="bg-blue-600 p-6 rounded-xl shadow-md text-white">
           <div className="mb-2 opacity-80 font-semibold text-sm uppercase">Saldo Kas Saat Ini</div>
           <p className="text-3xl font-bold">Rp {saldoAkhir.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-700">Riwayat Mutasi Kas</h3>
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
                  <td colSpan={5} className="p-8 text-center text-gray-400">Belum ada data transaksi</td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(row.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
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