/**
 * ====================================================================
 * SiLaDuMas - Sistem Layanan Pengaduan Masyarakat
 * Script: public.js (Public Views, Complaint Form, & Ticket Tracking)
 * ====================================================================
 */

/**
 * Muat konfigurasi instansi & sekolah dari backend
 */
async function loadAppConfig() {
  showLoading();
  try {
    const config = await fetchAPI('getAppConfig');
    APP_STATE.config = config;

    // Terapkan data nama sekolah
    const schoolName = config.namasekolah || CONFIG.DEFAULT_SCHOOL_NAME;
    $('#ui-namasekolah-nav, #ui-namasekolah-hero, #ui-namasekolah-footer, #ui-namasekolah-copyright, #ui-namasekolah-admin, #ui-namasekolah-privacy, #receiptSekolah, #receiptSekolahFooter').text(schoolName);

    // Terapkan provinsi di hero
    const provText = config.provinsi ? (config.provinsi.toUpperCase().startsWith('PROVINSI') ? config.provinsi.toUpperCase() : 'PROVINSI ' + config.provinsi.toUpperCase()) : 'PROVINSI JAMBI';
    $('#ui-provinsi-hero').text(provText);

    // Terapkan teks pendukung
    $('#ui-slogan').text(config.slogan || "Sampaikan aspirasi dan laporan Anda demi kemajuan bersama.");
    $('#ui-jalan').text(config.jalan || "-");
    $('#ui-telp').text(config.telp || "-");
    $('#ui-telp-link').attr('href', 'tel:' + (config.telp || ''));
    $('#ui-email').text(config.email || "-");
    $('#ui-email-link').attr('href', 'mailto:' + (config.email || ''));
    $('#ui-website').text(config.website || "-");
    $('#ui-website-link').attr('href', config.website ? (config.website.startsWith('http') ? config.website : 'https://' + config.website) : '#');
    $('#ui-webdinas').attr('href', config.webdinas ? (config.webdinas.startsWith('http') ? config.webdinas : 'https://' + config.webdinas) : '#');
    $('#ui-webspmb').attr('href', config.webspmb ? (config.webspmb.startsWith('http') ? config.webspmb : 'https://' + config.webspmb) : '#');
    
    const year = config.tahun || new Date().getFullYear();
    $('#ui-tahun, #ui-tahun-admin, #ui-tahun-privacy').text(year);

    // Terapkan logo
    if (config.logo) {
      $('#ui-logo-nav, #ui-logo-hero, #ui-logo-admin-nav, #preview_logo').attr('src', config.logo).show();
      $('#input_logo').val(config.logo);
    }
    if (config.logoinstansi) {
      $('#ui-logoinstansi-hero, #preview_instansi').attr('src', config.logoinstansi).show();
      $('#input_instansi').val(config.logoinstansi);
    }

    // Terapkan Foto Gedung Sekolah (Rasio 4:3) di Hero 60%
    const defaultSchoolPhoto = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="bldgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <linearGradient id="roofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#skyGrad)"/>
  <ellipse cx="400" cy="570" rx="460" ry="80" fill="#064e3b" opacity="0.6"/>
  <ellipse cx="120" cy="460" rx="100" ry="120" fill="#065f46" opacity="0.4"/>
  <ellipse cx="680" cy="460" rx="110" ry="130" fill="#065f46" opacity="0.4"/>
  <rect x="180" y="240" width="440" height="260" rx="12" fill="url(#bldgGrad)" opacity="0.85"/>
  <polygon points="160,245 400,165 640,245" fill="url(#roofGrad)" opacity="0.9"/>
  <g fill="#93c5fd" opacity="0.75">
    <rect x="220" y="270" width="55" height="45" rx="4"/>
    <rect x="295" y="270" width="55" height="45" rx="4"/>
    <rect x="450" y="270" width="55" height="45" rx="4"/>
    <rect x="525" y="270" width="55" height="45" rx="4"/>
    <rect x="220" y="340" width="55" height="45" rx="4"/>
    <rect x="295" y="340" width="55" height="45" rx="4"/>
    <rect x="450" y="340" width="55" height="45" rx="4"/>
    <rect x="525" y="340" width="55" height="45" rx="4"/>
  </g>
  <rect x="365" y="245" width="70" height="15" rx="3" fill="#ffffff" opacity="0.9"/>
  <rect x="375" y="260" width="10" height="150" fill="#ffffff" opacity="0.85"/>
  <rect x="415" y="260" width="10" height="150" fill="#ffffff" opacity="0.85"/>
  <rect x="368" y="410" width="64" height="90" rx="4" fill="#1e293b"/>
  <line x1="400" y1="165" x2="400" y2="100" stroke="#ffffff" stroke-width="3"/>
  <polygon points="400,105 440,118 400,130" fill="#ef4444"/>
  <polygon points="400,118 440,118 400,130" fill="#ffffff"/>
  <circle cx="400" cy="180" r="280" fill="#ffffff" opacity="0.03"/>
</svg>`);

    const activeSchoolPhoto = config.fotosekolah || defaultSchoolPhoto;
    $('#heroSide60').css('background-image', `url("${activeSchoolPhoto}")`);

    if (config.fotosekolah) {
      $('#preview_fotosekolah').attr('src', config.fotosekolah).show();
      $('#preview_fotosekolah_placeholder').hide();
      $('#input_fotosekolah').val(config.fotosekolah);
    } else {
      $('#preview_fotosekolah').hide();
      $('#preview_fotosekolah_placeholder').show();
      $('#input_fotosekolah').val('');
    }

    // Terapkan tema gradien jika tersimpan di backend
    if (config.theme) {
      try {
        const themeObj = typeof config.theme === 'string' ? JSON.parse(config.theme) : config.theme;
        if (themeObj.grad && themeObj.solid) {
          applyTheme(themeObj.grad, themeObj.solid, true, themeObj.c1, themeObj.c2, themeObj.c3);
        }
      } catch (e) {}
    }

    // Isi form pengaturan admin
    $('#cfg_sekolah').val(config.namasekolah || '');
    $('#cfg_provinsi').val(config.provinsi || '');
    $('#cfg_slogan').val(config.slogan || '');
    $('#cfg_jalan').val(config.jalan || '');
    $('#cfg_telp').val(config.telp || '');
    $('#cfg_email').val(config.email || '');
    $('#cfg_tahun').val(config.tahun || '');
    $('#cfg_website').val(config.website || '');
    $('#cfg_dinas').val(config.webdinas || '');
    $('#cfg_spmb').val(config.webspmb || '');
    $('#cfg_running').val(config.runningtext || '');

    // Muat foto slide banner beranda
    loadHomeSlides();

  } catch (err) {
    console.error("Gagal inisialisasi aplikasi:", err);
    Swal.fire({
      icon: 'error',
      title: 'Koneksi Gagal',
      text: 'Gagal memuat konfigurasi aplikasi. Silakan periksa jaringan Anda.',
      confirmButtonColor: '#4e54c8'
    });
  } finally {
    hideLoading();
    if (Auth.isLoggedIn()) {
      navigasiKe('dashboard');
    }
  }
}

/**
 * Muat Foto Slide Banner Beranda (Rasio 7:3)
 */
async function loadHomeSlides() {
  const section = $('#section-home-carousel');
  const container = $('#wrap-home-carousel');
  const inner = $('#carouselInner');
  const indicators = $('#carouselIndicators');

  try {
    const res = await fetchAPI('getHomeSlides');
    const slides = res.data || [];

    if (!slides || slides.length === 0) {
      if (section.length) section.hide();
      container.hide();
      return;
    }

    if (section.length) section.show();
    container.show();
    inner.empty();
    indicators.empty();

    slides.forEach((slide, idx) => {
      indicators.append(`
        <button type="button" data-bs-target="#homeSlideCarousel" data-bs-slide-to="${idx}" class="${idx === 0 ? 'active' : ''}" aria-current="${idx === 0 ? 'true' : 'false'}" aria-label="Slide ${idx + 1}"></button>
      `);

      const hasCaption = slide.title || slide.desc;
      inner.append(`
        <div class="carousel-item ${idx === 0 ? 'active' : ''}">
          <div class="home-carousel-item">
            <img src="${slide.image}" class="home-carousel-img" alt="${escapeHtml(slide.title || 'Slide')}">
            ${hasCaption ? `
              <div class="home-carousel-caption">
                ${slide.title ? `<h5>${escapeHtml(slide.title)}</h5>` : ''}
                ${slide.desc ? `<p>${escapeHtml(slide.desc)}</p>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `);
    });

  } catch (err) {
    console.warn("Gagal memuat slide beranda:", err);
  }
}

/**
 * Pengganti Tampilan (SPA Tabs) di Halaman Publik
 */
function showView(viewId) {
  $('#view-home, #view-form, #view-status').hide();
  $('#' + viewId).fadeIn(250);
  window.scrollTo(0, 0);

  $('.nav-item-mobile').removeClass('active');
  if (viewId === 'view-home') $('#btn-nav-home').addClass('active');
  if (viewId === 'view-form') {
    $('#btn-nav-form').addClass('active');
    handleStatusPelaporChange(); // Inisialisasi label identitas cerdas
  }
  if (viewId === 'view-status') $('#btn-nav-status').addClass('active');
}

/**
 * Fitur 2: Label & Placeholder Cerdas untuk Kolom Nomor Identitas
 */
function handleStatusPelaporChange() {
  const status = $('#statusPelapor').val();
  const label = $('#labelIdentitas');
  const input = $('#inputIdentitas');
  const hint = $('#hintIdentitas');

  if (status === 'Siswa') {
    label.text('Nomor Identitas (NIS / NISN)');
    input.attr('placeholder', 'Masukkan NIS atau NISN (Boleh kosongkan)');
    hint.text('Bagi siswa, silakan masukkan NIS / NISN Anda (opsional).');
  } else if (status === 'Orang Tua' || status === 'Masyarakat') {
    label.text('Nomor Identitas (NIK / No. KTP)');
    input.attr('placeholder', 'Masukkan NIK atau No. KTP (Boleh kosongkan)');
    hint.text('Bagi orang tua / masyarakat, silakan masukkan NIK / No. KTP Anda (opsional).');
  } else if (status === 'Guru/Staff') {
    label.text('Nomor Identitas (NIP / NUPTK)');
    input.attr('placeholder', 'Masukkan NIP atau NUPTK (Boleh kosongkan)');
    hint.text('Bagi guru / pegawai, silakan masukkan NIP / NUPTK Anda (opsional).');
  }
}

/**
 * Fitur 3: Kompresi Gambar Otomatis Client-Side (Maksimal 500 KB)
 */
function compressImageToMax500KB(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1600; // Resolusi HD optimal

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Kompresi kualitas bertahap hingga di bawah 500 KB
        let quality = 0.85;
        let base64 = canvas.toDataURL('image/jpeg', quality);
        let byteSize = Math.round((base64.length - 'data:image/jpeg;base64,'.length) * 3 / 4);

        while (byteSize > 480 * 1024 && quality > 0.25) {
          quality -= 0.1;
          base64 = canvas.toDataURL('image/jpeg', quality);
          byteSize = Math.round((base64.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
        }

        resolve({
          name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
          mimeType: 'image/jpeg',
          data: base64.split(',')[1],
          originalSize: file.size,
          compressedSize: byteSize,
          isImage: true
        });
      };
      img.onerror = () => reject(new Error('Gagal memuat file gambar untuk dikompresi.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Fitur 3: Upload Lampiran dengan Validasi PDF Max 500KB & Auto-Resize Gambar Max 500KB
 */
function triggerFileSelect() {
  $('#hiddenFileInput').click();
}

async function handleFileSelect(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];

    // Cek jumlah maksimal file (3 file)
    if (APP_STATE.uploadedFiles.length >= CONFIG.MAX_FILE_COUNT) {
      input.value = '';
      return showMsg('warning', 'Batas Tercapai', `Maksimal hanya dapat melampirkan ${CONFIG.MAX_FILE_COUNT} berkas bukti.`);
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name);

    if (!isPdf && !isImage) {
      input.value = '';
      return showMsg('warning', 'Format Tidak Didukung', 'Hanya file gambar (JPG, PNG, dll) atau dokumen PDF yang diperbolehkan.');
    }

    // 1. Jika File PDF: Maksimal 500 KB
    if (isPdf) {
      const maxPdfBytes = 500 * 1024;
      if (file.size > maxPdfBytes) {
        input.value = '';
        return showMsg('warning', 'Ukuran PDF Terlalu Besar', `Maksimal ukuran file PDF adalah 500 KB.\nFile yang Anda pilih berukuran ${(file.size / 1024).toFixed(0)} KB.`);
      }

      showLoading();
      const reader = new FileReader();
      reader.onload = function(e) {
        APP_STATE.uploadedFiles.push({
          name: file.name,
          mimeType: 'application/pdf',
          data: e.target.result.split(',')[1],
          originalSize: file.size,
          compressedSize: file.size,
          isImage: false
        });
        renderFileList();
        input.value = '';
        hideLoading();
        showToast('success', `Dokumen PDF (${(file.size / 1024).toFixed(0)} KB) siap dilampirkan.`);
      };
      reader.onerror = function() {
        hideLoading();
        showMsg('error', 'Gagal', 'Terjadi kesalahan saat membaca file PDF.');
      };
      reader.readAsDataURL(file);
    }

    // 2. Jika File Gambar: Bebas ukuran awal, otomatis di-resize & kompres ke max 500 KB
    else if (isImage) {
      showLoading();
      try {
        const compressedFile = await compressImageToMax500KB(file);
        APP_STATE.uploadedFiles.push(compressedFile);
        renderFileList();
        input.value = '';
        hideLoading();

        const origKb = (compressedFile.originalSize / 1024).toFixed(0);
        const compKb = (compressedFile.compressedSize / 1024).toFixed(0);
        showToast('success', `Foto dioptimasi: ${origKb} KB ➔ ${compKb} KB`);
      } catch (err) {
        hideLoading();
        input.value = '';
        showMsg('error', 'Gagal Memproses Gambar', err.message);
      }
    }
  }
}

function renderFileList() {
  let html = '';
  APP_STATE.uploadedFiles.forEach((file, index) => {
    const cleanName = escapeHtml(file.name);
    const shortName = cleanName.length > 18 ? cleanName.substring(0, 18) + '...' : cleanName;
    const sizeKb = (file.compressedSize / 1024).toFixed(0) + ' KB';
    const icon = file.isImage ? 'fa-image text-success' : 'fa-file-pdf text-danger';
    const typeLabel = file.isImage ? 'Foto' : 'PDF';

    html += `
      <div class="file-item-badge">
        <i class="fas ${icon}"></i>
        <div>
          <span class="fw-semibold">${shortName}</span>
          <span class="badge bg-light text-dark border ms-1">${typeLabel} • ${sizeKb}</span>
        </div>
        <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-2 text-decoration-none" title="Hapus" onclick="removeFile(${index})">
          <i class="fas fa-times-circle"></i>
        </button>
      </div>`;
  });
  $('#fileListContainer').html(html);
}

function removeFile(index) {
  APP_STATE.uploadedFiles.splice(index, 1);
  renderFileList();
}

/**
 * Handle Pengiriman Formulir Pengaduan
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('formPengaduan');

  const payloadData = {
    nama: form.nama.value.trim(),
    identitas: form.identitas.value.trim() || '-', // Opsional: default '-' jika dikosongkan
    kontak: form.kontak.value.trim(),
    statusPelapor: form.statusPelapor.value,
    judul: form.judul.value.trim(),
    kategori: form.kategori.value,
    waktuKejadian: form.waktuKejadian.value,
    lokasi: form.lokasi.value.trim(),
    uraian: form.uraian.value.trim()
  };

  showLoading();

  try {
    const res = await fetchAPI('simpanPengaduan', {
      data: payloadData,
      fileData: APP_STATE.uploadedFiles
    });

    if (!res.success) throw new Error(res.error || 'Gagal mengirim pengaduan.');

    // Sembunyikan loading spinner terlebih dahulu agar modal tidak tertutup overlay
    hideLoading();

    // Reset Form Input
    form.reset();
    APP_STATE.uploadedFiles = [];
    $('#fileListContainer').empty();
    handleStatusPelaporChange(); // Reset placeholder/label cerdas

    // Tampilkan Popup Melayang Bukti Tanda Terima Resmi dengan transisi mulus
    setTimeout(() => {
      showBuktiModal({
        ticket: res.ticket,
        data: payloadData
      });
    }, 200);

  } catch (err) {
    hideLoading();
    showMsg('error', 'Pengiriman Gagal', err.message);
  }
}

/**
 * Fitur 4: Tampilkan Popup Melayang Bukti Tanda Terima Pengaduan Digital
 */
let CURRENT_RECEIPT_INFO = null;
let HAS_SAVED_RECEIPT = false;

function showBuktiModal(receipt) {
  CURRENT_RECEIPT_INFO = receipt;
  HAS_SAVED_RECEIPT = false; // Reset status: Wajib unduh/bagikan dulu

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  $('#receiptTiket').text(receipt.ticket);
  $('#receiptTanggal').text(dateStr);
  $('#receiptNama').text(receipt.data.nama);
  $('#receiptStatusPelapor').text(receipt.data.statusPelapor);
  $('#receiptIdentitas').text(receipt.data.identitas);
  $('#receiptKontak').text(receipt.data.kontak);
  $('#receiptKategori').text(receipt.data.kategori);
  $('#receiptJudul').text(receipt.data.judul);
  $('#receiptLokasi').text(receipt.data.lokasi || '-');
  $('#receiptWaktuKejadian').text(receipt.data.waktuKejadian || '-');
  $('#receiptUraian').text(receipt.data.uraian || '-');

  const schoolName = (APP_STATE.config && APP_STATE.config.namasekolah) ? APP_STATE.config.namasekolah : CONFIG.DEFAULT_SCHOOL_NAME;
  $('#receiptSekolah, #receiptSekolahFooter').text(schoolName);

  // Kunci tombol Selesai di awal
  $('#btnSelesaiBukti')
    .prop('disabled', true)
    .removeClass('btn-outline-dark shadow-sm')
    .addClass('btn-secondary opacity-50')
    .html('<i class="fas fa-lock me-1"></i> Selesai & Tutup');

  $('#headerCloseBtn').hide();
  $('#hintWajibSimpan')
    .removeClass('text-success')
    .addClass('text-danger fw-semibold')
    .html('<i class="fas fa-lock me-1"></i> <b>Wajib Unduh atau Bagikan</b> bukti tanda terima terlebih dahulu agar tombol Selesai dapat diklik.');

  const modalEl = document.getElementById('modalBuktiLapor');
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

/**
 * Buka Kunci Tombol Selesai setelah Unduh atau Bagikan diklik
 */
function aktifkanTombolSelesai() {
  HAS_SAVED_RECEIPT = true;
  $('#btnSelesaiBukti')
    .prop('disabled', false)
    .removeClass('btn-secondary opacity-50')
    .addClass('btn-outline-dark fw-bold shadow-sm')
    .html('<i class="fas fa-check-circle text-success me-1"></i> Selesai & Tutup');

  $('#headerCloseBtn').fadeIn(200);
  $('#hintWajibSimpan')
    .removeClass('text-danger')
    .addClass('text-success fw-semibold')
    .html('<i class="fas fa-check-circle me-1"></i> <b>Bukti telah tersimpan!</b> Anda sekarang dapat mengklik tombol Selesai & Tutup.');
}

/**
 * Salin Nomor Tiket dari Tanda Terima
 */
function copyTicketFromReceipt() {
  const ticket = $('#receiptTiket').text();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(ticket).then(() => {
      showToast('success', `Nomor tiket ${ticket} disalin ke clipboard!`);
    }).catch(() => {});
  }
}

/**
 * Fitur 4: Unduh Bukti Tanda Terima sebagai Gambar (PNG)
 */
async function downloadBuktiImage() {
  const cardElement = document.getElementById('kartuBuktiTiket');
  if (!cardElement) return;

  showLoading();
  try {
    const canvas = await html2canvas(cardElement, {
      scale: 2.5, // Kualitas gambar tinggi (HD)
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const ticketId = $('#receiptTiket').text() || 'TKT';
    const link = document.createElement('a');
    link.download = `Bukti_Pengaduan_${ticketId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // Aktifkan tombol selesai
    aktifkanTombolSelesai();
    showToast('success', 'Bukti tanda terima berhasil diunduh sebagai gambar PNG! Tombol Selesai kini aktif.');
  } catch (err) {
    showMsg('error', 'Gagal Mengunduh Gambar', err.message);
  } finally {
    hideLoading();
  }
}

/**
 * Fitur 4: Bagikan Bukti Tanda Terima (Web Share API / WhatsApp / Salin Teks)
 */
async function shareBuktiTicket() {
  const ticketId = $('#receiptTiket').text();
  const nama = $('#receiptNama').text();
  const judul = $('#receiptJudul').text();
  const tanggal = $('#receiptTanggal').text();
  const kategori = $('#receiptKategori').text();
  const schoolName = (APP_STATE.config && APP_STATE.config.namasekolah) ? APP_STATE.config.namasekolah : CONFIG.DEFAULT_SCHOOL_NAME;

  const cardElement = document.getElementById('kartuBuktiTiket');

  showLoading();
  try {
    const canvas = await html2canvas(cardElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    canvas.toBlob(async (blob) => {
      hideLoading();
      const file = new File([blob], `Bukti_Pengaduan_${ticketId}.png`, { type: 'image/png' });

      // Aktifkan tombol selesai karena pengguna sudah membagikan bukti
      aktifkanTombolSelesai();

      // Jika Web Share API mendukung berbagi file (Smartphone / Browser modern)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Tanda Terima Pengaduan ${ticketId}`,
            text: `Bukti Tanda Terima Pengaduan Resmi ${schoolName}\nNo. Tiket: ${ticketId}\nPelapor: ${nama}\nJudul: ${judul}`,
            files: [file]
          });
          return;
        } catch (shareErr) {
          // User cancel share, lanjut fallback ke WhatsApp
        }
      }

      // Otomatis unduh juga gambarnya di browser agar file gambar tersimpan
      const link = document.createElement('a');
      link.download = `Bukti_Pengaduan_${ticketId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // Buka WhatsApp dengan ringkasan pengaduan resmi
      const waText = `*BUKTI TANDA TERIMA PENGADUAN RESMI*\n${schoolName}\n\n*No. Tiket:* ${ticketId}\n*Tanggal:* ${tanggal}\n*Pelapor:* ${nama}\n*Kategori:* ${kategori}\n*Pokok Masalah:* ${judul}\n\nSimpan nomor tiket ini untuk melacak status laporan di portal resmi: ${window.location.href.split('#')[0]}`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
      window.open(waUrl, '_blank');

      if (navigator.clipboard) {
        navigator.clipboard.writeText(ticketId).catch(() => {});
      }
      showToast('info', 'Bukti gambar diunduh & dialihkan ke WhatsApp! Tombol Selesai kini aktif.');
    }, 'image/png');

  } catch (err) {
    hideLoading();
    showMsg('error', 'Gagal Membagikan', err.message);
  }
}

/**
 * Selesai Melihat Bukti dan Kembali ke Halaman Utama
 */
function selesaiBuktiLapor() {
  if (!HAS_SAVED_RECEIPT) {
    showMsg('warning', 'Simpan Bukti Dahulu', 'Mohon klik tombol Unduh Gambar (PNG) atau Bagikan (WhatsApp) terlebih dahulu agar bukti tanda terima Anda tidak hilang.');
    return;
  }
  const modalEl = document.getElementById('modalBuktiLapor');
  bootstrap.Modal.getInstance(modalEl)?.hide();
  showView('view-home');
  showToast('success', 'Pengaduan berhasil diajukan! Pantau statusnya menggunakan nomor tiket.');
}

/**
 * Handle Cek Status Tiket Pengaduan
 */
async function checkTicket() {
  const ticketId = $('#ticketInput').val().trim();
  if (!ticketId) {
    return showMsg('warning', 'ID Tiket Kosong', 'Harap masukkan ID Tiket pengaduan Anda.');
  }

  showLoading();
  $('#statusResult').slideUp();

  try {
    const res = await fetchAPI('cekStatusTiket', { ticketId: ticketId });

    if (res.found) {
      $('#resTiket').text(res.tiket);
      $('#resJudul').text(res.judul);
      
      const badgeCls = getStatusBadgeClass(res.status);
      $('#resStatus')
        .text(res.status)
        .attr('class', 'badge rounded-pill ' + badgeCls);
        
      $('#resCatatan').text(res.catatan ? res.catatan : 'Belum ada catatan tindak lanjut dari admin.');
      $('#resTanggal').text(res.tanggal);
      $('#statusResult').slideDown();
    } else {
      showMsg('error', 'Tidak Ditemukan', 'ID Tiket tidak ditemukan atau belum terdaftar.');
    }
  } catch (err) {
    showMsg('error', 'Gagal Melacak', err.message);
  } finally {
    hideLoading();
  }
}
