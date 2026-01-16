import React, { useState, useMemo } from 'react';
import { Product, CartItem, Transaction } from '../types';
import { Search, Plus, Minus, Trash2, ShoppingBag, FileText, Download, X, Banknote, CreditCard, AlertCircle, QrCode, Check, Calendar, Save } from 'lucide-react';
import { Api } from '../services/api';
import { exportToExcel } from '../utils/excelExport';

interface POSProps {
  inventory: Product[];
  refreshData: () => void;
}

const POS: React.FC<POSProps> = ({ inventory, refreshData }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // State Pembayaran
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS'>('Tunai');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);

  // State Tanggal Transaksi (Backdate)
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // State untuk Laporan Harian
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [dailyTransactions, setDailyTransactions] = useState<Transaction[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const filteredItems = useMemo(() => {
    return inventory.filter(item => 
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.kode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventory, searchTerm]);

  const addToCart = (product: Product) => {
    if (product.stok <= 0) {
      alert("Stok habis!");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stok) return prev; 
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.qty + delta);
        if (newQty > item.stok) return item; 
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.harga_jual * item.qty), 0);
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

  const changeAmount = paymentMethod === 'Tunai' && typeof cashReceived === 'number' 
    ? cashReceived - totalAmount 
    : 0;

  const isInsufficientPayment = paymentMethod === 'Tunai' && typeof cashReceived === 'number' && cashReceived < totalAmount;

  // Logic disable button
  const isCheckoutDisabled = 
    cart.length === 0 || 
    isCheckingOut || 
    (paymentMethod === 'Tunai' && (typeof cashReceived !== 'number' || cashReceived < totalAmount));

  const handleInputKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (['-', 'e', 'E'].includes(evt.key)) {
      evt.preventDefault();
    }
  };

  const handleCheckout = async (skipConfirmation = false) => {
    if (cart.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const isBackdate = transactionDate !== today;
    const backdateMsg = isBackdate ? `\n(Tgl Transaksi: ${transactionDate})` : '';

    if (!skipConfirmation) {
      if (!confirm(`Proses transaksi senilai Rp ${totalAmount.toLocaleString()}?${backdateMsg}`)) return;
    }

    setIsCheckingOut(true);
    try {
      // 1. Simpan Data ke Database (Backend)
      await Api.postData('CHECKOUT', {
        items: cart.map(i => ({ id: i.id, qty: i.qty, nama: i.nama, harga: i.harga_jual })),
        total: totalAmount,
        paymentMethod: paymentMethod,
        customDate: transactionDate
      });
      
      // 2. Bersihkan Cart dan Input
      setCart([]);
      setCashReceived('');
      setPaymentMethod('Tunai'); // Reset ke default
      
      // 3. Refresh Data Stok di Background & Beri Notifikasi
      refreshData();
      alert("Transaksi Berhasil Disimpan ke Database!");

    } catch (err) {
      alert('Gagal memproses transaksi. Periksa koneksi internet.');
      console.error(err);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePayButton = () => {
    if (cart.length === 0) return alert("Keranjang belanja kosong!");

    if (paymentMethod === 'QRIS') {
      setIsQrisModalOpen(true);
    } else {
      // Validasi Manual Pembayaran Tunai
      const cashVal = Number(cashReceived);
      if (typeof cashReceived !== 'number' || cashVal < totalAmount) {
        alert(`Uang diterima kurang! Kurang Rp ${(totalAmount - (cashVal||0)).toLocaleString()}`);
        return;
      }
      handleCheckout(false);
    }
  };

  const openDailyReport = async () => {
    setIsReportOpen(true);
    setLoadingReport(true);
    try {
      const allTrans = await Api.getTransactions();
      const today = new Date().toDateString();
      const todays = allTrans.filter(t => new Date(t.tanggal).toDateString() === today);
      setDailyTransactions(todays.sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()));
    } catch (e) {
      console.error(e);
      alert('Gagal mengambil data laporan harian');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportDaily = () => {
    const dataToExport = dailyTransactions.map(t => {
      const metode = t.metode_pembayaran || t.tipe;
      return {
        ID: t.id,
        Tanggal: new Date(t.tanggal).toLocaleString('id-ID'),
        Detail_Item: t.item_json,
        Total: t.total,
        Tipe_Transaksi: 'Penjualan',
        Metode_Pembayaran: metode
      };
    });
    exportToExcel(dataToExport, `Laporan_Harian_POS_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden relative">
      
      {/* Product Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari barang (nama atau kode)..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={openDailyReport}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow"
            title="Laporan Harian"
          >
            <FileText size={18} /> <span className="hidden sm:inline">Laporan Harian</span>
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => addToCart(item)}
              className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all border
                ${Number(item.stok) <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'border-gray-100 hover:border-blue-300'}
              `}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.kode}</span>
                <span className={`text-xs font-bold ${Number(item.stok) < 5 ? 'text-red-500' : 'text-green-500'}`}>
                  Stok: {item.stok}
                </span>
              </div>
              <h3 className="font-medium text-gray-800 line-clamp-2 h-10 mb-2">{item.nama}</h3>
              <p className="text-blue-600 font-bold">Rp {item.harga_jual.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full md:w-96 bg-white shadow-xl flex flex-col border-l border-gray-200">
        <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-blue-800 flex items-center">
            <ShoppingBag className="mr-2 h-5 w-5" /> Keranjang
          </h2>
          <span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full">{cart.length} Item</span>
        </div>
        
        <div className="px-4 py-3 bg-white border-b border-gray-100">
           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
             <Calendar size={10} /> Tanggal Transaksi
           </label>
           <input 
             type="date"
             className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-medium text-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
             value={transactionDate}
             onChange={(e) => setTransactionDate(e.target.value)}
           />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
              <p>Keranjang kosong</p>
              <p className="text-sm">Klik barang untuk menambahkan</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-gray-800">{item.nama}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>@ Rp {item.harga_jual.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-red-100 rounded text-red-500"><Minus size={14} /></button>
                  <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-green-100 rounded text-green-500"><Plus size={14} /></button>
                  <button onClick={() => removeFromCart(item.id)} className="ml-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bagian Checkout & Pembayaran */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
          
          <div className="flex justify-between items-center text-sm">
             <span className="text-gray-600">Total Item (Qty)</span>
             <span className="font-bold text-gray-800">{totalQty} Pcs</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <span className="text-gray-600">Total Belanja</span>
            <span className="font-bold text-xl text-blue-600">Rp {totalAmount.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => { setPaymentMethod('Tunai'); setCashReceived(''); }}
              className={`flex items-center justify-center py-2 rounded border text-sm font-medium transition-all ${paymentMethod === 'Tunai' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-600'}`}
            >
              <Banknote size={16} className="mr-1"/> Tunai
            </button>
            <button 
              onClick={() => { setPaymentMethod('QRIS'); setCashReceived(totalAmount); }}
              className={`flex items-center justify-center py-2 rounded border text-sm font-medium transition-all ${paymentMethod === 'QRIS' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-600'}`}
            >
              <CreditCard size={16} className="mr-1"/> QRIS
            </button>
          </div>

          {paymentMethod === 'Tunai' && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Uang Diterima</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 text-sm">Rp</span>
                  <input 
                    type="number" 
                    min="0"
                    onKeyDown={handleInputKeyDown}
                    value={cashReceived}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                         setCashReceived('');
                         return;
                      }
                      const numVal = parseFloat(val);
                      if (numVal >= 0) {
                        setCashReceived(numVal);
                      }
                    }}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 outline-none font-bold text-gray-800 transition-colors ${
                       isInsufficientPayment 
                       ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                       : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                <span className="text-xs font-bold text-gray-500">KEMBALIAN</span>
                <span className={`font-mono font-bold text-lg ${changeAmount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  Rp {changeAmount.toLocaleString()}
                </span>
              </div>
              
              {isInsufficientPayment && (
                <div className="bg-red-50 text-red-600 text-xs p-2 rounded flex items-center mt-1 border border-red-200 animate-pulse">
                   <AlertCircle size={12} className="mr-1" />
                   Nominal kurang Rp {Math.abs(changeAmount).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <button
            disabled={isCheckingOut}
            onClick={handlePayButton}
            className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition-all flex justify-center items-center
              ${isCheckoutDisabled ? 'opacity-80' : ''}
              ${isCheckingOut ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}
            `}
          >
            {isCheckingOut ? 'Menyimpan...' : (
              <>
                <Save size={18} className="mr-2" />
                Selesaikan Pembayaran
              </>
            )}
          </button>
        </div>
      </div>

      {isQrisModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center">
            <div className="bg-blue-600 w-full p-4 text-center">
              <h3 className="text-white font-bold text-lg flex items-center justify-center gap-2">
                <QrCode size={24} /> Scan QRIS
              </h3>
            </div>
            
            <div className="p-6 flex flex-col items-center w-full">
              <div className="text-gray-500 text-sm mb-1">Total Tagihan</div>
              <div className="text-3xl font-bold text-gray-800 mb-6">Rp {totalAmount.toLocaleString()}</div>
              
              <div className="bg-white p-2 rounded-xl border-2 border-gray-200 shadow-inner mb-6">
                <img 
                  src="https://lh3.googleusercontent.com/pw/AP1GczMN-PHjaCppi4UaLDoIjfvL-H5X33qHqjIzvm9CHZ3im3tMXk6DYedEVKuGBaY9GyoeUqNWr5YVBx_CSnMwz0p7x3q6VCOEFjyOot_Y_T4X7w4OqGHC61HNlfo9jQx3opC_Ksb8OSiQPFQ8N9faRclw=w519-h513-s-no-gm?authuser=0" 
                  alt="QRIS Code" 
                  className="w-64 h-64 object-contain rounded-lg"
                />
              </div>

              <div className="text-center text-xs text-gray-400 mb-6">
                Scan kode QR di atas menggunakan aplikasi e-wallet atau mobile banking yang mendukung QRIS.
              </div>

              <div className="grid grid-cols-1 w-full gap-3">
                <button 
                  onClick={() => {
                    setIsQrisModalOpen(false);
                    handleCheckout(true); 
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <Check size={20} /> Selesai (Pembayaran Diterima)
                </button>
                <button 
                  onClick={() => setIsQrisModalOpen(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-medium"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isReportOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-purple-600" />
                Laporan Transaksi Hari Ini
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportDaily}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2"
                >
                  <Download size={16} /> Export Excel
                </button>
                <button onClick={() => setIsReportOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {loadingReport ? (
                 <div className="flex justify-center items-center h-full">Loading...</div>
              ) : dailyTransactions.length === 0 ? (
                 <div className="text-center text-gray-500 mt-10">Belum ada transaksi hari ini.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 text-xs uppercase text-gray-600 sticky top-0">
                    <tr>
                      <th className="p-3 border-b">Waktu</th>
                      <th className="p-3 border-b">Item</th>
                      <th className="p-3 border-b text-center">Metode</th>
                      <th className="p-3 border-b text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {dailyTransactions.map(t => {
                      const metode = t.metode_pembayaran || t.tipe;
                      return (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="p-3">{new Date(t.tanggal).toLocaleTimeString('id-ID')}</td>
                          <td className="p-3 max-w-md truncate text-gray-600">{t.item_json}</td>
                          <td className="p-3 text-center text-xs">
                            <span className={`px-2 py-1 rounded ${metode === 'QRIS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {metode}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-gray-800">Rp {t.total.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={3} className="p-3 text-right">Total Pendapatan Hari Ini:</td>
                      <td className="p-3 text-right text-green-600">
                        Rp {dailyTransactions.reduce((acc, t) => acc + t.total, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;