import React, { useState } from 'react';
import { Product, LedgerEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Download, Calendar, Wallet, CheckCircle, X, ArrowRight, TrendingUp, Package } from 'lucide-react';
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

  // Filter Data Ledger per bulan untuk Laba Rugi
  const monthlyLedger = ledger.filter(l => l.tanggal.startsWith(selectedMonth));

  // Perhitungan Aset Stok (Snapshot Saat Ini - Harga Beli)
  const nilaiAsetStok = inventory.reduce((sum, item) => sum + (item.harga_beli * item.stok), 0);
  
  // Perhitungan Kas Total (Akumulatif - tidak terpengaruh filter bulan)
  const kasTotal = ledger.reduce((sum, item) => sum + (item.debit || 0) - (item.kredit || 0), 0);
  
  // --- Perhitungan Laporan Laba Rugi Bulanan ---
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

  // Prive (Pengambilan Pribadi)
  const prive = monthlyLedger
    .filter(l => l.kategori === 'Prive')
    .reduce((sum, l) => sum + l.kredit, 0);

  // Laba Bersih secara Cashflow (Uang Masuk - Uang Keluar)
  const labaBersihCashflow = omsetPenjualan - belanjaStok - biayaOperasional;
  
  // Sisa Laba setelah diambil prive
  const sisaLabaDitahan = labaBersihCashflow - prive;

  // --- Perhitungan Laba Riil (Memperhitungkan Stok sebagai Aset, bukan hangus) ---
  // Logika: Profit Cashflow memang minus jika belanja stok banyak. 
  // Tapi stok itu adalah uang yang berubah bentuk.
  // Laba Riil = Laba Cashflow + Nilai Aset Stok yang Tersedia
  // *Catatan: Ini adalah estimasi performa aset + cash
  const labaRiilEstimasi = labaBersihCashflow + nilaiAsetStok;

  // Chart Data: Komposisi Aset
  const assetData = [
    { name: 'Uang Kas Tunai', value: Math.max(0, kasTotal), color: '#3B82F6' },
    { name: 'Nilai Stok Barang', value: nilaiAsetStok, color: '#10B981' },
  ];

  const handleExportMonthly = () => {
    const dataExport = [
      { Item: 'Periode', Nilai: selectedMonth },
      { Item: 'Omset Penjualan', Nilai: omsetPenjualan },
      { Item: 'Belanja Stok (Cash Out)', Nilai: -belanjaStok },
      { Item: 'Biaya Operasional', Nilai: -biayaOperasional },
      { Item: 'LABA BERSIH (Metode Cashflow)', Nilai: labaBersihCashflow },
      { Item: '---', Nilai: '---' },
      { Item: 'Nilai Aset Stok (Barang Tersedia)', Nilai: nilaiAsetStok },
      { Item: 'ESTIMASI LABA RIIL (Cash + Aset)', Nilai: labaRiilEstimasi },
      { Item: '---', Nilai: '---' },
      { Item: 'Pengambilan Prive', Nilai: -prive },
      { Item: 'SISA KAS DITAHAN', Nilai: sisaLabaDitahan },
    ];
    exportToExcel(dataExport, `Laporan_Keuangan_${selectedMonth}`);
  };

  const handleWithdrawProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    
    if (amount <= 0) return;
    if (amount > kasTotal) {
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative">
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
                <span>(-) Belanja Stok (Cashflow)</span>
                <span className="font-mono text-red-500">Rp {belanjaStok.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>(-) Biaya Operasional</span>
                <span className="font-mono text-red-500">Rp {biayaOperasional.toLocaleString()}</span>
              </div>
            </div>

            {/* HASIL CASHFLOW */}
            <div className={`p-4 rounded-lg flex flex-col gap-2 border ${labaBersihCashflow >= 0 ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-100'}`}>
              <div className="flex justify-between items-center w-full">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-500">
                    Laba Bersih (Cashflow)
                  </p>
                  <p className={`text-xl font-bold ${labaBersihCashflow >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                    Rp {labaBersihCashflow.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* PERHITUNGAN BARU: LABA RIIL (DENGAN STOK) */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-300 border-dashed" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-xs text-gray-500 font-medium">Analisa Keuntungan Riil</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm text-blue-600 px-2">
                 <span className="flex items-center gap-1"><Package size={14}/> (+) Nilai Aset Stok Tersedia</span>
                 <span className="font-bold">Rp {nilaiAsetStok.toLocaleString()}</span>
              </div>
              
              <div className={`p-4 rounded-lg flex flex-col gap-2 shadow-sm ${labaRiilEstimasi >= 0 ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                <div className="flex justify-between items-center w-full">
                  <div>
                    <p className="text-xs uppercase font-bold opacity-80 flex items-center gap-1">
                      <TrendingUp size={14}/> Estimasi Laba Riil (Cash + Aset)
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      Rp {labaRiilEstimasi.toLocaleString()}
                    </p>
                  </div>
                  
                  {/* Tombol Ambil Laba */}
                  {labaBersihCashflow > 0 && (
                     <button 
                       onClick={() => setIsProfitModalOpen(true)}
                       className="bg-white text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg text-xs font-bold shadow flex items-center gap-1 transition-transform active:scale-95"
                     >
                       <Wallet size={16} /> Ambil Laba
                     </button>
                  )}
                </div>
                <p className="text-[10px] opacity-70 italic">
                  *Keuntungan yang sebenarnya jika memperhitungkan stok barang sebagai uang/aset.
                </p>
              </div>
            </div>

            {/* Integrasi Prive & Sisa Laba */}
            <div className="border-t border-gray-200 pt-3 mt-2 space-y-2">
               <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500 flex items-center gap-1"><ArrowRight size={12}/> Dikurangi: Ambil Laba (Prive)</span>
                  <span className="font-mono text-orange-600 font-medium">
                     {prive > 0 ? `- Rp ${prive.toLocaleString()}` : 'Rp 0'}
                  </span>
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
              <span>Total Nilai Toko (Kas + Stok)</span>
              <span className="text-blue-600">Rp {(kasTotal + nilaiAsetStok).toLocaleString()}</span>
            </div>
            <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 mt-4 border border-yellow-100">
              <strong>Info:</strong> Grafik ini menunjukkan kekayaan toko saat ini. 
              Meskipun "Laba Cashflow" mungkin minus karena belanja stok, kekayaan toko tetap bertambah dalam bentuk barang (warna hijau).
            </div>
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
                <div className="flex justify-between mb-1">
                   <span>Laba Bersih (Cash) Bulan Ini:</span>
                   <span className="font-bold text-blue-600">Rp {labaBersihCashflow.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1">
                   <span>Saldo Kas Tersedia:</span>
                   <span className="font-bold text-gray-800">Rp {kasTotal.toLocaleString()}</span>
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
                    max={kasTotal}
                    className="w-full border border-gray-300 rounded-lg p-2 pl-8 font-bold text-lg text-red-600" 
                    value={withdrawAmount} 
                    onChange={e => setWithdrawAmount(Number(e.target.value))} 
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="text-xs text-orange-600 flex items-start gap-1">
                <div className="mt-0.5"><CheckCircle size={12} /></div>
                <span>Transaksi ini akan dicatat sebagai Pengeluaran (Kredit) di Buku Kas dengan kategori 'Prive'. Pastikan hanya mengambil dari uang tunai yang tersedia.</span>
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