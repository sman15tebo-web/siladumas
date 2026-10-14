/**
 * ====================================================================
 * SiLaDuMas - Sistem Layanan Pengaduan Masyarakat
 * Backend: Google Apps Script (Kode.gs)
 * Arsitektur: Serverless REST-like Gateway for GitHub Pages Frontend
 * ====================================================================
 */

/**
 * --- KONFIGURASI GLOBAL SISTEM ---
 */
const CONFIG = {
  DB_ID: '1Smdjew4pmd4MF6grcPWUghINuFv_TfviJ7NduqtPqL8',  
  SHEET_NAME: 'Data_Pengaduan',
  ARSIP_SHEET: 'Arsip_Data',
  LINK_SHEET: 'Setting', 
  APP_NAME: "SiPengaduan Sekolah",
  
  // ID Folder Google Drive untuk Penyimpanan Berkas Lampiran & Logo:
  FOLDER_ID: '1RrfdIHBTWQPz0OYt3WHPrtvzwP9NltCP' 
};

/**
 * Helper Database Spreadsheet
 */
function getDb() {
  return SpreadsheetApp.openById(CONFIG.DB_ID);
}

/**
 * Sanitasi Input untuk Mencegah Formula Injection di Google Sheets (=, +, -, @)
 */
function sanitizeSheetInput(str) {
  if (str === null || str === undefined) return '';
  const val = String(str);
  if (/^[=+@\-]/.test(val)) {
    return "'" + val;
  }
  return val;
}

/**
 * Sanitasi HTML untuk Template PDF
 */
function escapePdfHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// ====================================================================
// 1. GATEWAY API (doPost & doGet)
// ====================================================================

/**
 * Entrypoint POST untuk semua request fetch dari Frontend GitHub Pages
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Payload request tidak ditemukan.");
    }

    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload || {};
    let result = {};

    // ROUTER AKSI
    switch (action) {
      // Endpoint Publik
      case 'getAppConfig':
        result = getAppConfig();
        break;
      case 'simpanPengaduan':
        result = simpanPengaduan(payload.data, payload.fileData);
        break;
      case 'cekStatusTiket':
        result = cekStatusTiket(payload.ticketId);
        break;

      // Endpoint Autentikasi
      case 'loginAdmin':
        result = loginAdmin(payload.user, payload.pass);
        break;

      // Endpoint Panel Admin (Memerlukan Token)
      case 'getDashboardStats':
        result = getDashboardStats(payload.token);
        break;
      case 'getAdminData':
        result = getAdminData(payload.token, payload.page, payload.limit, payload.start, payload.end, payload.search);
        break;
      case 'updateStatus':
        result = updateStatus(payload.token, payload.rowIndex, payload.newStatus, payload.catatan);
        break;
      case 'deleteReport':
        result = deleteReport(payload.token, payload.ticketId);
        break;
      case 'exportExcel':
        result = exportExcel(payload.token, payload.start, payload.end);
        break;
      case 'generatePDF':
        result = generatePDF(payload.token, payload.rowDataStr, payload.configStr);
        break;

      // Endpoint Manajemen Akun User (Superadmin)
      case 'getAllUsers':
        result = getAllUsers(payload.token);
        break;
      case 'saveUserAccount':
        result = saveUserAccount(payload.token, payload.username, payload.password, payload.role, payload.isEdit, payload.rowIndex);
        break;
      case 'deleteUserAccount':
        result = deleteUserAccount(payload.token, payload.rowIndex);
        break;

      // Endpoint Konfigurasi Aplikasi (Superadmin)
      case 'uploadLogoFromSetup':
        result = uploadLogoFromSetup(payload.base64Data, payload.filename);
        break;
      case 'saveAppConfig':
        result = saveAppConfig(payload.form, payload.token);
        break;

      // Endpoint Foto Slide Banner (Rasio 7:3)
      case 'getHomeSlides':
        result = getHomeSlides();
        break;
      case 'getAllSlides':
        result = getAllSlides(payload.token);
        break;
      case 'saveSlideItem':
        result = saveSlideItem(payload.slideData, payload.token);
        break;
      case 'deleteSlideItem':
        result = deleteSlideItem(payload.slideId, payload.token);
        break;
      case 'toggleSlideItem':
        result = toggleSlideItem(payload.slideId, payload.token);
        break;

      default:
        throw new Error(`Aksi API [${action}] tidak dikenali.`);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error doPost:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message || "Terjadi kesalahan internal server."
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Fallback Healthcheck GET via Browser
 */
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "ONLINE",
      app: CONFIG.APP_NAME,
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);
}


