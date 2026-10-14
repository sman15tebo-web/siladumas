/**
 * ====================================================================
 * SiLaDuMas - Sistem Layanan Pengaduan Masyarakat
 * Script: config.js (Application Configuration & Constants)
 * ====================================================================
 */

const CONFIG = {
  // MODE UJICOBA LOKAL (DEV / SANDBOX MODE)
  // • Ubah ke true : Mode uji coba lokal (data tersimpan di browser, aman tanpa menyentuh spreadsheet asli)
  // • Ubah ke false: Mode produksi (terhubung langsung ke Google Apps Script Web App asli)
  DEV_MODE: true,

  // URL Web App Google Apps Script Produksi
  API_URL: "https://script.google.com/a/macros/admin.sma.belajar.id/s/AKfycbzevU966AsCWWebjyIldlVjtW4H6Re_jPXWp5km9cfvgHkHJ1pU6jspcOgErB2lYn3b_Q/exec",
  
  // Storage Keys
  STORAGE_TOKEN: "admToken",
  STORAGE_ROLE: "admRole",

  // Batasan Upload Berkas
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
  MAX_FILE_COUNT: 3,

  // Default Fallbacks
  DEFAULT_APP_NAME: "SiLaDuMas",
  DEFAULT_SCHOOL_NAME: "SMAN 15 Tebo",
  DEFAULT_PLACEHOLDER_LOGO: "https://via.placeholder.com/100?text=No+Logo",

  // Status List & Color Mapping
  STATUS_LIST: ['Baru', 'Diproses', 'Selesai', 'Ditolak']
};

// Global Application State
const APP_STATE = {
  config: {},
  currentPage: 1,
  uploadedFiles: [],
  cropperInstance: null,
  currentCropType: '',
  chartStatus: null,
  chartKategori: null
};
