import { SCRIPT_URL as CONST_URL, MOCK_PRODUCTS, MOCK_LEDGER } from '../constants';
import { Product, LedgerEntry } from '../types';

// Helper untuk mendapatkan URL aktif (prioritas LocalStorage, fallback ke constants)
const getBaseUrl = () => {
  return localStorage.getItem('AMSA_MART_API_URL') || CONST_URL;
};

export const Api = {
  getInventory: async (): Promise<Product[]> => {
    const url = getBaseUrl();
    if (!url) {
      console.warn("Menggunakan Data Mock. Masukkan URL di Pengaturan.");
      return new Promise(resolve => setTimeout(() => resolve(MOCK_PRODUCTS), 500));
    }
    try {
      const res = await fetch(`${url}?action=getInventory`);
      const data = await res.json();
      return data.error ? [] : data;
    } catch (error) {
      console.error("Gagal mengambil data inventory", error);
      return [];
    }
  },

  getLedger: async (): Promise<LedgerEntry[]> => {
    const url = getBaseUrl();
    if (!url) {
      return new Promise(resolve => setTimeout(() => resolve(MOCK_LEDGER), 500));
    }
    try {
      const res = await fetch(`${url}?action=getLedger`);
      const data = await res.json();
      return data.error ? [] : data;
    } catch (error) {
      console.error("Gagal mengambil data buku kas", error);
      return [];
    }
  },

  postData: async (action: string, payload: any) => {
    const url = getBaseUrl();
    if (!url) {
      console.log(`[MOCK POST] Action: ${action}`, payload);
      return new Promise(resolve => setTimeout(() => resolve({ status: 'success' }), 800));
    }
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: JSON.stringify({ action, payload }),
      });
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Gagal mengirim data", error);
      throw error;
    }
  }
};