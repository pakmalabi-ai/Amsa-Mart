// Ganti URL ini dengan URL Web App Google Apps Script Anda setelah deploy
// Format: https://script.google.com/macros/s/XXXXX/exec
export const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyWd-WKXpRJaRmA3U_EPEz_ny0SjmKuIFKkmfJ95xLGwbHKMwkYkwopuUYtLpHTgpxw0w/exec'; 

export const MOCK_PRODUCTS = [
  { id: '1', kode: 'BRG001', nama: 'Indomie Goreng', harga_beli: 2500, harga_jual: 3500, stok: 100, kategori: 'Makanan' },
  { id: '2', kode: 'BRG002', nama: 'Aqua Botol 600ml', harga_beli: 3000, harga_jual: 5000, stok: 48, kategori: 'Minuman' },
  { id: '3', kode: 'BRG003', nama: 'Telur Ayam (kg)', harga_beli: 24000, harga_jual: 28000, stok: 15, kategori: 'Sembako' },
  { id: '4', kode: 'BRG004', nama: 'Beras Premium 5kg', harga_beli: 65000, harga_jual: 75000, stok: 10, kategori: 'Sembako' },
  { id: '5', kode: 'BRG005', nama: 'Kopi Kapal Api', harga_beli: 1200, harga_jual: 2000, stok: 200, kategori: 'Minuman' },
];

export const MOCK_LEDGER = [
  { id: '1', tanggal: new Date().toISOString(), deskripsi: 'Modal Awal', debit: 5000000, kredit: 0, kategori: 'Modal' },
  { id: '2', tanggal: new Date().toISOString(), deskripsi: 'Belanja Stok Awal', debit: 0, kredit: 1500000, kategori: 'Belanja Stok' },
];
