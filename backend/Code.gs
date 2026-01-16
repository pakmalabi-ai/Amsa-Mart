// KONFIGURASI SCRIPT
// 1. Buat Google Sheet baru.
// 2. Buat 3 Tab (Sheet) dengan nama persis: "Barang", "Transaksi", "Kas".
// 3. Header Kolom (Baris 1):
//    - Barang: id, kode, nama, harga_beli, harga_jual, stok, kategori, status_pemesanan
//    - Transaksi: id, tanggal, item_json, total, tipe
//    - Kas: id, tanggal, deskripsi, debit, kredit, kategori
// 4. Deploy sebagai Web App:
//    - Execute as: Me (saya)
//    - Who has access: Anyone (Siapa saja)

const SHEET_ID = ''; // OPSI: Jika script terpisah dari sheet, isi ID Sheet. Jika menyatu, biarkan kosong.

function getSpreadsheet() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  const op = e.parameter.action;
  const ss = getSpreadsheet();
  let result = {};

  try {
    if (op === 'getInventory') {
      result = getData(ss.getSheetByName('Barang'));
    } else if (op === 'getLedger') {
      result = getData(ss.getSheetByName('Kas'));
    } else if (op === 'getTransactions') {
      result = getData(ss.getSheetByName('Transaksi'));
    } else {
      result = { error: 'Action not found' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = getSpreadsheet();
  let result = {};
  
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload;

    if (action === 'ADD_PRODUCT') {
      const sheet = ss.getSheetByName('Barang');
      const id = Utilities.getUuid();
      // Menambahkan status_pemesanan (default kosong)
      sheet.appendRow([
        id, 
        payload.kode, 
        payload.nama, 
        payload.harga_beli, 
        payload.harga_jual, 
        payload.stok, 
        payload.kategori,
        payload.status_pemesanan || '' 
      ]);
      result = { status: 'success', id: id };
      
    } else if (action === 'UPDATE_PRODUCT') {
      const sheet = ss.getSheetByName('Barang');
      // Update termasuk status_pemesanan
      updateRow(sheet, payload.id, [
        payload.id, 
        payload.kode, 
        payload.nama, 
        payload.harga_beli, 
        payload.harga_jual, 
        payload.stok, 
        payload.kategori,
        payload.status_pemesanan || ''
      ]);
      result = { status: 'success' };

    } else if (action === 'RESTOCK_PRODUCT') {
      const iSheet = ss.getSheetByName('Barang');
      const items = getData(iSheet);
      // Cari baris barang berdasarkan ID
      const rowIdx = items.findIndex(i => i.id === payload.id);

      if (rowIdx !== -1) {
        // 1. Update Stok & Harga Beli di Sheet Barang
        const currentStock = Number(items[rowIdx].stok);
        const addedQty = Number(payload.qty);
        const newStock = currentStock + addedQty;
        const buyPrice = Number(payload.harga_beli);

        // Kolom Harga Beli (ke-4) dan Stok (ke-6)
        // Row index + 2 karena header row dan 0-based index
        iSheet.getRange(rowIdx + 2, 4).setValue(buyPrice); 
        iSheet.getRange(rowIdx + 2, 6).setValue(newStock);
        
        // Reset status pemesanan jika sebelumnya 'ordered'
        if (items[rowIdx].status_pemesanan === 'ordered') {
           iSheet.getRange(rowIdx + 2, 8).setValue(''); 
        }

        // 2. Catat Pengeluaran di Buku Kas
        const kSheet = ss.getSheetByName('Kas');
        const kId = Utilities.getUuid();
        const totalBelanja = addedQty * buyPrice;
        const deskripsi = `Belanja Stok: ${payload.nama} (${addedQty} pcs)`;
        const date = new Date();
        
        // id, tanggal, deskripsi, debit, kredit, kategori
        kSheet.appendRow([kId, date, deskripsi, 0, totalBelanja, 'Belanja Stok']);
        
        result = { status: 'success', message: 'Stok diperbarui & tercatat di Pengeluaran' };
      } else {
        result = { status: 'error', message: 'Barang tidak ditemukan' };
      }

    } else if (action === 'DELETE_PRODUCT') {
      const sheet = ss.getSheetByName('Barang');
      deleteRow(sheet, payload.id);
      result = { status: 'success' };

    } else if (action === 'CHECKOUT') {
      // 1. Catat Transaksi
      const tSheet = ss.getSheetByName('Transaksi');
      const tId = Utilities.getUuid();
      const date = new Date();
      // Ambil metode pembayaran, default ke Tunai jika tidak ada
      const paymentType = payload.paymentMethod || 'Tunai';
      
      tSheet.appendRow([tId, date, JSON.stringify(payload.items), payload.total, paymentType]);

      // 2. Kurangi Stok
      const iSheet = ss.getSheetByName('Barang');
      const items = getData(iSheet);
      payload.items.forEach(cartItem => {
        const rowIdx = items.findIndex(i => i.id === cartItem.id);
        if (rowIdx !== -1) {
          // Baris di sheet = rowIdx + 2 (karena header + index 0-based)
          // Kolom Stok ada di index 5 (A=0, F=5) -> Column 6
          const currentStock = items[rowIdx].stok;
          iSheet.getRange(rowIdx + 2, 6).setValue(currentStock - cartItem.qty);
        }
      });

      // 3. Masuk Buku Kas (Debit)
      const kSheet = ss.getSheetByName('Kas');
      const kId = Utilities.getUuid();
      const deskripsi = `Penjualan POS (${paymentType})`;
      kSheet.appendRow([kId, date, deskripsi, payload.total, 0, 'Penjualan']);
      
      result = { status: 'success', transactionId: tId };

    } else if (action === 'ADD_CAPITAL') {
      // Input Modal Awal
      const kSheet = ss.getSheetByName('Kas');
      const kId = Utilities.getUuid();
      const date = new Date();
      // id, tanggal, deskripsi, debit, kredit, kategori
      kSheet.appendRow([kId, date, payload.deskripsi, payload.jumlah, 0, 'Modal']);
      
      result = { status: 'success' };

    } else if (action === 'WITHDRAW_PROFIT') {
      // Ambil Laba / Prive
      const kSheet = ss.getSheetByName('Kas');
      const kId = Utilities.getUuid();
      const date = new Date();
      // id, tanggal, deskripsi, debit, kredit, kategori
      kSheet.appendRow([kId, date, payload.deskripsi, 0, payload.jumlah, 'Prive']);
      
      result = { status: 'success' };
    }
  } catch (err) {
    result = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helpers
function getData(sheet) {
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function updateRow(sheet, id, newValues) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) { // Asumsi kolom ID di index 0
      sheet.getRange(i + 1, 1, 1, newValues.length).setValues([newValues]);
      break;
    }
  }
}

function deleteRow(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}