// ====================================================================
// 2. LAYANAN AUTENTIKASI & KEAMANAN SESI
// ====================================================================

function hashPassword(password) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password || ""));
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) hashVal += 256;
    if (hashVal.toString(16).length === 1) txtHash += '0';
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}

function createSessionToken(sessionData) {
  const token = Utilities.getUuid();
  // Simpan token sesi ke Script Cache (durasi 6 jam = 21600 detik)
  CacheService.getScriptCache().put(token, sessionData, 21600);
  return token;
}

function verifySession(token) {
  if (!token) throw new Error("Akses Ditolak: Token tidak disertakan.");
  const sessionData = CacheService.getScriptCache().get(token);
  if (!sessionData) throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
  return sessionData;
}

function loginAdmin(user, pass) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName('Data_User'); 
    if (!sheet) return { success: false, error: "Sheet 'Data_User' tidak ditemukan di database." };
    
    const data = sheet.getDataRange().getDisplayValues();
    const inputUser = String(user || "").trim().toLowerCase();
    const inputHash = hashPassword(String(pass || "").trim());
    
    // Mulai dari baris 2 untuk melewati baris header
    for (let i = 1; i < data.length; i++) { 
      let dbUser = String(data[i][0] || "").trim();
      let dbPassHash = String(data[i][1] || "").trim();
      let dbAkses = String(data[i][2] || "Semua").trim(); // Hak akses kategori
      
      if (inputUser === dbUser.toLowerCase() && inputHash === dbPassHash) {
        const sessionData = dbUser + "|||" + dbAkses;
        return {
          success: true,
          token: createSessionToken(sessionData),
          akses: dbAkses
        };
      }
    }
    return { success: false, error: "Username atau Password salah." };
  } catch (e) {
    return { success: false, error: e.message };
  }
}


// ====================================================================
// 3. LAYANAN PENGADUAN PUBLIK
// ====================================================================

