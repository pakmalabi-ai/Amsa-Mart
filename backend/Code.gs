// KONFIGURASI SCRIPT
// 1. Buat Google Sheet baru.
// 2. Buat 4 Tab (Sheet) dengan nama persis: "Barang", "Transaksi", "Kas", "Users".
// 3. Header Kolom (Baris 1):
//    - Barang: id, kode, nama, harga_beli, harga_jual, stok, kategori, status_pemesanan
//    - Transaksi: id, tanggal, item_json, total, tipe, metode_pembayaran
//    - Kas: id, tanggal, deskripsi, debit, kredit, kategori
//    - Users: username, password, role
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

    if (action === 'LOGIN') {
      // LOGIKA LOGIN DARI SHEET USERS
      const uSheet = ss.getSheetByName('Users');
      if (!uSheet) {
        throw new Error("Sheet 'Users' tidak ditemukan. Buat tab 'Users' dulu.");
      }
      
      const usersData = uSheet.getDataRange().getValues(); // [username, password, role]
      // Skip header (i=1)
      let foundUser = null;
      
      const inputUser = String(payload.username).trim().toLowerCase();
      const inputPass = String(payload.password).trim(); // Ini adalah Hash dari frontend

      for (let i = 1; i < usersData.length; i++) {
        const dbUser = String(usersData[i][0]).trim().toLowerCase();
        const dbPass = String(usersData[i][1]).trim();
        
        if (dbUser === inputUser && dbPass === inputPass) {
          foundUser = {
            username: usersData[i][0],
            role: usersData[i][2]
          };
          break;
        }
      }

      if (foundUser) {
        result = { status: 'success', user: foundUser };
      } else {
        result = { status: 'error', message: 'Username atau Password salah' };
      }

    } else if (action === 'ADD_PRODUCT') {
      const sheet = ss.getSheetByName('Barang');
      const kSheet = ss.getSheetByName('Kas'); // Load Kas sheet
      const id = Utilities.getUuid();
      
      const stokAwal = Number(payload.stok) || 0;
      const hargaBeli = Number(payload.harga_beli) || 0;

      sheet.appendRow([
        id, 
        payload.kode, 
        payload.nama, 
        hargaBeli, 
        payload.harga_jual, 
        stokAwal, 
        payload.kategori,
        payload.status_pemesanan || '' 
      ]);

      // LOGIKA BARU: Jika ada Stok Awal, catat sebagai Pengeluaran Belanja Stok
      if (stokAwal > 0 && hargaBeli > 0 && kSheet) {
        const kId = Utilities.getUuid();
        const total = stokAwal * hargaBeli;
        const deskripsi = `Stok Awal Barang Baru: ${payload.nama} (${stokAwal} pcs)`;
        const date = new Date();
        // Format Kas: id, tanggal, deskripsi, debit, kredit, kategori
        kSheet.appendRow([kId, date, deskripsi, 0, total, 'Belanja Stok']);
      }

      result = { status: 'success', id: id };
      
    } else if (action === 'UPDATE_PRODUCT') {
      const sheet = ss.getSheetByName('Barang');
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
      // LOGIKA RESTOK: Update Stok & Catat di Kas
      const iSheet = ss.getSheetByName('Barang');
      const kSheet = ss.getSheetByName('Kas');
      
      if (!iSheet || !kSheet) throw new Error("Sheet 'Barang' atau 'Kas' tidak ditemukan.");

      const dataBarang = iSheet.getDataRange().getValues();
      let rowIndex = -1;
      const targetId = String(payload.id).trim();

      for (let i = 1; i < dataBarang.length; i++) {
        if (String(dataBarang[i][0]).trim() === targetId) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex !== -1) {
        const sheetRow = rowIndex + 1;
        const currentStock = Number(dataBarang[rowIndex][5]); 
        const qtyToAdd = Number(payload.qty);
        
        const validStock = isNaN(currentStock) ? 0 : currentStock;
        const validQty = isNaN(qtyToAdd) ? 0 : qtyToAdd;
        
        const newStock = validStock + validQty;
        const buyPrice = Number(payload.harga_beli);

        // 1. Update Stok & Harga Beli Terakhir
        iSheet.getRange(sheetRow, 6).setValue(newStock); 
        iSheet.getRange(sheetRow, 4).setValue(buyPrice); 

        // Reset status pemesanan
        if (dataBarang[rowIndex][7] === 'ordered') {
           iSheet.getRange(sheetRow, 8).setValue(''); 
        }

        // 2. Catat Pengeluaran di Buku Kas
        const kId = Utilities.getUuid();
        const totalBelanja = validQty * buyPrice;
        const deskripsi = `Belanja Stok: ${payload.nama} (${validQty} pcs)`;
        const date = new Date();
        
        kSheet.appendRow([kId, date, deskripsi, 0, totalBelanja, 'Belanja Stok']);
        
        result = { status: 'success', message: 'Stok diperbarui & tercatat di Pengeluaran' };
      } else {
        result = { status: 'error', message: 'Barang tidak ditemukan. ID: ' + targetId };
      }

    } else if (action === 'DELETE_PRODUCT') {
      const sheet = ss.getSheetByName('Barang');
      deleteRow(sheet, payload.id);
      result = { status: 'success' };

    } else if (action === 'CHECKOUT') {
      const tSheet = ss.getSheetByName('Transaksi');
      const iSheet = ss.getSheetByName('Barang');
      const kSheet = ss.getSheetByName('Kas');

      const tId = Utilities.getUuid();
      
      // LOGIKA TANGGAL: Gunakan customDate jika ada (Backdate), jika tidak pakai Now
      let date;
      if (payload.customDate) {
         date = new Date(payload.customDate);
         const now = new Date();
         date.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      } else {
         date = new Date();
      }

      const paymentType = payload.paymentMethod || 'Tunai';
      
      // 1. Catat Transaksi
      tSheet.appendRow([
        tId, 
        date, 
        JSON.stringify(payload.items), 
        payload.total, 
        'Penjualan', 
        paymentType
      ]);

      // 2. Kurangi Stok
      const dataBarang = iSheet.getDataRange().getValues();
      payload.items.forEach(cartItem => {
        const cartId = String(cartItem.id).trim();
        for (let i = 1; i < dataBarang.length; i++) {
          if (String(dataBarang[i][0]).trim() === cartId) {
            const currentStok = Number(dataBarang[i][5]) || 0;
            const newStok = currentStok - cartItem.qty;
            iSheet.getRange(i + 1, 6).setValue(newStok);
            break; 
          }
        }
      });

      // 3. Masuk Buku Kas (Pemasukan/Debit)
      const kId = Utilities.getUuid();
      const deskripsi = `Penjualan POS (${paymentType})`;
      
      // Pastikan pencatatan Kas juga mengikuti tanggal transaksi
      kSheet.appendRow([kId, date, deskripsi, payload.total, 0, 'Penjualan']);
      
      result = { status: 'success', transactionId: tId };

    } else if (action === 'ADD_CAPITAL') {
      const kSheet = ss.getSheetByName('Kas');
      const kId = Utilities.getUuid();
      const date = new Date();
      kSheet.appendRow([kId, date, payload.deskripsi, payload.jumlah, 0, 'Modal']);
      result = { status: 'success' };

    } else if (action === 'ADD_EXPENSE') {
      // LOGIKA BARU: Tambah Pengeluaran Operasional
      const kSheet = ss.getSheetByName('Kas');
      const kId = Utilities.getUuid();
      const date = new Date();
      // id, tanggal, deskripsi, debit (0), kredit (jumlah), kategori
      kSheet.appendRow([kId, date, payload.deskripsi, 0, payload.jumlah, payload.kategori]);
      result = { status: 'success' };

    } else if (action === 'WITHDRAW_PROFIT') {
      const kSheet = ss.getSheetByName('Kas');
      const kId = Utilities.getUuid();
      const date = new Date();
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
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function updateRow(sheet, id, newValues) {
  const data = sheet.getDataRange().getValues();
  const targetId = String(id).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === targetId) {
      sheet.getRange(i + 1, 1, 1, newValues.length).setValues([newValues]);
      break;
    }
  }
}

function deleteRow(sheet, id) {
  const data = sheet.getDataRange().getValues();
  const targetId = String(id).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === targetId) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}