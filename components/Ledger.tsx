import React, { useState } from 'react';
import { LedgerEntry } from '../types';
import { ArrowDownLeft, ArrowUpRight, Download, Filter, PlusCircle, Save, X, MinusCircle, Edit, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';
import { Api } from '../services/api';

interface LedgerProps {
  data: LedgerEntry[];
  refreshData: () => void;
}

// Daftar kategori pengeluaran operasional umum
const EXPENSE_CATEGORIES = [
  'Gaji Karyawan',
  'Listrik & Air',
  'Sewa Tempat',
  'Biaya Perawatan/Service',
  'Perlengkapan Toko',
  'Transportasi',
  'Konsumsi',
  'Lain-lain',
  'Modal', // Added specifically for editing flexibility
  'Prive', // Added specifically for editing flexibility
  'Belanja Stok', // Added for editing
  'Penjualan' // Added for editing
];

const Ledger: React.FC<LedgerProps> = ({ data, refreshData }) => {
  // State Filter Bulan
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // State Modal Capital (Pemasukan Modal)
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [capitalAmount, setCapitalAmount] = useState<number | ''>('');
  const [capitalDesc, setCapitalDesc] = useState('Modal Awal Tambahan');

  // State Modal Expense (Pengeluaran Operasional)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0]);

  // State Modal Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<LedgerEntry> & { type: 'masuk' | 'keluar' } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

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

  const handleSaveCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capitalAmount || Number(capitalAmount) <= 0) return;

    if (!confirm(`Konfirmasi input modal sebesar Rp ${Number(capitalAmount).toLocaleString()}?`)) return;

    setIsSaving(true);
    try {
      await Api.postData('ADD_CAPITAL', {
        jumlah: Number(capitalAmount),
        deskripsi: capitalDesc
      });
      alert('Modal berhasil ditambahkan!');
      setIsCapitalModalOpen(false);
      setCapitalAmount('');
      refreshData();
    } catch (error) {
      alert('Gagal menyimpan modal');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || Number(expenseAmount) <= 0) return;
    if (!expenseDesc) {
      alert("Mohon isi deskripsi pengeluaran.");
      return;
    }

    if (!confirm(`Catat pengeluaran ${expenseCategory} sebesar Rp ${Number(expenseAmount).toLocaleString()}?`)) return;

    setIsSaving(true);
    try {
      await Api.postData('ADD_EXPENSE', {
        jumlah: Number(expenseAmount),
        deskripsi: `${expenseCategory}: ${expenseDesc}`,
        kategori: expenseCategory
      });
      alert('Pengeluaran berhasil dicatat!');
      setIsExpenseModalOpen(false);
      setExpenseAmount('');
      setExpenseDesc('');
      refreshData();
    } catch (error) {
      alert('Gagal menyimpan pengeluaran');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (item: LedgerEntry) => {
    const isDebit = item.debit > 0;
    setEditingEntry({
      ...item,
      // Format tanggal untuk input type="datetime-local" (YYYY-MM-DDTHH:mm)
      tanggal: new Date(item.tanggal).toISOString().slice(0, 16),
      type: isDebit ? 'masuk' : 'keluar',
      // Jika debit ada isinya gunakan debit, jika tidak gunakan kredit
      debit: isDebit ? item.debit : item.kredit 
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm("PERINGATAN: Menghapus data kas dapat mempengaruhi perhitungan Laba Rugi.\n\nYakin ingin menghapus transaksi ini?")) return;

    setIsSaving(true);
    try {
       await Api.postData('DELETE_LEDGER', { id });
       refreshData();
    } catch (error) {
       console.error(error);
       alert("Gagal menghapus data.");
    } finally {
       setIsSaving(false);
    }
  };

  const handleUpdateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !editingEntry.id) return;
    
    // Gunakan nilai dari field debit sementara sebagai 'nominal'
    const nominal = Number(editingEntry.debit); 
    if (nominal <= 0) {
      alert("Nominal harus lebih dari 0");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: editingEntry.id,
        tanggal: editingEntry.tanggal, // Kirim string ISO/Time local
        deskripsi: editingEntry.deskripsi,
        kategori: editingEntry.kategori,
        debit: editingEntry.type === 'masuk' ? nominal : 0,
        kredit: editingEntry.type === 'keluar' ? nominal : 0
      };

      await Api.postData('UPDATE_LEDGER', payload);
      alert("Data kas berhasil diperbarui.");
      setIsEditModalOpen(false);
      setEditingEntry(null);
      refreshData();
    } catch (error) {
      console.error(error);
      alert("Gagal memperbarui data kas.");
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryBadgeClass = (kategori: string) => {
    switch (kategori) {
      case 'Modal': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'Penjualan': return 'bg-green-100 text-green-700 border border-green-200';
      case 'Belanja Stok': return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'Prive': return 'bg-purple-100 text-purple-700 border border-purple-200'; 
      // Kategori Pengeluaran Operasional
      case 'Gaji Karyawan':
      case 'Listrik & Air':
      case 'Sewa Tempat':
      case 'Biaya Perawatan/Service':
         return 'bg-red-100 text-red-700 border border-red-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
         <h2 className="text-2xl font-bold text-gray-800">Buku Kas & Operasional</h2>
         
         <div className="flex flex-wrap items-center gap-2 justify-end">
            <button 
              onClick={() => setIsCapitalModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow text-sm font-medium"
            >
              <PlusCircle size={18} /> Input Modal
            </button>

            <button 
              onClick={() => setIsExpenseModalOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow text-sm font-medium"
            >
              <MinusCircle size={18} /> Catat Pengeluaran
            </button>

            <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200 ml-2">
              <Filter size={18} className="text-gray-400" />
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border-none outline-none text-sm text-gray-700 font-medium w-32"
              />
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              <button 
                onClick={handleExport}
                className="text-sm font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
              >
                <Download size={16} /> Ekspor
              </button>
            </div>
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
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Belum ada data transaksi di bulan ini</td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 group">
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(row.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getCategoryBadgeClass(row.kategori)}`}>
                        {row.kategori}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-800">{row.deskripsi}</td>
                    <td className="p-4 text-right font-mono text-sm text-green-600">
                      {row.debit > 0 ? `+ Rp ${row.debit.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-red-600">
                      {row.kredit > 0 ? `- Rp ${row.kredit.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-4 text-center">
                       <div className="flex justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleEditClick(row)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded" title="Edit Transaksi">
                           <Edit size={16}/>
                         </button>
                         <button onClick={() => handleDeleteClick(row.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded" title="Hapus Transaksi">
                           <Trash2 size={16}/>
                         </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Modal Awal */}
      {isCapitalModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center bg-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                <PlusCircle size={20} /> Input Modal Awal
              </h3>
              <button onClick={() => setIsCapitalModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveCapital} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Modal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">Rp</span>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    className="w-full border border-gray-300 rounded-lg p-2 pl-8 font-bold text-lg" 
                    value={capitalAmount} 
                    onChange={e => setCapitalAmount(Number(e.target.value))} 
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                 <input 
                   required
                   type="text"
                   className="w-full border border-gray-300 rounded-lg p-2"
                   value={capitalDesc}
                   onChange={e => setCapitalDesc(e.target.value)}
                   placeholder="Contoh: Modal Awal Januari, Suntikan Dana, dll"
                 />
              </div>

              <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                 Catatan: Transaksi ini akan tercatat sebagai Pemasukan (Debit) dengan kategori 'Modal' di Buku Kas.
              </div>

              <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 flex justify-center items-center gap-2 shadow-md"
              >
                <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Modal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Input Pengeluaran Operasional */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center bg-red-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <MinusCircle size={20} /> Catat Pengeluaran
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Biaya</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Detail</label>
                 <input 
                   required
                   type="text"
                   className="w-full border border-gray-300 rounded-lg p-2"
                   value={expenseDesc}
                   onChange={e => setExpenseDesc(e.target.value)}
                   placeholder="Contoh: Gaji Budi (Januari), Token Listrik, dll"
                 />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pengeluaran (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">Rp</span>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    className="w-full border border-gray-300 rounded-lg p-2 pl-8 font-bold text-lg text-red-600" 
                    value={expenseAmount} 
                    onChange={e => setExpenseAmount(Number(e.target.value))} 
                    placeholder="0"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-400 flex justify-center items-center gap-2 shadow-md"
              >
                <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Pengeluaran'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT TRANSAKSI (General) */}
      {isEditModalOpen && editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Edit size={20} /> Edit Transaksi
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdateLedger} className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal & Waktu</label>
                <input 
                  type="datetime-local"
                  required
                  className="w-full border border-gray-300 rounded-lg p-2"
                  value={editingEntry.tanggal}
                  onChange={e => setEditingEntry({...editingEntry, tanggal: e.target.value})}
                />
              </div>

              <div className="flex gap-4 p-2 bg-gray-50 rounded border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="type" 
                    checked={editingEntry.type === 'masuk'} 
                    onChange={() => setEditingEntry({...editingEntry, type: 'masuk'})}
                  />
                  <span className="text-sm font-bold text-green-700">Pemasukan (Debit)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="type" 
                    checked={editingEntry.type === 'keluar'}
                    onChange={() => setEditingEntry({...editingEntry, type: 'keluar'})}
                  />
                  <span className="text-sm font-bold text-red-700">Pengeluaran (Kredit)</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  value={editingEntry.kategori}
                  onChange={e => setEditingEntry({...editingEntry, kategori: e.target.value})}
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                 <input 
                   required
                   type="text"
                   className="w-full border border-gray-300 rounded-lg p-2"
                   value={editingEntry.deskripsi}
                   onChange={e => setEditingEntry({...editingEntry, deskripsi: e.target.value})}
                 />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">Rp</span>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    className={`w-full border border-gray-300 rounded-lg p-2 pl-8 font-bold text-lg ${editingEntry.type === 'masuk' ? 'text-green-600' : 'text-red-600'}`}
                    value={editingEntry.debit} // Kita gunakan field debit sementara utk simpan value inputan
                    onChange={e => setEditingEntry({...editingEntry, debit: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="bg-yellow-50 p-2 rounded text-[10px] text-yellow-800 flex gap-1 border border-yellow-100">
                <AlertTriangle size={12} className="shrink-0 mt-0.5"/>
                Perhatian: Mengubah data transaksi 'Penjualan' atau 'Belanja Stok' di sini tidak akan otomatis mengubah stok barang atau data struk. Lakukan dengan hati-hati.
              </div>

              <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 flex justify-center items-center gap-2 shadow-md"
              >
                <Save size={18} /> {isSaving ? 'Menyimpan Perubahan...' : 'Update Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Ledger;