function simpanPengaduan(data, fileData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, error: "Server sedang sibuk. Silakan coba kembali sesaat lagi." };
  }

  try {
    const ss = getDb();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) throw new Error(`Sheet '${CONFIG.SHEET_NAME}' tidak ditemukan.`);

    const now = new Date();
    const ticketID = "TKT-" + Utilities.formatDate(now, "GMT+7", "yyyyMMdd") + "-" + Math.floor(Math.random() * 1000).toString().padStart(3, '0'); 
    let fileLinks = [];

    // Proses Lampiran Berkas ke Google Drive
    if (fileData && Array.isArray(fileData) && fileData.length > 0) {
      try {
        const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
        fileData.forEach((f, idx) => {
          if (f.data) {
            const cleanName = (f.name || `lampiran_${idx + 1}`).replace(/[^a-zA-Z0-9._-]/g, '_');
            const blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.mimeType || MimeType.PNG, `${ticketID}_${cleanName}`);
            const file = folder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            fileLinks.push(file.getUrl());
          }
        });
      } catch (err) {
        console.error("Gagal simpan lampiran:", err);
        fileLinks.push("(Gagal Upload Lampiran)");
      }
    }

    // Append baris ke Spreadsheet dengan proteksi formula injection
    sheet.appendRow([
      ticketID,
      now,
      sanitizeSheetInput(data.nama),
      sanitizeSheetInput(data.identitas),
      "'" + sanitizeSheetInput(data.kontak),
      data.statusPelapor || "Masyarakat",
      sanitizeSheetInput(data.judul),
      data.kategori || "Lainnya",
      sanitizeSheetInput(data.lokasi),
      data.waktuKejadian || Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd"),
      sanitizeSheetInput(data.uraian),
      fileLinks.join(", "),
      "Baru",
      ""
    ]);

    // Kirim notifikasi email ke Admin bila email dikonfigurasi
    try {
      const emailSheet = ss.getSheetByName(CONFIG.LINK_SHEET);
      if (emailSheet) {
        const adminEmail = String(emailSheet.getRange("C15").getValue() || "").trim();
        if (adminEmail && adminEmail.includes("@")) {
          MailApp.sendEmail({ 
            to: adminEmail, 
            subject: `[${CONFIG.APP_NAME}] Pengaduan Baru: ${ticketID}`, 
            htmlBody: `Ada laporan pengaduan baru masuk:<br><br><b>ID Tiket:</b> ${ticketID}<br><b>Judul:</b> ${sanitizeSheetInput(data.judul)}<br><b>Kategori:</b> ${data.kategori}<br><b>Pelapor:</b> ${sanitizeSheetInput(data.nama)} (${sanitizeSheetInput(data.kontak)})<br><br>Silakan buka panel admin untuk menindaklanjuti.` 
          });
        }
      }
    } catch (mailErr) {
      console.warn("Gagal kirim email notifikasi:", mailErr.message);
    }

    return { success: true, ticket: ticketID };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function cekStatusTiket(ticketId) {
  if (!ticketId) return { found: false };
  const sheet = getDb().getSheetByName(CONFIG.SHEET_NAME);
  const finder = sheet.getRange("A:A").createTextFinder(String(ticketId).trim()).matchEntireCell(true);
  const result = finder.findNext();
  if (result) {
    const row = result.getRow();
    const rowData = sheet.getRange(row, 1, 1, 14).getValues()[0];
    return {
      found: true,
      tiket: String(rowData[0]),
      judul: String(rowData[6]),
      status: String(rowData[12]),
      catatan: String(rowData[13] || ""),
      tanggal: Utilities.formatDate(new Date(rowData[1]), "GMT+7", "dd MMM yyyy")
    };
  }
  return { found: false };
}


// ====================================================================
// 4. LAYANAN DATA & DASHBOARD ADMIN
// ====================================================================

function getDashboardStats(token) {
  const sessionData = verifySession(token);
  const akses = sessionData.split("|||")[1] || "Semua";
  
  const ss = getDb();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  let stats = {
    total: 0,
    status: { 'Baru': 0, 'Diproses': 0, 'Selesai': 0, 'Ditolak': 0 },
    kategori: {},
    recent: []
  };
  
  // Looping dari baris terbawah untuk menghitung data
  for (let i = data.length - 1; i > 0; i--) {
    let row = data[i];
    let kat = String(row[7] || "Lainnya");
    let stat = String(row[12] || "Baru");
    let tgl = Utilities.formatDate(new Date(row[1]), "GMT+7", "dd/MM/yyyy");
    
    // Filter hak akses kategori
    if (akses === "Semua" || akses === "Superadmin" || akses.toLowerCase() === kat.toLowerCase()) {
      stats.total++;
      
      if (stats.status[stat] !== undefined) {
        stats.status[stat]++;
      }
      
      if (!stats.kategori[kat]) {
        stats.kategori[kat] = 0;
      }
      stats.kategori[kat]++;
      
      if (stats.recent.length < 5) {
        stats.recent.push({
          id: String(row[0]),
          judul: String(row[6]),
          status: stat,
          tanggal: tgl
        });
      }
    }
  }
  return { success: true, data: stats };
}

