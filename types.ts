export interface Product {
  id: string;
  kode: string;
  nama: string;
  harga_beli: number;
  harga_jual: number;
  stok: number;
  kategori: string;
  status_pemesanan?: string; // 'ordered' | '' | undefined
}

export interface CartItem extends Product {
  qty: number;
}

export interface LedgerEntry {
  id: string;
  tanggal: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  kategori: string;
}

export interface Transaction {
  id: string;
  tanggal: string;
  item_json: string;
  total: number;
  tipe: string;
}

export type ViewState = 'POS' | 'INVENTORY' | 'LEDGER' | 'REPORTS';

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  id?: string;
}

export type UserRole = 'admin' | 'kasir' | 'manager';

export interface User {
  username: string;
  role: UserRole;
}