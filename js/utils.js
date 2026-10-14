/**
 * ====================================================================
 * SiLaDuMas - Sistem Layanan Pengaduan Masyarakat
 * Script: utils.js (Security, DOM Sanitizers, Theme & UI Helpers)
 * ====================================================================
 */

/**
 * Anti-XSS Sanitizer: Mengubah karakter berbahaya menjadi HTML entities
 * Mencegah eksekusi script jahat dari data yang diinput oleh pelapor/user
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format nomor telepon ke format tautan WhatsApp internasional (62xxxx)
 */
function formatWhatsAppLink(phone) {
  if (!phone) return '#';
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.substring(1);
  }
  return `https://wa.me/${clean}`;
}

/**
 * Helper kelas badge status berdasarkan nilai status tiket
 */
function getStatusBadgeClass(status) {
  switch (String(status).toLowerCase()) {
    case 'baru':
      return 'badge-status-baru';
    case 'diproses':
      return 'badge-status-diproses';
    case 'selesai':
      return 'badge-status-selesai';
    case 'ditolak':
      return 'badge-status-ditolak';
    default:
      return 'badge bg-secondary';
  }
}

/**
 * Tampilkan / Sembunyikan Loading Overlay
 */
function showLoading() {
  $('#loadingOverlay').css('display', 'flex').hide().fadeIn(150);
}

function hideLoading() {
  $('#loadingOverlay').fadeOut(150);
}

/**
 * SweetAlert Wrappers untuk notifikasi konsisten
 */
function showMsg(icon, title, text) {
  return Swal.fire({
    icon: icon,
    title: title,
    text: text,
    confirmButtonColor: '#4e54c8',
    borderRadius: '16px'
  });
}

function showToast(icon, title) {
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon: icon,
    title: title,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true
  });
}

/**
 * Terapkan Tema Warna Gradien 3 Warna ke CSS Variables
 */
function applyTheme(gradStr, primarySolid, saveToStorage = true, c1 = null, c2 = null, c3 = null) {
  if (!gradStr || !primarySolid) return;

  document.documentElement.style.setProperty('--primary-grad', gradStr);
  document.documentElement.style.setProperty('--primary-solid', primarySolid);
  document.documentElement.style.setProperty('--primary-hover', primarySolid);
  document.documentElement.style.setProperty('--primary-light', primarySolid + '18');

  // Perbarui preview box bila elemen ada
  const livePreview = document.getElementById('liveThemePreview');
  if (livePreview) {
    livePreview.style.background = gradStr;
  }

  // Sinkronkan input picker warna jika elemen ada
  if (c1 && $('#themeColor1').length) $('#themeColor1').val(c1);
  if (c2 && $('#themeColor2').length) $('#themeColor2').val(c2);
  if (c3 && $('#themeColor3').length) $('#themeColor3').val(c3);

  const themePayload = JSON.stringify({
    grad: gradStr,
    solid: primarySolid,
    c1: c1 || $('#themeColor1').val() || primarySolid,
    c2: c2 || $('#themeColor2').val() || primarySolid,
    c3: c3 || $('#themeColor3').val() || primarySolid
  });

  // Update input tersembunyi
  $('#input_theme').val(themePayload);

  if (saveToStorage) {
    localStorage.setItem('APP_THEME', themePayload);
  }
}

function applySavedTheme() {
  const saved = localStorage.getItem('APP_THEME');
  if (saved) {
    try {
      const obj = JSON.parse(saved);
      if (obj.grad && obj.solid) {
        applyTheme(obj.grad, obj.solid, false, obj.c1, obj.c2, obj.c3);
      }
    } catch (e) {}
  }
}

// Langsung terapkan tema yang tersimpan di browser
applySavedTheme();

/**
 * Scroll to top helper
 */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('.flex-grow-1, .admin-body').animate({ scrollTop: 0 }, 'slow');
}

/**
 * Format tanggal ke bahasa Indonesia formal (Contoh: 11 Oktober 2026)
 */
function formatTanggalIndonesia(d) {
  const date = d ? new Date(d) : new Date();
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}
