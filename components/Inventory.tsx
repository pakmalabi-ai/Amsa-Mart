import React, { useState } from 'react';
import { Product } from '../types';
import { Api } from '../services/api';
import { Edit, Trash2, Plus, Save, X } from 'lucide-react';

interface InventoryProps {
  data: Product[];
  refreshData: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ data, refreshData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (item: Product) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem({
      kode: '', nama: '', harga_beli: 0, harga_jual: 0, stok: 0, kategori: 'Umum'
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manajemen Stok Barang</h2>
        <button 
          onClick={handleAdd}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow"
        >
          <Plus size={18} /> Tambah Barang
        </button>
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
                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.stok < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {item.stok}
                    </span>
                  </td>
                  <td className="p-4 flex justify-center space-x-2">
                    <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">{editingItem.id ? 'Edit Barang' : 'Tambah Barang Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode Barang</label>
                  <input required type="text" className="w-full border rounded p-2" value={editingItem.kode} onChange={e => setEditingItem({...editingItem, kode: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <input required type="text" className="w-full border rounded p-2" value={editingItem.kategori} onChange={e => setEditingItem({...editingItem, kategori: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label>
                <input required type="text" className="w-full border rounded p-2" value={editingItem.nama} onChange={e => setEditingItem({...editingItem, nama: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Beli</label>
                  <input required type="number" className="w-full border rounded p-2" value={editingItem.harga_beli} onChange={e => setEditingItem({...editingItem, harga_beli: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual</label>
                  <input required type="number" className="w-full border rounded p-2" value={editingItem.harga_jual} onChange={e => setEditingItem({...editingItem, harga_jual: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
                <input required type="number" className="w-full border rounded p-2" value={editingItem.stok} onChange={e => setEditingItem({...editingItem, stok: Number(e.target.value)})} />
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 flex justify-center items-center gap-2 mt-4">
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