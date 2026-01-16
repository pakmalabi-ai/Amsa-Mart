import React, { useState, useMemo } from 'react';
import { Product, CartItem, Transaction } from '../types';
import { Search, Plus, Minus, Trash2, ShoppingBag, FileText, Download, X, Banknote, CreditCard, Printer, RotateCcw, FileDown, AlertCircle, QrCode, Check } from 'lucide-react';
import { Api } from '../services/api';
import { exportToExcel } from '../utils/excelExport';

// Import html2pdf dihapus untuk mencegah error build, kita gunakan window.html2pdf dari CDN
// import html2pdf from 'html2pdf.js';

interface POSProps {
  inventory: Product[];
  refreshData: () => void;
}

const POS: React.FC<POSProps> = ({ inventory, refreshData }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // State Pembayaran
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS'>('Tunai');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);
  
  // State Transaksi Terakhir (untuk Struk)
  const [lastTransaction, setLastTransaction] = useState<{
    id: string;
    items: CartItem[];
    total: number;
    paymentMethod: string;
    cash: number;
    change: number;
    date: string;
  } | null>(null);

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
        if (existing.qty >= product.stok) return prev; // Max stock limit
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.qty + delta);
        if (newQty > item.stok) return item; // Cannot exceed stock
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

  // Hitung Kembalian
  const changeAmount = paymentMethod === 'Tunai' && typeof cashReceived === 'number' 
    ? cashReceived - totalAmount 
    : 0;

  // Cek apakah uang kurang (untuk validasi visual)
  const isInsufficientPayment = paymentMethod === 'Tunai' && typeof cashReceived === 'number' && cashReceived < totalAmount;

  // Validasi Checkout
  const isCheckoutDisabled = 
    cart.length === 0 || 
    isCheckingOut || 
    (paymentMethod === 'Tunai' && (typeof cashReceived !== 'number' || cashReceived < totalAmount));

  // Fungsi mencegah input karakter negatif
  const handleInputKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    // Blokir karakter: - (minus), e (exponent), E (exponent)
    if (['-', 'e', 'E'].includes(evt.key)) {
      evt.preventDefault();
    }
  };

  const handleCheckout = async (skipConfirmation = false) => {
    if (isCheckoutDisabled) return;

    if (!skipConfirmation) {
      if (!confirm(`Proses transaksi senilai Rp ${totalAmount.toLocaleString()}?`)) return;
    }

    setIsCheckingOut(true);
    try {
      const result = await Api.postData('CHECKOUT', {
        items: cart.map(i => ({ id: i.id, qty: i.qty, nama: i.nama, harga: i.harga_jual })),
        total: totalAmount,
        paymentMethod: paymentMethod
      });

      // Siapkan Data Struk
      const transactionData = {
        id: result.transactionId || 'OFFLINE-' + Date.now(),
        items: [...cart],
        total: totalAmount,
        paymentMethod,
        cash: paymentMethod === 'Tunai' ? Number(cashReceived) : totalAmount,
        change: paymentMethod === 'Tunai' ? changeAmount : 0,
        date: new Date().toLocaleString('id-ID')
      };
      
      setLastTransaction(transactionData);
      
      // Reset POS
      setCart([]);
      setCashReceived('');
      setPaymentMethod('Tunai');
      refreshData();
      
      // Auto Print (Delay sedikit agar DOM render)
      setTimeout(() => {
        window.print();
      }, 500);

    } catch (err) {
      alert('Gagal memproses transaksi.');
      console.error(err);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Handler tombol Bayar Utama
  const handlePayButton = () => {
    if (paymentMethod === 'QRIS') {
      setIsQrisModalOpen(true);
    } else {
      handleCheckout(false);
    }
  };

  const handleReprint = () => {
    if (lastTransaction) {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!lastTransaction) return;
    
    // Gunakan window.html2pdf dari CDN
    // @ts-ignore
    const html2pdf = window.html2pdf;

    if (!html2pdf) {
      alert("Library PDF gagal dimuat. Pastikan koneksi internet aktif dan refresh halaman.");
      return;
    }

    setIsGeneratingPdf(true);
    const element = document.getElementById('printable-receipt');
    
    if (element) {
      try {
        // Manipulasi DOM sementara agar terlihat oleh html2pdf
        element.classList.remove('hidden');
        element.style.display = 'block';
        element.style.width = '80mm'; // Paksa lebar untuk PDF
        
        const opt = {
          margin: 0,
          filename: `Struk_${lastTransaction.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' } 
        };

        await html2pdf().set(opt).from(element).save();
      } catch (error) {
        console.error("Gagal generate PDF", error);
        alert("Gagal mengunduh PDF");
      } finally {
        // Kembalikan ke state hidden
        element.style.display = ''; 
        element.style.width = '';
        element.classList.add('hidden');
        setIsGeneratingPdf(false);
      }
    }
  };

  const openDailyReport = async () => {
    setIsReportOpen(true);
    setLoadingReport(true);
    try {
      const allTrans = await Api.getTransactions();
      const today = new Date().toDateString();
      // Filter transaksi hari ini
      const todays = allTrans.filter(t => new Date(t.tanggal).toDateString() === today);
      // Sort terbaru diatas
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
      // Backward compatibility: Jika metode_pembayaran tidak ada (data lama), gunakan t.tipe
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
      
      {/* CSS KHUSUS PRINTER THERMAL */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto; /* Memungkinkan printer thermal menentukan panjang kertas otomatis */
          }
          body {
            margin: 0;
            padding: 0;
            background-color: white;
            color: black;
          }
          /* Sembunyikan elemen aplikasi utama agar tidak memakan tempat/membuat blank page */
          #root > *:not(#printable-receipt), 
          .print\\:hidden {
            display: none !important;
          }
          /* Tampilkan Struk */
          #printable-receipt {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%; /* Printer driver akan membatasi ini (misal 58mm atau 80mm) */
            margin: 0;
            padding: 5px;
            font-family: 'Courier New', Courier, monospace; /* Font Thermal Standar */
            font-size: 12px;
            line-height: 1.2;
            color: black;
          }
          /* Hilangkan elemen header/footer default browser jika ada */
          header, footer {
            display: none;
          }
          /* Pastikan warna hitam pekat */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Komponen Struk (Dioptimalkan untuk Thermal) */}
      <div id="printable-receipt" className="hidden print:block bg-white p-2 font-mono text-xs text-black leading-tight max-w-[80mm] mx-auto">
        {lastTransaction && (
          <div className="w-full">
            {/* Header */}
            <div className="text-center mb-2">
              <div className="text-sm font-bold uppercase tracking-widest">AMSA MART</div>
              <div className="text-[10px]">Jl. Merdeka No. 45, Jakarta</div>
              <div className="text-[10px]">Telp: 021-555-0123</div>
            </div>
            
            <div className="border-t border-dashed border-black my-1"></div>
            
            {/* Meta Transaksi */}
            <div className="flex justify-between text-[10px]">
              <span>{lastTransaction.date.split(' ')[0]}</span>
              <span>{lastTransaction.date.split(' ')[1]}</span>
            </div>
            <div className="text-[10px]">No: {lastTransaction.id.substring(0, 8)}...</div>
            
            <div className="border-t border-dashed border-black my-1"></div>
            
            {/* List Item */}
            <div className="space-y-1 my-2">
              {lastTransaction.items.map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="truncate font-medium">{item.nama}</div>
                  <div className="flex justify-between pl-2">
                    <span>{item.qty} x {item.harga_jual.toLocaleString()}</span>
                    <span>{(item.harga_jual * item.qty).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black my-1"></div>

            {/* Total & Pembayaran */}
            <div className="flex justify-between font-bold text-sm my-1">
              <span>TOTAL</span>
              <span>Rp {lastTransaction.total.toLocaleString()}</span>
            </div>
            
            <div className="border-t border-dashed border-black my-1"></div>

            <div className="flex justify-between text-[11px]">
              <span>Bayar ({lastTransaction.paymentMethod})</span>
              <span>Rp {lastTransaction.cash.toLocaleString()}</span>
            </div>
            {lastTransaction.paymentMethod === 'Tunai' && (
              <div className="flex justify-between text-[11px]">
                <span>Kembali</span>
                <span>Rp {lastTransaction.change.toLocaleString()}</span>
              </div>
            )}

            <div className="border-t border-dashed border-black my-2"></div>
            
            {/* Footer */}
            <div className="text-center mt-2 text-[10px]">
              <p>Terima Kasih</p>
              <p>Barang yg dibeli tdk dpt ditukar</p>
              <p className="mt-1">*** LUNAS ***</p>
            </div>
            {/* Spasi bawah untuk printer cutter */}
            <div className="h-4"></div>
          </div>
        )}
      </div>

      {/* Product Grid (Disembunyikan saat Print) */}
      <div className="flex-1 p-4 overflow-y-auto print:hidden">
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
                ${item.stok <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'border-gray-100 hover:border-blue-300'}
              `}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.kode}</span>
                <span className={`text-xs font-bold ${item.stok < 5 ? 'text-red-500' : 'text-green-500'}`}>
                  Stok: {item.stok}
                </span>
              </div>
              <h3 className="font-medium text-gray-800 line-clamp-2 h-10 mb-2">{item.nama}</h3>
              <p className="text-blue-600 font-bold">Rp {item.harga_jual.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Sidebar (Disembunyikan saat Print) */}
      <div className="w-full md:w-96 bg-white shadow-xl flex flex-col border-l border-gray-200 print:hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-blue-800 flex items-center">
            <ShoppingBag className="mr-2 h-5 w-5" /> Keranjang
          </h2>
          <span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full">{cart.length} Item</span>
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

          {/* Tombol Aksi Struk (Cetak Ulang & PDF) */}
          {lastTransaction && cart.length === 0 && (
             <div className="grid grid-cols-2 gap-2">
               <button 
                 onClick={handleReprint}
                 className="py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded border border-gray-300 flex items-center justify-center gap-2 text-xs font-semibold"
               >
                 <RotateCcw size={14} /> Cetak Ulang
               </button>
               <button 
                 onClick={handleDownloadPdf}
                 disabled={isGeneratingPdf}
                 className="py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200 flex items-center justify-center gap-2 text-xs font-semibold disabled:opacity-50"
               >
                 <FileDown size={14} /> {isGeneratingPdf ? 'Memproses...' : 'Simpan PDF'}
               </button>
             </div>
          )}

          {/* Pilihan Metode Pembayaran */}
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

          {/* Input Uang (Hanya jika Tunai) */}
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
                      // Handle jika user mengosongkan input
                      if (val === '') {
                         setCashReceived('');
                         return;
                      }
                      const numVal = parseFloat(val);
                      // Validasi: Cegah angka negatif
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
              
              {/* Pesan Validasi Jika Uang Kurang */}
              {isInsufficientPayment && (
                <div className="bg-red-50 text-red-600 text-xs p-2 rounded flex items-center mt-1 border border-red-200 animate-pulse">
                   <AlertCircle size={12} className="mr-1" />
                   Nominal kurang Rp {Math.abs(changeAmount).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <button
            disabled={isCheckoutDisabled}
            onClick={handlePayButton}
            className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition-all flex justify-center items-center
              ${isCheckoutDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}
            `}
          >
            {isCheckingOut ? 'Memproses...' : (
              <>
                <Printer size={18} className="mr-2" />
                Bayar & Cetak Struk
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal QRIS */}
      {isQrisModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 print:hidden backdrop-blur-sm">
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
                    // Skip konfirmasi karena user sudah menekan tombol Selesai di QRIS (dianggap sudah bayar)
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

      {/* Modal Laporan Harian */}
      {isReportOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden">
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
                      // Logic Backward Compatibility untuk data lama vs baru
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