function getAdminData(token, pageNumber, pageSize, startDateStr, endDateStr, searchKeyword) {
  const sessionData = verifySession(token);
  const akses = sessionData.split("|||")[1] || "Semua"; 
  
  const page = parseInt(pageNumber) || 1;
  const limit = parseInt(pageSize) || 10;
  
  const ss = getDb();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return { data: [], total: 0, page: 1, totalPages: 0 };
  }
  
  const rawData = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  
  let allData = rawData.map((row, i) => ({
    rowIndex: i + 2,
    id: String(row[0] || ""),
    dateObj: row[1] ? new Date(row[1]) : new Date(),
    tanggal: row[1] ? Utilities.formatDate(new Date(row[1]), "GMT+7", "dd/MM/yyyy HH:mm") : "-",
    nama: String(row[2] || ""),
    kontak: String(row[4] || ""),
    judul: String(row[6] || ""),
    kategori: String(row[7] || ""),
    uraian: String(row[10] || ""),
    bukti: String(row[11] || ""),
    status: String(row[12] || "Baru"),
    catatan: String(row[13] || "")
  }));

  // Filter Hak Akses Kategori
  if (akses !== "Semua" && akses !== "Superadmin") {
    allData = allData.filter(item => item.kategori.toLowerCase() === akses.toLowerCase());
  }

  // Filter Rentang Tanggal
  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr); start.setHours(0,0,0,0);
    const end = new Date(endDateStr); end.setHours(23,59,59,999);
    allData = allData.filter(item => item.dateObj >= start && item.dateObj <= end);
  }
  
  // Filter Pencarian
  if (searchKeyword) {
    const key = String(searchKeyword).toLowerCase();
    allData = allData.filter(item => 
      item.id.toLowerCase().includes(key) || 
      item.nama.toLowerCase().includes(key) || 
      item.judul.toLowerCase().includes(key)
    );
  }

  allData.reverse(); 
  const totalData = allData.length;
  const totalPages = Math.ceil(totalData / limit);
  const validPage = page > totalPages ? (totalPages || 1) : page;
  const startIndex = (validPage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalData);
  
  const pagedData = allData.slice(startIndex, endIndex).map(item => {
    delete item.dateObj;
    return item;
  });
  
  return {
    data: pagedData,
    total: totalData,
    page: validPage,
    totalPages: totalPages
  };
}

