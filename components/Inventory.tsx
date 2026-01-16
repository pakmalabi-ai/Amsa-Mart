import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { Api } from '../services/api';
import { Edit, Trash2, Plus, Save, X, Download, RefreshCw, AlertTriangle, CheckCircle, Truck, AlertCircle, ShoppingCart, Search } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

interface InventoryProps {
  data: Product[];
  refreshData: () => void;
}

// Definisi Kategori dan Prefix Kode
const CATEGORIES = [
  { label: 'Makanan & Minuman', prefix: 'MM' },
  { label: 'Produk Rumah Tangga', prefix: 'RT' },
  { label: 'Perawatan Pribadi & Kecantikan', prefix: 'PK' },
  { label: 'Produk Bayi', prefix: 'PB' },
  { label: 'Produk Lain-Lain', prefix: 'PL' },
];

const Inventory: React.FC<InventoryProps> = ({ data, refreshData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reorder State
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [reorderThreshold, setReorderThreshold] = useState(5);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Restock State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockSearchTerm, setRestockSearchTerm] = useState('');
  const [selectedRestockItem, setSelectedRestockItem] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number | ''>('');
  const [restockBuyPrice, setRestockBuyPrice] = useState<number | ''>('');

  // Filter Low Stock Items
  const lowStockItems = useMemo(() => {
    return data.filter(item => item.stok <= reorderThreshold);
  }, [data, reorderThreshold]);

  // Filter Restock Search
  const filteredRestockItems = useMemo(() => {
    if (!restockSearchTerm) return [];
    return data.filter(item => 
      item.nama.toLowerCase().includes(restockSearchTerm.toLowerCase()) || 
      item.kode.toLowerCase().includes(restockSearchTerm.toLowerCase())
    ).slice(0, 5); // Limit 5 items
  }, [data, restockSearchTerm]);

  // Fungsi untuk generate kode barang otomatis
  const generateNextCode = (categoryLabel: string): string => {
    const category = CATEGORIES.find(c => c.label === categoryLabel);
    if (!category) return '';

    const prefix = category.prefix;
    
    // Filter barang yang punya prefix sama
    const existingCodes = data
      .filter(item => item.kode.startsWith(prefix + '_'))
      .map(item => {
        const parts = item.kode.split('_');
        return parseInt(parts[1]) || 0;
      });

    // Cari nomor tertinggi
    const maxNumber = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const nextNumber = maxNumber + 1;

    // Format jadi 3 digit (001, 002, dst)
    return `${prefix}_${String(nextNumber).padStart(3, '0')}`;
  };

  const handleEdit = (item: Product) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    const defaultCategory = CATEGORIES[0].label;
    const newCode = generateNextCode(defaultCategory);

    setEditingItem({
      kode: newCode,
      nama: '',
      harga_beli: 0,
      harga_jual: 0,
      stok: 0,
      kategori: defaultCategory,
      status_pemesanan: ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus barang ini?')) {
      await Api.postData('DELETE_PRODUCT', { id });
      refreshData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSaving(true);
    try {
      const action = editingItem.id ? 'UPDATE_PRODUCT' : 'ADD_PRODUCT';
      await Api.postData(action, editingItem);
      setIsModalOpen(false);
      refreshData();
    } catch (error) {
      alert('Gagal menyimpan data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestockItem || !restockQty || Number(restockQty) <= 0) {
      alert("Mohon isi jumlah stok dengan benar.");
      return;
    }

    const qty = Number(restockQty);
    const price = Number(restockBuyPrice);

    if (!confirm(`Konfirmasi belanja stok:\n${selectedRestockItem.nama}\nJumlah: ${qty}\nTotal: Rp ${(qty * price).toLocaleString()}`)) return;

    setIsSaving(true);
    try {
      // Mengirim data ke backend dengan format yang konsisten
      await Api.postData('RESTOCK_PRODUCT', {
        id: selectedRestockItem.id,
        nama: selectedRestockItem.nama,
        qty: qty,
        harga_beli: price
      });
      
      alert("Stok berhasil ditambahkan dan tercatat di Pengeluaran.");
      
      // Reset form
      setSelectedRestockItem(null);
      setRestockQty('');
      setRestockSearchTerm('');
      setIsRestockModalOpen(false);
      
      refreshData();
    } catch (error) {
      alert("Gagal melakukan restok. Pastikan Google Apps Script sudah di-Deploy sebagai 'New Version'.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectRestockItem = (item: Product) => {
    setSelectedRestockItem(item);
    setRestockBuyPrice(item.harga_beli);
    setRestockQty('');
    setRestockSearchTerm(''); // Clear search to hide list
  };

  const handleExport = (period: 'Harian' | 'Mingguan' | 'Bulanan') => {
    const timestamp = new Date().toISOString().split('T')[0];
    exportToExcel(data, `Stok_Barang_${period}_${timestamp}`);
  };

  const handleCategoryChange = (newCategory: string) => {
    if (editingItem) {
      // Jika mode tambah baru (tidak ada ID), generate kode baru saat ganti kategori
      if (!editingItem.id) {
        const newCode = generateNextCode(newCategory);
        setEditingItem({ ...editingItem, kategori: newCategory, kode: newCode });
      } else {
        // Jika mode edit, hanya ganti kategori, kode jangan dirubah otomatis agar tidak kacau
        setEditingItem({ ...editingItem, kategori: newCategory });
      }
    }
  };

  const toggleReorderStatus = async (item: Product) => {
    setIsUpdatingStatus(item.id);
    try {
      const newStatus = item.status_pemesanan === 'ordered' ? '' : 'ordered';
      const updatedItem = { ...item, status_pemesanan: newStatus };
      await Api.postData('UPDATE_PRODUCT', updatedItem);
      refreshData();
    } catch (error) {
      console.error(error);
      alert('Gagal update status pemesanan');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Manajemen Stok Barang</h2>
           <p className="text-sm text-gray-500">Pantau dan kelola inventaris toko.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          {/* Tombol Export */}
          <button 
            onClick={() => handleExport('Harian')}
            className="bg-white text-green-700 border border-green-200 hover:bg-green-50 px-4 py-2 rounded-lg flex items-center gap-2 shadow"
            title="Download Data Stok Excel"
          >
            <Download size={18} /> <span className="hidden sm:inline">Export</span>
          </button>

          {/* Reorder Button with Badge */}
          <button 
            onClick={() => setIsReorderModalOpen(true)}
            className={`relative px-4 py-2 rounded-lg flex items-center gap-2 shadow transition-colors border ${
              lowStockItems.length > 0 
                ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle size={18} />
            <span className="font-semibold text-sm hidden sm:inline">Cek Stok</span>
            {lowStockItems.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                {lowStockItems.length}
              </span>
            )}
          </button>

          {/* Tombol Restock / Belanja Stok */}
          <button 
            onClick={() => setIsRestockModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow"
            title="Tambah stok barang yang sudah ada (Masuk Pengeluaran)"
          >
            <ShoppingCart size={18} /> 
            <span className="font-medium">Belanja Stok (Restok)</span>
          </button>

          <button 
            onClick={handleAdd}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow"
            title="Buat data barang baru"
          >
            <Plus size={18} /> Tambah Barang Baru
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="p-4 border-b">Kode</th>
                <th className="p-4 border-b">Nama Barang</th>
                <th className="p-4 border-b">Kategori</th>
                <th className="p-4 border-b text-right">Harga Beli</th>
                <th className="p-4 border-b text-right">Harga Jual</th>
                <th className="p-4 border-b text-center">Stok</th>
                <th className="p-4 border-b text-center">Status</th>
                <th className="p-4 border-b text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-sm font-mono text-gray-600">{item.kode}</td>
                  <td className="p-4 font-medium text-gray-800">{item.nama}</td>
                  <td className="p-4 text-sm text-gray-500">
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                      {item.kategori}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-right">Rp {item.harga_beli.toLocaleString()}</td>
                  <td className="p-4 text-sm text-right font-semibold text-green-600">Rp {item.harga_jual.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.stok <= reorderThreshold ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {item.stok}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {item.status_pemesanan === 'ordered' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full uppercase">
                        <Truck size={12} /> Dipesan
                      </span>
                    )}
                  </td>
                  <td className="p-4 flex justify-center space-x-2">
                    <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit Data Barang"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus Barang"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reorder / Stok Menipis */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
            <div className="p-4 border-b bg-orange-50 rounded-t-xl flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                  <AlertCircle className="text-orange-600"/>
                  Pesan Ulang Otomatis (Reorder)
                </h3>
                <p className="text-xs text-orange-600">Daftar barang dengan stok di bawah batas aman.</p>
              </div>
              <button onClick={() => setIsReorderModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            {/* Konfigurasi Threshold */}
            <div className="p-4 border-b bg-white flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Ambang Batas Stok:</label>
              <input 
                type="number" 
                min="0"
                value={reorderThreshold}
                onChange={(e) => setReorderThreshold(Number(e.target.value))}
                className="w-20 border border-gray-300 rounded p-1 text-center font-bold text-gray-800"
              />
              <span className="text-xs text-gray-500">(Tampilkan barang jika stok ≤ nilai ini)</span>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {lowStockItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                  <CheckCircle size={48} className="text-green-500 opacity-50" />
                  <p>Stok aman! Tidak ada barang yang perlu dipesan ulang.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 text-xs uppercase text-gray-600 sticky top-0">
                    <tr>
                      <th className="p-3 border-b">Barang</th>
                      <th className="p-3 border-b text-center">Sisa Stok</th>
                      <th className="p-3 border-b text-right">Harga Beli</th>
                      <th className="p-3 border-b text-center">Status</th>
                      <th className="p-3 border-b text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {lowStockItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-800">
                          {item.nama}
                          <div className="text-xs text-gray-400 font-mono">{item.kode}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-red-600">{item.stok}</span>
                        </td>
                        <td className="p-3 text-right">Rp {item.harga_beli.toLocaleString()}</td>
                        <td className="p-3 text-center">
                           {item.status_pemesanan === 'ordered' ? (
                             <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Sudah Dipesan</span>
                           ) : (
                             <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Perlu Dipesan</span>
                           )}
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            disabled={isUpdatingStatus === item.id}
                            onClick={() => toggleReorderStatus(item)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all shadow-sm flex items-center gap-1 mx-auto ${
                              item.status_pemesanan === 'ordered'
                              ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isUpdatingStatus === item.id ? 'Loading...' : (
                               item.status_pemesanan === 'ordered' ? 'Batal Pesan' : 'Tandai Pesan'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
               <button 
                 onClick={() => exportToExcel(lowStockItems, `Daftar_Belanja_Stok_${new Date().toISOString().split('T')[0]}`)}
                 className="flex items-center gap-2 text-green-700 font-medium hover:text-green-800 px-4 py-2 border border-green-200 rounded-lg bg-white shadow-sm"
               >
                 <Download size={18} /> Download Daftar Belanja (Excel)
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESTOK / BELANJA STOK (BARU) */}
      {isRestockModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
             <div className="p-4 border-b flex justify-between items-center bg-blue-50 rounded-t-xl">
               <div>
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <ShoppingCart size={20} /> Belanja Stok / Restok
                  </h3>
                  <p className="text-xs text-blue-600">Tambah stok barang lama & catat pengeluaran otomatis.</p>
               </div>
               <button onClick={() => setIsRestockModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
             </div>

             <form onSubmit={handleRestockSubmit} className="p-6 space-y-4">
               {/* Search Barang */}
               {!selectedRestockItem ? (
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Cari Nama Barang / Kode</label>
                   <div className="relative">
                     <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                     <input 
                       type="text" 
                       autoFocus
                       className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                       placeholder="Ketik untuk mencari..."
                       value={restockSearchTerm}
                       onChange={(e) => setRestockSearchTerm(e.target.value)}
                     />
                   </div>
                   {/* Dropdown Hasil Pencarian */}
                   {filteredRestockItems.length > 0 && (
                     <div className="mt-2 border rounded-lg shadow-sm overflow-hidden bg-white max-h-48 overflow-y-auto">
                       {filteredRestockItems.map(item => (
                         <div 
                           key={item.id} 
                           onClick={() => handleSelectRestockItem(item)}
                           className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 flex justify-between items-center"
                         >
                           <div>
                             <div className="font-medium text-gray-800">{item.nama}</div>
                             <div className="text-xs text-gray-500">{item.kode} | Stok: {item.stok}</div>
                           </div>
                           <Plus size={16} className="text-blue-500"/>
                         </div>
                       ))}
                     </div>
                   )}
                   {restockSearchTerm && filteredRestockItems.length === 0 && (
                     <div className="mt-2 text-sm text-gray-500 text-center p-2">Barang tidak ditemukan.</div>
                   )}
                 </div>
               ) : (
                 <div className="space-y-4">
                    {/* Selected Item Display */}
                    <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-start">
                      <div>
                        <div className="text-xs text-blue-600 font-bold mb-1">BARANG DIPILIH:</div>
                        <div className="font-bold text-gray-800">{selectedRestockItem.nama}</div>
                        <div className="text-xs text-gray-600">{selectedRestockItem.kode}</div>
                        <div className="text-xs text-gray-600 mt-1">Stok Saat Ini: <span className="font-bold">{selectedRestockItem.stok}</span></div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setSelectedRestockItem(null)} 
                        className="text-gray-400 hover:text-red-500"
                      >
                        Ganti
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Beli (Pcs)</label>
                        <input 
                          required 
                          type="number" 
                          min="1"
                          className="w-full border border-gray-300 rounded-lg p-2 font-bold text-lg" 
                          value={restockQty} 
                          onChange={e => setRestockQty(Number(e.target.value))} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Harga Beli Satuan</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500 text-sm">Rp</span>
                          <input 
                            required 
                            type="number" 
                            className="w-full border border-gray-300 rounded-lg p-2 pl-8" 
                            value={restockBuyPrice} 
                            onChange={e => setRestockBuyPrice(Number(e.target.value))} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center">
                       <span className="text-sm font-medium text-gray-600">Total Pengeluaran:</span>
                       <span className="text-lg font-bold text-red-600">Rp {(Number(restockQty) * Number(restockBuyPrice)).toLocaleString()}</span>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSaving || Number(restockQty) <= 0} 
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 flex justify-center items-center gap-2 shadow-md transition-all active:scale-95"
                    >
                      <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Stok & Catat Pengeluaran'}
                    </button>
                 </div>
               )}
             </form>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Product (Master Data Baru) */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-800">{editingItem.id ? 'Edit Data Barang' : 'Tambah Barang Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Kategori Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Barang</label>
                <select 
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                  value={editingItem.kategori}
                  onChange={e => handleCategoryChange(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.prefix} value={cat.label}>
                      {cat.label} ({cat.prefix})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode Barang</label>
                  <div className="relative">
                    <input 
                      required 
                      type="text" 
                      className="w-full border border-gray-300 rounded-lg p-2 bg-gray-100 text-gray-600 font-mono" 
                      value={editingItem.kode} 
                      readOnly // Auto-generated, jadi readOnly lebih aman
                    />
                    {!editingItem.id && (
                      <button 
                        type="button"
                        onClick={() => editingItem.kategori && handleCategoryChange(editingItem.kategori)}
                        className="absolute right-2 top-2 text-gray-400 hover:text-blue-500"
                        title="Regenerate Code"
                      >
                        <RefreshCw size={16}/>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">*Otomatis sesuai kategori</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full border border-gray-300 rounded-lg p-2" 
                    value={editingItem.stok} 
                    onChange={e => setEditingItem({...editingItem, stok: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label>
                <input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={editingItem.nama} onChange={e => setEditingItem({...editingItem, nama: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Beli</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 text-sm">Rp</span>
                    <input 
                      required 
                      type="number" 
                      className="w-full border border-gray-300 rounded-lg p-2 pl-8" 
                      value={editingItem.harga_beli} 
                      onChange={e => setEditingItem({...editingItem, harga_beli: Number(e.target.value)})} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 text-sm">Rp</span>
                    <input 
                      required 
                      type="number" 
                      className="w-full border border-gray-300 rounded-lg p-2 pl-8" 
                      value={editingItem.harga_jual} 
                      onChange={e => setEditingItem({...editingItem, harga_jual: Number(e.target.value)})} 
                    />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 flex justify-center items-center gap-2 mt-6 shadow-md transition-all active:scale-95">
                <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Barang'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;