import React, { useState } from 'react';
import { Product, LedgerEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Download, Calendar, Wallet, CheckCircle, X, ArrowRight, Package, DollarSign, Activity } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';
import { Api } from '../services/api';

interface ReportsProps {
  inventory: Product[];
  ledger: LedgerEntry[];
  refreshData: () => void;
}

const Reports: React.FC<ReportsProps> = ({ inventory, ledger, refreshData }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  
  // State Modal Ambil Laba
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- PERHITUNGAN GLOBAL (ALL TIME) ---
  
  // 1. Total Modal Disetor (Kewajiban ke Pemilik)
  const totalModal = ledger
    .filter(l => l.kategori === 'Modal')
    .reduce((sum, l) => sum + (l.debit || 0), 0);

  // 2. Total Prive (Uang yang sudah dinikmati pemilik)
  const totalPrive = ledger
    .filter(l => l.kategori === 'Prive')
    .reduce((sum, l) => sum + (l.kredit || 0), 0);

  // 3. Saldo Kas Saat Ini (Uang Tunai di Tangan)
  const saldoKas = ledger.reduce((sum, item) => sum + (item.debit || 0) - (item.kredit || 0), 0);

  // 4. Nilai Aset Stok (Barang di Rak)
  const nilaiAsetStok = inventory.reduce((sum, item) => sum + (item.harga_beli * item.stok), 0);

  // 5. Rumus Laba Bersih Sebenarnya (Metode Net Worth)
  // Total Kekayaan Sekarang (Kas + Stok) + Yang Sudah Diambil (Prive) - Modal Awal
  const labaBersihAllTime = (saldoKas + nilaiAsetStok + totalPrive) - totalModal;


  // --- PERHITUNGAN BULANAN (CASHFLOW) ---
  const monthlyLedger = ledger.filter(l => l.tanggal.startsWith(selectedMonth));

  const omsetPenjualan = monthlyLedger
    .filter(l => l.kategori === 'Penjualan')
    .reduce((sum, l) => sum + (l.debit || 0), 0);
    
  const belanjaStok = monthlyLedger
    .filter(l => l.kategori === 'Belanja Stok')
    .reduce((sum, l) => sum + (l.kredit || 0), 0);

  // Biaya Operasional (Exclude 'Belanja Stok' dan 'Prive')
  const biayaOperasional = monthlyLedger
    .filter(l => l.kredit > 0 && l.kategori !== 'Belanja Stok' && l.kategori !== 'Prive')
    .reduce((sum, l) => sum + l.kredit, 0);

  // Prive Bulanan
  const priveBulanan = monthlyLedger
    .filter(l => l.kategori === 'Prive')
    .reduce((sum, l) => sum + l.kredit, 0);

  // Laba Bersih secara Cashflow (Uang Masuk - Uang Keluar)
  // Ini menggambarkan "Apakah bulan ini uang saya bertambah?"
  const surplusCashflow = omsetPenjualan - belanjaStok - biayaOperasional;


  // Chart Data: Komposisi Kekayaan
  const assetData = [
    { name: 'Uang Kas Tunai', value: Math.max(0, saldoKas), color: '#3B82F6' },
    { name: 'Nilai Stok Barang', value: nilaiAsetStok, color: '#10B981' },
  ];

  const handleExportMonthly = () => {
    const dataExport = [
      { Item: 'LAPORAN BULAN', Nilai: selectedMonth },
      { Item: 'Omset Penjualan', Nilai: omsetPenjualan },
      { Item: 'Belanja Stok (Cash Out)', Nilai: -belanjaStok },
      { Item: 'Biaya Operasional', Nilai: -biayaOperasional },
      { Item: 'Surplus/Defisit Kas', Nilai: surplusCashflow },
      { Item: '', Nilai: '' },
      { Item: 'ANALISA TOTAL (ALL TIME)', Nilai: '---' },
      { Item: 'Total Modal Disetor', Nilai: totalModal },
      { Item: 'Total Prive Diambil', Nilai: totalPrive },
      { Item: 'Saldo Kas Saat Ini', Nilai: saldoKas },
      { Item: 'Nilai Stok Saat Ini', Nilai: nilaiAsetStok },
      { Item: 'KEUNTUNGAN BERSIH REAL', Nilai: labaBersihAllTime },
    ];
    exportToExcel(dataExport, `Laporan_Keuangan_${selectedMonth}`);
  };

  const handleWithdrawProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    
    if (amount <= 0) return;
    if (amount > saldoKas) {
      alert("Saldo kas tidak mencukupi untuk pengambilan ini.");
      return;
    }

    if (!confirm(`Konfirmasi pengambilan laba sebesar Rp ${amount.toLocaleString()}?\n(Akan tercatat sebagai pengeluaran di Buku Kas kategori 'Prive')`)) return;

    setIsProcessing(true);
    try {
      await Api.postData('WITHDRAW_PROFIT', {
        jumlah: amount,
        deskripsi: `Ambil Laba/Prive Periode ${selectedMonth}`
      });
      alert("Pengambilan laba berhasil dicatat.");
      setIsProfitModalOpen(false);
      setWithdrawAmount('');
      refreshData();
    } catch (error) {
      alert("Gagal memproses transaksi.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Laporan Keuangan</h2>
        
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
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Bagian 1: Analisa Kesehatan Bisnis (ALL TIME) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg">
           <div className="flex items-center gap-2 mb-4 opacity-90">
             <Activity size={20} className="text-green-400" />
             <h3 className="text-lg font-bold tracking-wide">KESEHATAN BISNIS (TOTAL)</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-700">
              <div className="pt-4 md:pt-0">
                 <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Total Modal Disetor</p>
                 <p className="text-xl font-mono text-slate-200">Rp {totalModal.toLocaleString()}</p>
                 <p className="text-[10px] text-slate-500 mt-1">Uang awal anda</p>
              </div>
              <div className="pt-4 md:pt-0 md:pl-8">
                 <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Total Aset Saat Ini</p>
                 <p className="text-xl font-bold text-blue-300">Rp {(saldoKas + nilaiAsetStok).toLocaleString()}</p>
                 <p className="text-[10px] text-slate-500 mt-1">Kas Tunai + Nilai Stok</p>
              </div>
              <div className="pt-4 md:pt-0 md:pl-8">
                 <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Total Prive Diambil</p>
                 <p className="text-xl font-mono text-orange-300">Rp {totalPrive.toLocaleString()}</p>
                 <p className="text-[10px] text-slate-500 mt-1">Laba yang sudah dinikmati</p>
              </div>
              <div className="pt-4 md:pt-0 md:pl-8">
                 <p className="text-xs text-green-400 uppercase font-bold mb-1">Keuntungan Bersih (Real)</p>
                 <p className={`text-2xl font-bold ${labaBersihAllTime >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                   Rp {labaBersihAllTime.toLocaleString()}
                 </p>
                 <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                   (Aset + Prive) - Modal. <br/>Ini profit murni toko anda.
                 </p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Laba Rugi Bulanan (Cashflow Basis) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative">
          <div className="mb-6 flex justify-between items-center">
             <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                <DollarSign size={20} className="text-blue-600"/> Arus Kas Bulan Ini
             </h3>
             <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{new Date(selectedMonth).toLocaleDateString('id-ID', {month: 'long', year: 'numeric'})}</span>
          </div>
          
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-xs text-green-600 uppercase font-bold">Pemasukan (Omset Penjualan)</p>
                <p className="text-xl font-bold text-gray-800">Rp {omsetPenjualan.toLocaleString()}</p>
              </div>
            </div>

            <div className="relative pl-8 space-y-3 border-l-2 border-gray-200 ml-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>(-) Belanja Stok (Keluar Uang)</span>
                <span className="font-mono text-red-500">Rp {belanjaStok.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>(-) Biaya Operasional</span>
                <span className="font-mono text-red-500">Rp {biayaOperasional.toLocaleString()}</span>
              </div>
            </div>

            {/* HASIL CASHFLOW */}
            <div className={`p-4 rounded-lg flex flex-col gap-2 border ${surplusCashflow >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex justify-between items-center w-full">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-500">
                    Surplus / Defisit Kas (Bulan Ini)
                  </p>
                  <p className={`text-xl font-bold ${surplusCashflow >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                    {surplusCashflow >= 0 ? '+' : ''} Rp {surplusCashflow.toLocaleString()}
                  </p>
                </div>
                {/* Tombol Ambil Laba */}
                {surplusCashflow > 0 && (
                     <button 
                       onClick={() => setIsProfitModalOpen(true)}
                       className="bg-white text-green-700 hover:bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 transition-transform active:scale-95"
                     >
                       <Wallet size={16} /> Ambil Laba
                     </button>
                  )}
              </div>
              <p className="text-[10px] text-gray-500 italic">
                *Menunjukkan penambahan atau pengurangan uang tunai di laci kasir bulan ini.
              </p>
            </div>

            {/* Integrasi Prive */}
            <div className="border-t border-gray-200 pt-3 mt-2 space-y-2">
               <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500 flex items-center gap-1"><ArrowRight size={12}/> Prive (Ambil Laba) Bulan Ini</span>
                  <span className="font-mono text-orange-600 font-medium">
                     {priveBulanan > 0 ? `- Rp ${priveBulanan.toLocaleString()}` : 'Rp 0'}
                  </span>
               </div>
            </div>

          </div>
        </div>

        {/* Neraca Sederhana (Chart) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Package size={20} className="text-purple-600"/> Komposisi Aset Toko
          </h3>
          <div className="h-64 flex-1">
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
          
          <div className="mt-4 bg-purple-50 p-4 rounded-lg border border-purple-100">
            <div className="flex justify-between items-center mb-2">
               <span className="text-xs text-purple-800 font-bold uppercase">Total Nilai Aset</span>
               <span className="text-lg font-bold text-purple-900">Rp {(saldoKas + nilaiAsetStok).toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-purple-700 leading-relaxed">
              Ini adalah jumlah harta toko anda saat ini jika semua barang dijual dengan harga modal dan ditambah uang kas yang ada.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Ambil Laba */}
      {isProfitModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center bg-green-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                <Wallet size={20} /> Ambil Laba / Prive
              </h3>
              <button onClick={() => setIsProfitModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleWithdrawProfit} className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-2">
                <div className="flex justify-between border-b border-gray-200 pb-2 mb-2">
                   <span>Keuntungan Bersih (Total):</span>
                   <span className={`font-bold ${labaBersihAllTime >= 0 ? 'text-green-600' : 'text-red-600'}`}>Rp {labaBersihAllTime.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-xs uppercase font-bold text-gray-500">Saldo Kas Tersedia:</span>
                   <span className="font-bold text-gray-800 text-lg">Rp {saldoKas.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pengambilan (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">Rp</span>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    max={saldoKas}
                    className="w-full border border-gray-300 rounded-lg p-2 pl-8 font-bold text-lg text-red-600" 
                    value={withdrawAmount} 
                    onChange={e => setWithdrawAmount(Number(e.target.value))} 
                    placeholder="0"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Maksimal: Rp {saldoKas.toLocaleString()}</p>
              </div>

              <div className="text-xs text-orange-600 flex items-start gap-1 bg-orange-50 p-2 rounded border border-orange-100">
                <div className="mt-0.5"><CheckCircle size={12} /></div>
                <span>Transaksi ini akan dicatat sebagai 'Prive' (Keluar). Pastikan hanya mengambil dari keuntungan, jangan memakan modal.</span>
              </div>

              <button 
                type="submit" 
                disabled={isProcessing} 
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 flex justify-center items-center gap-2 shadow-md"
              >
                <Wallet size={18} /> {isProcessing ? 'Memproses...' : 'Konfirmasi Pengambilan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;