function updateStatus(token, rowIndex, newStatus, catatan) {
  verifySession(token);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = getDb().getSheetByName(CONFIG.SHEET_NAME);
    const rIdx = parseInt(rowIndex);
    if (rIdx > 1) {
      sheet.getRange(rIdx, 13, 1, 2).setValues([[
        newStatus,
        sanitizeSheetInput(catatan)
      ]]);
      return { success: true, message: "Status berhasil diupdate." };
    }
    return { success: false, error: "Baris data tidak valid." };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function deleteReport(token, ticketId) {
  verifySession(token);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = getDb().getSheetByName(CONFIG.SHEET_NAME);
    const finder = sheet.getRange("A:A").createTextFinder(String(ticketId).trim()).matchEntireCell(true);
    const result = finder.findNext();
    if (result) {
      sheet.deleteRow(result.getRow());
      return { success: true };
    }
    return { success: false, error: "Data laporan tidak ditemukan." };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}


// ====================================================================
// 5. MANAJEMEN AKUN USER (CRUD)
// ====================================================================

function getAllUsers(token) {
  const sessionData = verifySession(token);
  const akses = sessionData.split("|||")[1] || "";
  
  if (akses !== "Semua" && akses !== "Superadmin") {
    return { success: false, error: "Akses ditolak: Hanya Superadmin yang berwenang." };
  }

  const sheet = getDb().getSheetByName('Data_User');
  if (!sheet) return { success: false, error: "Sheet Data_User tidak ditemukan." };

  const data = sheet.getDataRange().getDisplayValues();
  let users = [];
  
  for (let i = 1; i < data.length; i++) {
    users.push({
      rowIndex: i + 1,
      username: data[i][0],
      akses: data[i][2] || "Semua"
    });
  }
  return { success: true, data: users };
}

function saveUserAccount(token, username, password, role, isEdit, rowIndex) {
  const sessionData = verifySession(token);
  const akses = sessionData.split("|||")[1] || "";
  if (akses !== "Semua" && akses !== "Superadmin") throw new Error("Akses ditolak.");

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = getDb().getSheetByName('Data_User');
    const uName = String(username || "").trim();
    const rRole = String(role || "Semua").trim();
    
    // Edit User
    if (isEdit && rowIndex) {
      const rIdx = parseInt(rowIndex);
      sheet.getRange(rIdx, 1).setValue(uName);
      sheet.getRange(rIdx, 3).setValue(rRole);
      if (password && String(password).trim() !== "") {
        sheet.getRange(rIdx, 2).setValue(hashPassword(password));
      }
      return { success: true, message: "Akun berhasil diupdate." };
    } 
    // Tambah User Baru
    else {
      const existing = sheet.getRange("A:A").getDisplayValues();
      for (let i = 0; i < existing.length; i++) {
        if (existing[i][0].toLowerCase() === uName.toLowerCase()) {
          return { success: false, error: "Username sudah digunakan!" };
        }
      }
      sheet.appendRow([uName, hashPassword(password), rRole]);
      return { success: true, message: "Akun pengguna berhasil ditambahkan." };
    }
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function deleteUserAccount(token, rowIndex) {
  const sessionData = verifySession(token);
  const akses = sessionData.split("|||")[1] || "";
  if (akses !== "Semua" && akses !== "Superadmin") throw new Error("Akses ditolak.");

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = getDb().getSheetByName('Data_User');
    const rIdx = parseInt(rowIndex);
    if (rIdx > 1) {
      sheet.deleteRow(rIdx);
      return { success: true };
    }
    return { success: false, error: "Baris tidak valid." };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}


// ====================================================================
// 6. LAYANAN KONFIGURASI APLIKASI
// ====================================================================

function getAppConfig() {
  const ss = getDb();
  const sheet = ss.getSheetByName(CONFIG.LINK_SHEET);
  const data = sheet.getRange("C3:C19").getDisplayValues();
  
  const fixUrl = (url) => {
    if (!url) return "https://via.placeholder.com/100?text=No+Logo";
    if (url.includes("drive.google.com")) {
      const match = url.match(/\/d\/(.*?)\//) || url.match(/id=(.*?)$/);
      if (match && match[1]) return "https://lh3.googleusercontent.com/d/" + match[1];
    }
    return url;
  };

  return {
    logo: fixUrl(data[0][0]),
    logoinstansi: fixUrl(data[1][0]), 
    namasekolah: data[2][0] || "SMAN 15 Tebo",
    provinsi: data[3][0] || "JAMBI",
    tahun: data[4][0] || new Date().getFullYear().toString(), 
    website: data[5][0] || "",
    slogan: data[6][0] || "",
    runningtext: data[7][0] || "",
    jalan: data[10][0] || "",
    telp: data[11][0] || "",
    email: data[12][0] || "", 
    webdinas: data[13][0] || "",
    webspmb: data[14][0] || "",
    theme: (data.length >= 16 && data[15]) ? data[15][0] : "",
    fotosekolah: (data.length >= 17 && data[16]) ? data[16][0] : ""
  };
}

function uploadLogoFromSetup(base64Data, filename) {
  try {
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), MimeType.PNG, filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const url = "https://drive.google.com/uc?export=view&id=" + file.getId();
    return { success: true, url: url };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function saveAppConfig(form, token) {
  verifySession(token); 
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const ss = getDb();
    const sheet = ss.getSheetByName(CONFIG.LINK_SHEET);
    const currentData = sheet.getRange("C3:C4").getValues();
    
    const newLogo = (form.cfg_logo && form.cfg_logo.length > 10) ? form.cfg_logo : currentData[0][0];
    const newInstansi = (form.cfg_instansi && form.cfg_instansi.length > 10) ? form.cfg_instansi : currentData[1][0];
    
    const updates = [
      [newLogo],
      [newInstansi],
      [sanitizeSheetInput(form.cfg_sekolah)],
      [sanitizeSheetInput(form.cfg_provinsi)],
      [sanitizeSheetInput(form.cfg_tahun)],
      [sanitizeSheetInput(form.cfg_website)],
      [sanitizeSheetInput(form.cfg_slogan)],
      [sanitizeSheetInput(form.cfg_running)]
    ];
    sheet.getRange("C3:C10").setValues(updates);

    const updates2 = [
      [sanitizeSheetInput(form.cfg_jalan)],
      [sanitizeSheetInput(form.cfg_telp)],
      [sanitizeSheetInput(form.cfg_email)],
      [sanitizeSheetInput(form.cfg_dinas)],
      [sanitizeSheetInput(form.cfg_spmb)]
    ];
    sheet.getRange("C13:C17").setValues(updates2);

    if (form.cfg_theme) {
      sheet.getRange("C18").setValue(sanitizeSheetInput(form.cfg_theme));
    }

    if (form.cfg_fotosekolah) {
      sheet.getRange("C19").setValue(sanitizeSheetInput(form.cfg_fotosekolah));
    }
    
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}


// ====================================================================
// 7. LAYANAN CETAK PDF & EXCEL
// ====================================================================

function getDriveImageAsBase64(url) {
  if (!url) return "";
  try {
    let fileId = "";
    if (url.indexOf("drive.google.com") !== -1 || url.includes("googleusercontent")) {
      const match = url.match(/\/d\/(.*?)\//) || url.match(/id=(.*?)$/) || url.match(/\/d\/(.*)/);
      if (match && match[1]) fileId = match[1];
    }
    if (fileId) {
      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob();
      return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
    }
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const blob = response.getBlob();
      return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
    }
    return "";
  } catch (e) {
    return "";
  }
}

function generatePDF(token, rowDataStr, configStr) {
  verifySession(token);
  const rowData = JSON.parse(rowDataStr);
  const config = JSON.parse(configStr); 

  const logoInstansiBase64 = getDriveImageAsBase64(config.logoinstansi);
  const logoSekolahBase64 = getDriveImageAsBase64(config.logo);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body { font-family: 'Arial', sans-serif; padding: 40px; color: #000; font-size: 11pt; }
      .header-table { width: 100%; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
      .logo { width: 80px; height: auto; }
      .instansi { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0; text-align: center; }
      .sekolah { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 5px 0; text-align: center; }
      .alamat { font-size: 10pt; margin: 0; text-align: center; }
      .title { text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 25px; font-size: 14pt; margin-top: 20px;}
      .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      .data-table td { padding: 6px 8px; vertical-align: top; }
      .label { width: 160px; font-weight: bold; }
      .sep { width: 10px; text-align: center; }
      .value { text-align: justify; }
      .uraian-box { border: 1px solid #000; padding: 10px; min-height: 100px; margin-top: 5px; text-align: justify; }
      .footer { margin-top: 50px; text-align: right; font-size: 9pt; font-style: italic; }
    </style></head><body>
    <table class="header-table">
      <tr>
        <td width="15%" align="left" style="vertical-align: middle;">${logoInstansiBase64 ? `<img src="${logoInstansiBase64}" class="logo">` : ''}</td>
        <td align="center" style="vertical-align: middle;">
          <div class="instansi">PEMERINTAH ${escapePdfHtml(config.provinsi)}</div>
          <div class="sekolah">${escapePdfHtml(config.namasekolah)}</div>
          <div class="alamat">${escapePdfHtml(config.jalan)}</div>
          <div class="alamat">Telp: ${escapePdfHtml(config.telp)} | Email: ${escapePdfHtml(config.email)}</div>
        </td>
        <td width="15%" align="right" style="vertical-align: middle;">${logoSekolahBase64 ? `<img src="${logoSekolahBase64}" class="logo">` : ''}</td>
      </tr>
    </table>
    <div class="title">BUKTI TANDA TERIMA PENGADUAN</div>
    <table class="data-table">
      <tr><td class="label">ID Tiket</td><td class="sep">:</td><td class="value"><b>${escapePdfHtml(rowData.id)}</b></td></tr>
      <tr><td class="label">Tanggal Lapor</td><td class="sep">:</td><td class="value">${escapePdfHtml(rowData.tanggal)}</td></tr>
      <tr><td class="label">Nama Pelapor</td><td class="sep">:</td><td class="value">${escapePdfHtml(rowData.nama)}</td></tr>
      <tr><td class="label">Identitas / Kontak</td><td class="sep">:</td><td class="value">${escapePdfHtml(rowData.kontak)}</td></tr>
      <tr><td class="label">Kategori</td><td class="sep">:</td><td class="value">${escapePdfHtml(rowData.kategori)}</td></tr>
      <tr><td class="label">Pokok Masalah</td><td class="sep">:</td><td class="value">${escapePdfHtml(rowData.judul)}</td></tr>
      <tr><td class="label">Status Saat Ini</td><td class="sep">:</td><td class="value" style="text-transform:uppercase;">${escapePdfHtml(rowData.status)}</td></tr>
    </table>
    <div style="font-weight:bold; margin-bottom:5px;">Rincian / Uraian Laporan:</div>
    <div class="uraian-box">${escapePdfHtml(rowData.uraian)}</div>
    <div style="font-weight:bold; margin-top:15px; margin-bottom:5px;">Tindak Lanjut / Catatan Admin:</div>
    <div class="uraian-box" style="min-height: 60px; background: #f9f9f9;">${escapePdfHtml(rowData.catatan) || '(Belum ada catatan)'}</div>
    <div class="footer">
      <p>Dokumen ini dicetak secara otomatis melalui Sistem Layanan Pengaduan ${escapePdfHtml(config.namasekolah)}.<br>Tanggal Cetak: ${Utilities.formatDate(new Date(), "GMT+7", "dd MMMM yyyy HH:mm")}</p>
    </div>
  </body></html>`;

  const blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF).setName("Laporan_" + rowData.id + ".pdf");
  return {
    base64: Utilities.base64Encode(blob.getBytes()),
    filename: "Laporan_" + rowData.id + ".pdf"
  };
}

function exportExcel(token, startDateStr, endDateStr) {
  verifySession(token);
  const ss = getDb();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  let exportData = [data[0]];
  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr); start.setHours(0,0,0,0);
    const end = new Date(endDateStr); end.setHours(23,59,59,999);
    for (let i = 1; i < data.length; i++) {
      let rowDate = new Date(data[i][1]);
      if (rowDate >= start && rowDate <= end) {
        data[i][1] = Utilities.formatDate(rowDate, "GMT+7", "yyyy-MM-dd HH:mm");
        exportData.push(data[i]);
      }
    }
  } else {
    exportData = data;
  }
  
  const tempSS = SpreadsheetApp.create("Export_" + new Date().getTime());
  const tempSheet = tempSS.getSheets()[0];
  if (exportData.length > 0) {
    tempSheet.getRange(1, 1, exportData.length, exportData[0].length).setValues(exportData);
  }
  
  return {
    url: "https://docs.google.com/spreadsheets/d/" + tempSS.getId() + "/export?format=xlsx"
  };
}


// ====================================================================
// 8. PEMELIHARAAN OTOMATIS (TRIGGER HARIAN & ARSIP)
// ====================================================================

function createDailyBackup() {
  const backupFolderName = "Backup_SiPengaduan";
  const retentionDays = 7;
  
  try {
    let folder;
    const folders = DriveApp.getFoldersByName(backupFolderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(backupFolderName);
    }
    
    const sourceFile = DriveApp.getFileById(CONFIG.DB_ID);
    const dateStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd_HH-mm");
    const backupName = `Backup_${CONFIG.APP_NAME}_${dateStr}`;
    
    sourceFile.makeCopy(backupName, folder);
    console.log("Backup berhasil dibuat: " + backupName);
    
    const files = folder.getFiles();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    while (files.hasNext()) {
      const file = files.next();
      if (file.getDateCreated() < cutoffDate) {
        file.setTrashed(true);
        console.log("File backup lama dipindahkan ke sampah: " + file.getName());
      }
    }
  } catch (e) {
    console.error("Gagal melakukan backup:", e.message);
  }
}

function autoArchive() {
  const ss = getDb();
  const sourceSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const targetSheet = ss.getSheetByName(CONFIG.ARSIP_SHEET);
  const data = sourceSheet.getDataRange().getValues();
  if (data.length < 2) return;

  const now = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  let rowsToDelete = [];
  let rowsToArchive = [];

  for (let i = 1; i < data.length; i++) {
    let rowDate = new Date(data[i][1]);
    if (rowDate < threeMonthsAgo) {
      rowsToArchive.push(data[i]);
      rowsToDelete.push(i + 1);
    }
  }

  if (rowsToArchive.length > 0) {
    targetSheet.getRange(targetSheet.getLastRow() + 1, 1, rowsToArchive.length, rowsToArchive[0].length).setValues(rowsToArchive);
    rowsToDelete.reverse();
    rowsToDelete.forEach(rowIndex => {
      sourceSheet.deleteRow(rowIndex);
    });
  }
}


// ====================================================================
// 9. LAYANAN FOTO SLIDE BANNER (RASIO 7:3)
// ====================================================================

function getSlideSheet_() {
  const ss = getDb();
  let sheet = ss.getSheetByName('Slide_Banner');
  if (!sheet) {
    sheet = ss.insertSheet('Slide_Banner');
    sheet.appendRow(['ID', 'Image', 'Title', 'Desc', 'Active', 'Order']);
  }
  return sheet;
}

function getHomeSlides() {
  try {
    const sheet = getSlideSheet_();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    let slides = [];
    for (let i = 1; i < data.length; i++) {
      const active = data[i][4];
      if (active === true || active === 'TRUE' || active === 1 || active === 'true') {
        slides.push({
          id: String(data[i][0]),
          image: String(data[i][1]),
          title: String(data[i][2]),
          desc: String(data[i][3]),
          active: true,
          order: Number(data[i][5]) || i
        });
      }
    }
    return slides;
  } catch (e) {
    return [];
  }
}

function getAllSlides(token) {
  verifySession(token);
  try {
    const sheet = getSlideSheet_();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    let slides = [];
    for (let i = 1; i < data.length; i++) {
      slides.push({
        id: String(data[i][0]),
        image: String(data[i][1]),
        title: String(data[i][2]),
        desc: String(data[i][3]),
        active: data[i][4] === true || data[i][4] === 'TRUE' || data[i][4] === 'true',
        order: Number(data[i][5]) || i
      });
    }
    return slides;
  } catch (e) {
    return [];
  }
}

function saveSlideItem(slideData, token) {
  verifySession(token);
  const sheet = getSlideSheet_();
  const data = sheet.getDataRange().getValues();
  const id = slideData.id || ("SLD-" + new Date().getTime());
  
  let foundRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      foundRow = i + 1;
      break;
    }
  }

  const rowData = [
    id,
    slideData.image,
    sanitizeSheetInput(slideData.title || ''),
    sanitizeSheetInput(slideData.desc || ''),
    slideData.active !== false,
    slideData.order || (foundRow > 0 ? data[foundRow - 1][5] : data.length)
  ];

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, 6).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return { success: true, id: id };
}

function deleteSlideItem(slideId, token) {
  verifySession(token);
  const sheet = getSlideSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(slideId)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: true };
}

function toggleSlideItem(slideId, token) {
  verifySession(token);
  const sheet = getSlideSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(slideId)) {
      const cur = data[i][4] === true || data[i][4] === 'TRUE';
      sheet.getRange(i + 1, 5).setValue(!cur);
      return { success: true, active: !cur };
    }
  }
  return { success: false, error: 'Slide tidak ditemukan' };
}