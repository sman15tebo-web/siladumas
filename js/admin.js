/**
 * ====================================================================
 * SiLaDuMas - Sistem Layanan Pengaduan Masyarakat
 * Script: admin.js (Admin Dashboard, Reports, Charts, Users, Settings)
 * ====================================================================
 */

/**
 * Navigasi level tertinggi (Public, Login, Dashboard)
 */
function navigasiKe(halaman) {
  // Bersihkan backdrop atau overlay yang mungkin tertinggal
  $('.modal-backdrop').remove();
  $('body').removeClass('modal-open swal2-shown swal2-height-auto').css({ 'padding-right': '', 'overflow': 'auto' });
  $('#sidebar-overlay').removeClass('show');

  $('.app-wrapper').removeClass('active').hide();

  if (halaman === 'login') {
    $('#wrapper-login').addClass('active').show();
  } else if (halaman === 'dashboard') {
    if (!Auth.isLoggedIn()) {
      showMsg('error', 'Akses Ditolak', 'Sesi Anda telah berakhir, silakan login kembali.');
      navigasiKe('login');
      return;
    }

    // Role-based Menu Guarding
    const isSuper = Auth.isSuperadmin();
    if (!isSuper) {
      $('#wrap-menu-setting, #wrap-menu-users, #nav-mob-setting, #nav-mob-users').hide();
    } else {
      $('#wrap-menu-setting, #wrap-menu-users, #nav-mob-setting, #nav-mob-users').show();
    }

    $('#wrapper-dashboard').addClass('active').show();
    switchAdminTab('dashboard');
    loadData(1);
  } else {
    $('#wrapper-public').addClass('active').show();
    showView('view-home');
  }

  window.scrollTo(0, 0);
}

/**
 * Toggle Sidebar Mobile
 */
function toggleSidebar() {
  $('#adminSidebar').toggleClass('show');
  $('#sidebar-overlay').toggleClass('show');
}

/**
 * Switch Sub-Tab di Panel Admin
 */
function switchAdminTab(tab) {
  $('#adm-view-dashboard, #adm-view-data, #adm-view-slides, #adm-view-setting, #adm-view-users').hide();
  $('#menu-dashboard, #menu-data, #menu-slides, #menu-setting, #menu-users').removeClass('active');
  $('#admin-bottom-nav .nav-item-mobile').removeClass('active');

  if (tab === 'dashboard') {
    $('#adm-view-dashboard').show();
    $('#menu-dashboard, #nav-mob-dashboard').addClass('active');
    loadDashboardStats();
  } else if (tab === 'data') {
    $('#adm-view-data').show();
    $('#menu-data, #nav-mob-data').addClass('active');
    loadData(1);
  } else if (tab === 'slides') {
    $('#adm-view-slides').show();
    $('#menu-slides, #nav-mob-slides').addClass('active');
    loadSlidesData();
  } else if (tab === 'setting') {
    $('#adm-view-setting').show();
    $('#menu-setting, #nav-mob-setting').addClass('active');
  } else if (tab === 'users') {
    $('#adm-view-users').show();
    $('#menu-users, #nav-mob-users').addClass('active');
    loadUsersData();
  }
}

/**
 * Muat Statistik Dashboard & Render Chart.js
 */
async function loadDashboardStats() {
  try {
    const res = await fetchAPI('getDashboardStats', { token: Auth.getToken() });
    if (!res.success) throw new Error(res.error || 'Gagal memuat statistik.');

    const d = res.data;

    // Update Counter Cards
    $('#stat-total').text(d.total || 0);
    $('#stat-baru').text(d.status['Baru'] || 0);
    $('#stat-proses').text(d.status['Diproses'] || 0);
    $('#stat-selesai').text(d.status['Selesai'] || 0);

    // Update Badge Angka Merah Menu Laporan Masuk
    updateNewReportsBadge(d.status['Baru'] || 0);

    // Render Doughnut Chart Status
    const ctxStatus = document.getElementById('chartStatus');
    if (ctxStatus) {
      if (APP_STATE.chartStatus) APP_STATE.chartStatus.destroy();
      APP_STATE.chartStatus = new Chart(ctxStatus.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Baru', 'Diproses', 'Selesai', 'Ditolak'],
          datasets: [{
            data: [
              d.status['Baru'] || 0,
              d.status['Diproses'] || 0,
              d.status['Selesai'] || 0,
              d.status['Ditolak'] || 0
            ],
            backgroundColor: ['#0284c7', '#f59e0b', '#10b981', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // Render Bar Chart Kategori
    const ctxKat = document.getElementById('chartKategori');
    if (ctxKat) {
      if (APP_STATE.chartKategori) APP_STATE.chartKategori.destroy();
      APP_STATE.chartKategori = new Chart(ctxKat.getContext('2d'), {
        type: 'bar',
        data: {
          labels: Object.keys(d.kategori || {}),
          datasets: [{
            label: 'Jumlah Laporan',
            data: Object.values(d.kategori || {}),
            backgroundColor: 'rgba(78, 84, 200, 0.75)',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }

  } catch (err) {
    console.error("Error loadDashboardStats:", err);
  }
}

/**
 * Update Badge Angka Merah Laporan Masuk (Status 'Baru')
 */
function updateNewReportsBadge(count) {
  const c = parseInt(count) || 0;
  if (c > 0) {
    $('#badge-laporan-baru, #badge-mob-laporan-baru').text(c).css('display', 'inline-flex').show();
  } else {
    $('#badge-laporan-baru, #badge-mob-laporan-baru').hide().text('0');
  }
}

/**
 * Muat Data Laporan dengan Pagination, Filter Tanggal, dan Pencarian
 */
async function loadData(page) {
  APP_STATE.currentPage = page || 1;
  const start = $('#filterStart').val();
  const end = $('#filterEnd').val();
  const search = $('#searchInput').val();

  $('#tableData tbody').html('<tr><td colspan="6" class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div> Memuat data laporan...</td></tr>');
  $('#paginationArea').empty();

  try {
    const res = await fetchAPI('getAdminData', {
      token: Auth.getToken(),
      page: APP_STATE.currentPage,
      limit: 10,
      start: start,
      end: end,
      search: search
    });

    renderTable(res.data);
    renderPagination(res.page, res.totalPages, res.total);
  } catch (err) {
    $('#tableData tbody').html(`<tr><td colspan="6" class="text-center text-danger py-4">${escapeHtml(err.message)}</td></tr>`);
  }
}

/**
 * Render Tabel Data Laporan (Anti-XSS Secured)
 */
function renderTable(data) {
  const tbody = $('#tableData tbody');
  tbody.empty();

  if (!data || data.length === 0) {
    return tbody.html('<tr><td colspan="6" class="text-center py-5 text-muted">Belum ada data laporan yang cocok.</td></tr>');
  }

  data.forEach(item => {
    const cleanItem = { ...item };
    delete cleanItem.dateObj;
    const jsonStr = encodeURIComponent(JSON.stringify(cleanItem));

    const statusBadgeClass = getStatusBadgeClass(item.status || 'Baru');

    tbody.append(`
      <tr>
        <td class="ps-4 fw-bold text-primary">${escapeHtml(item.id || "-")}</td>
        <td>${escapeHtml(item.tanggal || "-")}</td>
        <td>${escapeHtml(item.nama || "-")}</td>
        <td><span class="badge bg-light text-dark border">${escapeHtml(item.kategori || "-")}</span></td>
        <td><span class="badge ${statusBadgeClass}">${escapeHtml(item.status || "Baru")}</span></td>
        <td class="text-end pe-4">
          <button class="btn btn-sm btn-outline-primary rounded-circle" title="Lihat Detail" onclick="openDetail('${jsonStr}')">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger rounded-circle ms-1" title="Hapus Laporan" onclick="hapusLaporan('${escapeHtml(item.id)}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `);
  });
}

/**
 * Render Pagination Nav
 */
function renderPagination(current, totalPages, totalItems) {
  const nav = $('#paginationArea');
  nav.empty();
  $('#pageInfo').text(`Halaman ${current} dari ${totalPages || 1} (Total: ${totalItems} data)`);

  if (!totalPages || totalPages <= 1) return;

  // Tombol Previous
  nav.append(`
    <li class="page-item ${current === 1 ? 'disabled' : ''}">
      <button class="page-link" onclick="loadData(${current - 1})"><i class="fas fa-chevron-left"></i></button>
    </li>
  `);

  let startPage = Math.max(1, current - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

  for (let i = startPage; i <= endPage; i++) {
    nav.append(`
      <li class="page-item ${i === current ? 'active' : ''}">
        <button class="page-link" onclick="loadData(${i})">${i}</button>
      </li>
    `);
  }

  // Tombol Next
  nav.append(`
    <li class="page-item ${current === totalPages ? 'disabled' : ''}">
      <button class="page-link" onclick="loadData(${current + 1})"><i class="fas fa-chevron-right"></i></button>
    </li>
  `);
}

/**
 * Buka Modal Detail Laporan
 */
function openDetail(jsonStr) {
  const item = JSON.parse(decodeURIComponent(jsonStr));

  $('#dId').text(item.id);
  $('#dTanggal').text(item.tanggal);
  $('#dNama').text(item.nama);
  $('#dKontak').text(item.kontak);

  // Link WhatsApp Pelapor
  const waUrl = formatWhatsAppLink(item.kontak);
  $('#btnWa').html(`
    <a href="${waUrl}" target="_blank" class="text-success ms-2 fw-semibold text-decoration-none">
      <i class="fab fa-whatsapp"></i> Chat WA
    </a>
  `);

  $('#dUraian').text(item.uraian);
  $('#editCatatan').val(item.catatan || '');
  $('#editStatus').val(item.status || 'Baru');
  $('#editRow').val(item.rowIndex);

  // Render Bukti Lampiran
  const buktiDiv = $('#dBukti');
  buktiDiv.empty();
  if (item.bukti && item.bukti.length > 5) {
    const links = item.bukti.split(', ');
    links.forEach((link, idx) => {
      const cleanLink = escapeHtml(link.trim());
      buktiDiv.append(`
        <a href="${cleanLink}" target="_blank" class="btn btn-sm btn-outline-secondary m-1 rounded-pill">
          <i class="fas fa-paperclip me-1"></i> Lampiran ${idx + 1}
        </a>
      `);
    });
  } else {
    buktiDiv.html('<small class="text-muted">Tidak ada file bukti lampiran.</small>');
  }

  new bootstrap.Modal(document.getElementById('modalDetail')).show();
}

/**
 * Simpan Update Status & Catatan
 */
async function saveUpdate() {
  showLoading();
  try {
    const rowIndex = $('#editRow').val();
    const newStatus = $('#editStatus').val();
    const catatan = $('#editCatatan').val();

    await fetchAPI('updateStatus', {
      token: Auth.getToken(),
      rowIndex: parseInt(rowIndex),
      newStatus: newStatus,
      catatan: catatan
    });

    // Sembunyikan modal
    const modalEl = document.getElementById('modalDetail');
    const modalInst = bootstrap.Modal.getInstance(modalEl);
    if (modalInst) modalInst.hide();

    Swal.fire('Terupdate', 'Status laporan dan catatan tindak lanjut berhasil diperbarui.', 'success');
    loadData(APP_STATE.currentPage);
    loadDashboardStats(); // Refresh badge angka merah dan counter dashboard otomatis!
  } catch (err) {
    showMsg('error', 'Gagal Update', err.message);
  } finally {
    hideLoading();
  }
}

/**
 * Hapus Laporan
 */
function hapusLaporan(ticketId) {
  Swal.fire({
    title: 'Hapus Laporan?',
    text: `Laporan dengan ID ${ticketId} akan dihapus secara permanen.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Ya, Hapus'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading();
      try {
        const res = await fetchAPI('deleteReport', {
          token: Auth.getToken(),
          ticketId: ticketId
        });
        if (!res.success) throw new Error(res.error || 'Gagal menghapus laporan.');

        Swal.fire('Terhapus', 'Data laporan berhasil dihapus.', 'success');
        loadData(APP_STATE.currentPage);
        loadDashboardStats(); // Refresh badge angka merah dan counter dashboard otomatis!
      } catch (err) {
        showMsg('error', 'Gagal', err.message);
      } finally {
        hideLoading();
      }
    }
  });
}

/* ====================================================================
 * DOCUMENT PREVIEW ENGINE (PDF & EXCEL SPREADSHEET PREVIEW INTERAKTIF)
 * ==================================================================== */

let docPreviewState = {
  type: 'pdf', // 'pdf' | 'excel'
  zoom: 1.0,
  downloadUrl: null,
  downloadFilename: 'dokumen.pdf'
};

/**
 * Kontrol Zoom Modal Pratinjau Dokumen
 */
function zoomDocPreview(delta) {
  docPreviewState.zoom = Math.round((docPreviewState.zoom + delta) * 10) / 10;
  if (docPreviewState.zoom < 0.5) docPreviewState.zoom = 0.5;
  if (docPreviewState.zoom > 2.0) docPreviewState.zoom = 2.0;
  $('#previewZoomLabel').text(Math.round(docPreviewState.zoom * 100) + '%');
  $('#previewDocPaper').css('transform', `scale(${docPreviewState.zoom})`);
}

function resetZoomDocPreview() {
  docPreviewState.zoom = 1.0;
  $('#previewZoomLabel').text('100%');
  $('#previewDocPaper').css('transform', 'scale(1)');
}

/**
 * Cetak Dokumen Langsung dari Iframe Pratinjau
 */
function printDocPreview() {
  const iframe = document.getElementById('previewDocIframe');
  if (iframe && iframe.contentWindow) {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.warn("Direct iframe print error:", e);
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(iframe.srcdoc || iframe.contentDocument.documentElement.outerHTML);
        printWin.document.close();
        printWin.focus();
        printWin.print();
      }
    }
  } else {
    showToast('error', 'Iframe dokumen belum siap dicetak.');
  }
}

/**
 * Eksekusi Unduhan File Dokumen Aktual
 */
function executeDocDownload() {
  if (docPreviewState.downloadUrl) {
    const a = document.createElement('a');
    a.href = docPreviewState.downloadUrl;
    a.download = docPreviewState.downloadFilename || 'dokumen';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('success', `File ${docPreviewState.downloadFilename} berhasil diunduh.`);
  } else if (docPreviewState.type === 'pdf') {
    printDocPreview();
    showToast('info', 'Pilih opsi "Simpan sebagai PDF" pada jendela dialog cetak.');
  } else {
    showToast('warning', 'Tautan unduhan dokumen belum siap.');
  }
}

/**
 * Generate & Buka Pratinjau Bukti Laporan PDF Sebelum Terunduh
 */
async function downloadPDF() {
  const rowData = {
    id: $('#dId').text().trim(),
    tanggal: $('#dTanggal').text().trim(),
    nama: $('#dNama').text().trim(),
    kontak: $('#dKontak').text().trim(),
    status: $('#editStatus').val() || 'Baru',
    uraian: $('#dUraian').text().trim(),
    catatan: $('#editCatatan').val().trim() || '(Belum ada catatan tindak lanjut dari admin)',
    judul: "Laporan Pengaduan Masyarakat",
    kategori: "Umum"
  };

  const cfg = APP_STATE.config || {};
  const namaSekolah = cfg.namasekolah || 'SMAN 15 TEBO';
  const provinsi = cfg.provinsi || 'PROVINSI JAMBI';
  const alamat = cfg.jalan || 'Jl. Raya Lintas Tebo';
  const telp = cfg.telp || '-';
  const email = cfg.email || '-';
  const logoSekolah = cfg.logo || '';
  const logoInstansi = cfg.logoinstansi || '';

  showLoading();

  try {
    // Siapkan template dokumen bukti pengaduan resmi format kop surat
    const pdfDocHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bukti Pengaduan - ${escapeHtml(rowData.id)}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      color: #111;
      line-height: 1.45;
      margin: 0;
      padding: 30px 40px;
      background: #ffffff;
      font-size: 11.5pt;
    }
    .kop-surat {
      width: 100%;
      border-bottom: 3px double #000;
      padding-bottom: 12px;
      margin-bottom: 22px;
    }
    .kop-table { width: 100%; border-collapse: collapse; }
    .kop-logo { width: 75px; height: 75px; object-fit: contain; }
    .instansi-title {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .sekolah-title {
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      margin: 4px 0;
      letter-spacing: 1px;
    }
    .alamat-text {
      font-size: 9.5pt;
      text-align: center;
      margin: 0;
      font-style: italic;
    }
    .doc-title-box {
      text-align: center;
      margin: 18px 0 22px 0;
    }
    .doc-title {
      font-size: 13.5pt;
      font-weight: bold;
      text-decoration: underline;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .doc-nomor {
      font-size: 10.5pt;
      margin-top: 4px;
      font-weight: bold;
      color: #333;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .data-table td {
      padding: 5px 6px;
      vertical-align: top;
      font-size: 11pt;
    }
    .col-label { width: 170px; font-weight: bold; }
    .col-sep { width: 15px; text-align: center; }
    .status-stamp {
      display: inline-block;
      padding: 2px 12px;
      font-weight: bold;
      border: 1.5px solid #000;
      text-transform: uppercase;
      font-size: 9pt;
      letter-spacing: 1px;
    }
    .section-label {
      font-weight: bold;
      margin-top: 14px;
      margin-bottom: 6px;
      font-size: 11pt;
    }
    .content-box {
      border: 1px solid #333;
      padding: 12px 14px;
      min-height: 80px;
      background: #fafafa;
      text-align: justify;
      font-size: 10.5pt;
      white-space: pre-wrap;
    }
    .content-box-admin {
      border: 1px dashed #444;
      padding: 10px 14px;
      min-height: 55px;
      background: #fdfdfd;
      text-align: justify;
      font-size: 10.5pt;
      margin-top: 4px;
    }
    .footer-sign-table {
      width: 100%;
      margin-top: 35px;
      border-collapse: collapse;
    }
    .seal-box {
      border: 2px solid #000;
      padding: 6px 12px;
      font-size: 8.5pt;
      text-align: center;
      display: inline-block;
      font-family: Arial, sans-serif;
      text-transform: uppercase;
      font-weight: bold;
    }
    @media print {
      body { padding: 0 !important; background: transparent !important; }
      .content-box, .content-box-admin { background: transparent !important; }
    }
  </style>
</head>
<body>
  <div class="kop-surat">
    <table class="kop-table">
      <tr>
        <td width="15%" align="left" style="vertical-align: middle;">
          ${logoInstansi ? `<img src="${logoInstansi}" class="kop-logo" alt="Logo Instansi">` : ''}
        </td>
        <td align="center" style="vertical-align: middle;">
          <div class="instansi-title">PEMERINTAH ${escapeHtml(provinsi)}</div>
          <div class="instansi-title">DINAS PENDIDIKAN DAN KEBUDAYAAN</div>
          <div class="sekolah-title">${escapeHtml(namaSekolah)}</div>
          <div class="alamat-text">${escapeHtml(alamat)}</div>
          <div class="alamat-text">Telepon: ${escapeHtml(telp)} | Pos-el: ${escapeHtml(email)}</div>
        </td>
        <td width="15%" align="right" style="vertical-align: middle;">
          ${logoSekolah ? `<img src="${logoSekolah}" class="kop-logo" alt="Logo Sekolah">` : ''}
        </td>
      </tr>
    </table>
  </div>

  <div class="doc-title-box">
    <div class="doc-title">TANDA BUKTI REGISTRASI PENGADUAN MASYARAKAT</div>
    <div class="doc-nomor">Nomor Registrasi: ${escapeHtml(rowData.id)}</div>
  </div>

  <table class="data-table">
    <tr><td class="col-label">ID Tiket Pengaduan</td><td class="col-sep">:</td><td><b>${escapeHtml(rowData.id)}</b></td></tr>
    <tr><td class="col-label">Waktu Registrasi</td><td class="col-sep">:</td><td>${escapeHtml(rowData.tanggal)} WIB</td></tr>
    <tr><td class="col-label">Nama Pelapor</td><td class="col-sep">:</td><td>${escapeHtml(rowData.nama)}</td></tr>
    <tr><td class="col-label">Kontak / Identitas</td><td class="col-sep">:</td><td>${escapeHtml(rowData.kontak)}</td></tr>
    <tr><td class="col-label">Klasifikasi Aduan</td><td class="col-sep">:</td><td>${escapeHtml(rowData.kategori || "Umum")}</td></tr>
    <tr><td class="col-label">Status Terkini</td><td class="col-sep">:</td><td><span class="status-stamp">${escapeHtml(rowData.status)}</span></td></tr>
  </table>

  <div class="section-label">Uraian Pokok Pengaduan:</div>
  <div class="content-box">${escapeHtml(rowData.uraian)}</div>

  <div class="section-label">Catatan & Perkembangan Tindak Lanjut:</div>
  <div class="content-box-admin">${escapeHtml(rowData.catatan)}</div>

  <table class="footer-sign-table">
    <tr>
      <td width="55%" style="vertical-align: bottom;">
        <div class="seal-box">
          TERVERIFIKASI SISTEM ELEKTRONIK<br>
          SiLaDuMas - Layanan Pengaduan Resmi
        </div>
      </td>
      <td width="45%" align="right" style="vertical-align: top; font-size: 10pt;">
        <div>Diterbitkan di Tebo, ${formatTanggalIndonesia(new Date())}</div>
        <div style="margin-top: 4px; font-weight: bold;">Administrator Layanan Pengaduan,</div>
        <div style="height: 55px;"></div>
        <div style="font-weight: bold; text-decoration: underline;">${escapeHtml(namaSekolah)}</div>
        <div style="font-size: 8.5pt; font-style: italic; color: #555;">Dokumen sah dicetak dari sistem informasi resmi.</div>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Siapkan tautan unduh file aktual
    let downloadUrl = null;
    try {
      const res = await fetchAPI('generatePDF', {
        token: Auth.getToken(),
        rowDataStr: JSON.stringify(rowData),
        configStr: JSON.stringify(APP_STATE.config)
      });
      if (res && res.base64) {
        downloadUrl = "data:application/pdf;base64," + res.base64;
      }
    } catch (e) {
      console.warn("Backend generatePDF fallback:", e);
    }

    if (!downloadUrl) {
      const blob = new Blob([pdfDocHtml], { type: 'text/html;charset=utf-8' });
      downloadUrl = URL.createObjectURL(blob);
    }

    // Set state pratinjau dokumen
    docPreviewState.type = 'pdf';
    docPreviewState.zoom = 1.0;
    docPreviewState.downloadUrl = downloadUrl;
    docPreviewState.downloadFilename = `Bukti_Pengaduan_${rowData.id}.pdf`;

    // Terapkan ke elemen Toolbar Modal
    $('#previewDocTitle').text(`Pratinjau Bukti Laporan - #${rowData.id}`);
    $('#previewDocSubtitle').text(`Dokumen Resmi Format PDF`);
    $('#previewDocBadge').removeClass('bg-success').addClass('bg-danger').text('PDF');
    $('#previewDocIcon').attr('class', 'fas fa-file-pdf fs-6');
    $('#previewDocIconBox').removeClass('bg-success-subtle text-success').addClass('bg-danger-subtle text-danger');
    $('#btnPreviewDownloadText').text('Unduh Dokumen PDF');
    resetZoomDocPreview();

    // Masukkan HTML ke iframe
    const iframe = document.getElementById('previewDocIframe');
    iframe.srcdoc = pdfDocHtml;

    // Buka modal pratinjau
    const previewModal = new bootstrap.Modal(document.getElementById('modalDocPreview'));
    previewModal.show();

  } catch (err) {
    showMsg('error', 'Gagal Memuat Pratinjau', err.message);
  } finally {
    hideLoading();
  }
}

/**
 * Generate & Buka Pratinjau Rekapitulasi Excel Sebelum Terunduh
 */
async function exportData() {
  const start = $('#filterStart').val();
  const end = $('#filterEnd').val();

  showLoading();

  try {
    // Ambil data laporan untuk disajikan di spreadsheet
    const resAdmin = await fetchAPI('getAdminData', {
      token: Auth.getToken(),
      page: 1,
      limit: 500,
      start: start,
      end: end,
      search: ''
    });

    const listData = (resAdmin && resAdmin.data) ? resAdmin.data : [];

    // Ambil URL export file jika backend menyediakannya
    let downloadUrl = null;
    try {
      const resExcel = await fetchAPI('exportExcel', {
        token: Auth.getToken(),
        start: start,
        end: end
      });
      if (resExcel && resExcel.url) {
        downloadUrl = resExcel.url;
      }
    } catch (e) {
      console.warn("Backend exportExcel fallback:", e);
    }

    // Fallback CSV URI jika URL belum tersedia
    if (!downloadUrl) {
      let csvContent = "data:text/csv;charset=utf-8,\uFEFFNo,ID Tiket,Tanggal Lapor,Nama Pelapor,Kontak / Identitas,Kategori,Status,Uraian,Catatan Tindak Lanjut\n";
      listData.forEach((row, idx) => {
        csvContent += `"${idx + 1}","${(row.id||'').replace(/"/g, '""')}","${(row.tanggal||'').replace(/"/g, '""')}","${(row.nama||'').replace(/"/g, '""')}","${(row.kontak||'').replace(/"/g, '""')}","${(row.kategori||'').replace(/"/g, '""')}","${(row.status||'').replace(/"/g, '""')}","${(row.uraian||'').replace(/"/g, '""')}","${(row.catatan||'').replace(/"/g, '""')}"\n`;
      });
      downloadUrl = encodeURI(csvContent);
    }

    const cfg = APP_STATE.config || {};
    const namaSekolah = cfg.namasekolah || 'SMAN 15 TEBO';
    const periodeStr = (start && end) ? `${start} s/d ${end}` : 'Semua Periode Data';

    // Hitung ringkasan status
    let countBaru = 0, countProses = 0, countSelesai = 0, countTolak = 0;
    listData.forEach(item => {
      const st = (item.status || '').toLowerCase();
      if (st === 'baru') countBaru++;
      else if (st === 'diproses') countProses++;
      else if (st === 'selesai') countSelesai++;
      else if (st === 'ditolak') countTolak++;
    });

    // Buat template lembar kerja spreadsheet Excel
    let rowsHtml = '';
    if (listData.length === 0) {
      rowsHtml = `<tr><td colspan="9" style="text-align:center; padding: 25px; color:#888;">Tidak ada data laporan dalam rentang periode ini.</td></tr>`;
    } else {
      listData.forEach((item, idx) => {
        const bgZebra = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
        rowsHtml += `
          <tr style="background-color: ${bgZebra};">
            <td style="text-align: center; color: #666; font-size: 11px; background: #f3f4f6; border-right: 1.5px solid #d1d5db; font-weight: bold;">${idx + 1}</td>
            <td style="text-align: center; font-weight: bold; color: #1e40af;">${escapeHtml(item.id || '-')}</td>
            <td style="text-align: center;">${escapeHtml(item.tanggal || '-')}</td>
            <td><b>${escapeHtml(item.nama || '-')}</b></td>
            <td>${escapeHtml(item.kontak || '-')}</td>
            <td style="text-align: center;">${escapeHtml(item.kategori || 'Umum')}</td>
            <td style="text-align: center;"><span style="display:inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 10.5px; border: 1px solid #999;">${escapeHtml(item.status || 'Baru')}</span></td>
            <td style="max-width: 280px; word-break: break-word;">${escapeHtml(item.uraian || '-')}</td>
            <td style="max-width: 220px; word-break: break-word;">${escapeHtml(item.catatan || '-')}</td>
          </tr>
        `;
      });
    }

    const excelSheetHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rekapitulasi Laporan Excel - ${escapeHtml(namaSekolah)}</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #1e293b;
      font-size: 12px;
    }
    .excel-app-bar {
      background: #107c41;
      color: white;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .excel-brand {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.3px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .excel-tag {
      background: rgba(255,255,255,0.2);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
    }
    .excel-sheet-container {
      padding: 16px;
      overflow-x: auto;
    }
    .sheet-card {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .sheet-header-title {
      font-size: 15px;
      font-weight: bold;
      color: #0f172a;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .sheet-meta-row {
      color: #64748b;
      font-size: 11.5px;
      margin-bottom: 14px;
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
    }
    .stat-pill {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .excel-grid {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #94a3b8;
      font-size: 11.5px;
    }
    .excel-grid th {
      background: #e2e8f0;
      color: #334155;
      font-weight: 700;
      padding: 8px 6px;
      border: 1px solid #cbd5e1;
      text-align: center;
      font-size: 11.5px;
      user-select: none;
    }
    .excel-grid td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 11.5px;
    }
    .col-header-char {
      font-size: 10px;
      color: #94a3b8;
      display: block;
      font-weight: normal;
    }
    .excel-bottom-bar {
      margin-top: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #e2e8f0;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      color: #475569;
    }
    .sheet-tab {
      background: white;
      color: #107c41;
      font-weight: bold;
      padding: 4px 12px;
      border-radius: 3px;
      border-bottom: 2px solid #107c41;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    @media print {
      body { background: white !important; }
      .excel-app-bar, .excel-bottom-bar { display: none !important; }
      .sheet-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="excel-app-bar">
    <div class="excel-brand">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21.17 3.25Q21.5 3.25 21.75 3.5 22 3.75 22 4.08V19.92Q22 20.25 21.75 20.5 21.5 20.75 21.17 20.75H8.83Q8.5 20.75 8.25 20.5 8 20.25 8 19.92V17H2.83Q2.5 17 2.25 16.75 2 16.5 2 16.17V7.83Q2 7.5 2.25 7.25 2.5 7 2.83 7H8V4.08Q8 3.75 8.25 3.5 8.5 3.25 8.83 3.25ZM9.5 5.5V18.5H20.5V5.5ZM3.5 8.5V15.5H8V8.5ZM13.8 15.5H12.35L14.3 12L12.4 8.5H13.85L15 10.75L16.15 8.5H17.6L15.7 12L17.65 15.5H16.2L15 13.25Z"/></svg>
      Microsoft Excel Workbook (.xlsx)
    </div>
    <div class="excel-tag">Pratinjau Lembar Rekapitulasi Data SiLaDuMas</div>
  </div>

  <div class="excel-sheet-container">
    <div class="sheet-card">
      <div class="sheet-header-title">REKAPITULASI LAPORAN PENGADUAN MASYARAKAT</div>
      <div class="sheet-meta-row">
        <span><b>Instansi / Sekolah:</b> ${escapeHtml(namaSekolah)}</span>
        <span><b>Rentang Periode:</b> ${escapeHtml(periodeStr)}</span>
        <span><b>Total Data:</b> ${listData.length} Laporan</span>
      </div>

      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
        <span class="stat-pill" style="color: #0284c7;">Baru: <b>${countBaru}</b></span>
        <span class="stat-pill" style="color: #d97706;">Diproses: <b>${countProses}</b></span>
        <span class="stat-pill" style="color: #16a34a;">Selesai: <b>${countSelesai}</b></span>
        <span class="stat-pill" style="color: #dc2626;">Ditolak: <b>${countTolak}</b></span>
      </div>

      <table class="excel-grid">
        <thead>
          <tr>
            <th width="40"><span class="col-header-char">A</span>No</th>
            <th width="105"><span class="col-header-char">B</span>ID Tiket</th>
            <th width="115"><span class="col-header-char">C</span>Tanggal Lapor</th>
            <th width="150"><span class="col-header-char">D</span>Nama Pelapor</th>
            <th width="125"><span class="col-header-char">E</span>Identitas / Kontak</th>
            <th width="100"><span class="col-header-char">F</span>Kategori</th>
            <th width="85"><span class="col-header-char">G</span>Status</th>
            <th><span class="col-header-char">H</span>Uraian Pokok Pengaduan</th>
            <th><span class="col-header-char">I</span>Catatan Tindak Lanjut Admin</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="excel-bottom-bar">
        <span class="sheet-tab">&#9638; Sheet1 - Rekap Pengaduan</span>
        <span style="margin-left: auto; font-style: italic;">Total baris: ${listData.length} data laporan</span>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Set state pratinjau dokumen
    docPreviewState.type = 'excel';
    docPreviewState.zoom = 1.0;
    docPreviewState.downloadUrl = downloadUrl;
    docPreviewState.downloadFilename = `Rekap_Laporan_${namaSekolah.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;

    // Terapkan ke elemen Toolbar Modal
    $('#previewDocTitle').text(`Pratinjau Lembar Rekapitulasi Excel`);
    $('#previewDocSubtitle').text(`Format Spreadsheet Excel (.xlsx)`);
    $('#previewDocBadge').removeClass('bg-danger').addClass('bg-success').text('EXCEL (.XLSX)');
    $('#previewDocIcon').attr('class', 'fas fa-file-excel fs-6');
    $('#previewDocIconBox').removeClass('bg-danger-subtle text-danger').addClass('bg-success-subtle text-success');
    $('#btnPreviewDownloadText').text('Unduh File Excel');
    resetZoomDocPreview();

    // Masukkan HTML ke iframe
    const iframe = document.getElementById('previewDocIframe');
    iframe.srcdoc = excelSheetHtml;

    // Buka modal pratinjau
    const previewModal = new bootstrap.Modal(document.getElementById('modalDocPreview'));
    previewModal.show();

  } catch (err) {
    showMsg('error', 'Gagal Memuat Pratinjau Excel', err.message);
  } finally {
    hideLoading();
  }
}

/**
 * CRUD User Management
 */
async function loadUsersData() {
  $('#tableUsers tbody').html('<tr><td colspan="3" class="text-center py-4 text-muted">Memuat data pengguna...</td></tr>');
  try {
    const res = await fetchAPI('getAllUsers', { token: Auth.getToken() });
    if (!res.success) throw new Error(res.error || 'Gagal mengambil user.');

    let html = '';
    res.data.forEach(u => {
      const isSuper = u.akses === 'Semua' || u.akses === 'Superadmin';
      const badgeCls = isSuper ? 'bg-danger' : 'bg-primary';
      const cleanUser = escapeHtml(u.username);
      const cleanAkses = escapeHtml(u.akses);

      html += `
        <tr>
          <td class="ps-4 fw-bold">${cleanUser}</td>
          <td><span class="badge ${badgeCls}">${cleanAkses}</span></td>
          <td class="text-end pe-4">
            <button class="btn btn-sm btn-outline-secondary rounded-circle" title="Edit Akun" onclick="openModalUser(true, '${u.rowIndex}', '${cleanUser}', '${cleanAkses}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger rounded-circle ms-1" title="Hapus Akun" onclick="hapusUserData(${u.rowIndex}, '${cleanUser}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    $('#tableUsers tbody').html(html);
  } catch (err) {
    $('#tableUsers tbody').html(`<tr><td colspan="3" class="text-center text-danger">${escapeHtml(err.message)}</td></tr>`);
  }
}

function openModalUser(isEdit = false, rowIndex = '', username = '', akses = 'Semua') {
  $('#formUser')[0].reset();
  $('#u_isEdit').val(isEdit);
  $('#u_rowIndex').val(rowIndex);

  if (isEdit) {
    $('#modalUserTitle').text('Edit Akun Pengguna');
    $('#u_username').val(username);
    $('#u_role').val(akses);
    $('#u_password').removeAttr('required');
    $('#u_pass_hint').text('(Kosongkan jika tidak ingin mengubah password)');
  } else {
    $('#modalUserTitle').text('Tambah Akun Pengguna');
    $('#u_password').attr('required', 'true');
    $('#u_pass_hint').text('');
  }

  new bootstrap.Modal(document.getElementById('modalUser')).show();
}

async function saveUserSubmit(e) {
  e.preventDefault();
  showLoading();
  try {
    const res = await fetchAPI('saveUserAccount', {
      token: Auth.getToken(),
      username: $('#u_username').val().trim(),
      password: $('#u_password').val(),
      role: $('#u_role').val(),
      isEdit: $('#u_isEdit').val() === 'true',
      rowIndex: parseInt($('#u_rowIndex').val()) || 0
    });

    if (!res.success) throw new Error(res.error || 'Gagal menyimpan user.');

    const modalEl = document.getElementById('modalUser');
    bootstrap.Modal.getInstance(modalEl)?.hide();
    Swal.fire('Sukses', res.message || 'Akun berhasil disimpan.', 'success');
    loadUsersData();
  } catch (err) {
    showMsg('error', 'Gagal', err.message);
  } finally {
    hideLoading();
  }
}

function hapusUserData(rowIndex, username) {
  if (username.toLowerCase() === 'admin') {
    return Swal.fire('Ditolak', 'Akun admin utama tidak dapat dihapus.', 'error');
  }

  Swal.fire({
    title: `Hapus Akun ${username}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    confirmButtonColor: '#dc3545'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading();
      try {
        const res = await fetchAPI('deleteUserAccount', {
          token: Auth.getToken(),
          rowIndex: rowIndex
        });
        if (!res.success) throw new Error(res.error || 'Gagal menghapus user.');

        showToast('success', 'Akun berhasil dihapus.');
        loadUsersData();
      } catch (err) {
        showMsg('error', 'Gagal', err.message);
      } finally {
        hideLoading();
      }
    }
  });
}

/**
 * Cropper & Setting Image Upload
 */
/**
 * Cropper Manual (Rasio 1:1 untuk Logo & Rasio 7:3 untuk Foto Slide)
 */
function startCrop(type) {
  APP_STATE.currentCropType = type;
  $('#cropInput').val('').click();
}

$(document).on('change', '#cropInput', function(e) {
  if (e.target.files && e.target.files[0]) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      $('#imageToCrop').attr('src', evt.target.result);

      const isSlide = APP_STATE.currentCropType === 'slide';
      const isFotoSekolah = APP_STATE.currentCropType === 'fotosekolah';

      if (isSlide) {
        $('#cropModalDialog').addClass('modal-lg');
        $('#cropModalTitle').text('Sesuaikan Foto Banner Slide (7:3)');
        $('#cropModalSubtitle').text('Cropper Manual Rasio 7:3 (Hasil Otomatis 1050x450px Base64)');
        $('#cropApplyBtn').html('<i class="fas fa-check me-1"></i> Terapkan Slide (7:3)');
      } else if (isFotoSekolah) {
        $('#cropModalDialog').addClass('modal-lg');
        $('#cropModalTitle').text('Sesuaikan Foto Gedung Sekolah (4:3)');
        $('#cropModalSubtitle').text('Cropper Manual Rasio 4:3 (Hasil Otomatis 800x600px Base64)');
        $('#cropApplyBtn').html('<i class="fas fa-check me-1"></i> Terapkan Foto Sekolah (4:3)');
      } else {
        $('#cropModalDialog').removeClass('modal-lg');
        $('#cropModalTitle').text('Sesuaikan Ukuran Logo (1:1)');
        $('#cropModalSubtitle').text('Cropper Manual Rasio 1:1 (Hasil Otomatis 250x250px Base64)');
        $('#cropApplyBtn').html('<i class="fas fa-check me-1"></i> Terapkan (250x250px Base64)');
      }

      $('#modalCrop').modal('show');

      if (APP_STATE.cropperInstance) APP_STATE.cropperInstance.destroy();
      setTimeout(() => {
        let cropRatio = 1;
        if (isSlide) cropRatio = 7 / 3;
        else if (isFotoSekolah) cropRatio = 4 / 3;

        APP_STATE.cropperInstance = new Cropper(document.getElementById('imageToCrop'), {
          aspectRatio: cropRatio,
          viewMode: 1,
          autoCropArea: 0.95,
          dragMode: 'move',
          responsive: true,
          restore: false
        });
      }, 350);
    };
    reader.readAsDataURL(e.target.files[0]);
  }
});

$(document).on('hidden.bs.modal', '#modalCrop', function() {
  if (APP_STATE.cropperInstance) {
    APP_STATE.cropperInstance.destroy();
    APP_STATE.cropperInstance = null;
  }
});

function cropperZoom(ratio) {
  if (APP_STATE.cropperInstance) {
    APP_STATE.cropperInstance.zoom(ratio);
  }
}

function cropperRotate(deg) {
  if (APP_STATE.cropperInstance) {
    APP_STATE.cropperInstance.rotate(deg);
  }
}

function cropperReset() {
  if (APP_STATE.cropperInstance) {
    APP_STATE.cropperInstance.reset();
  }
}

/**
 * Potong dan Simpan Langsung Sebagai Base64 (250x250px Logo, 1050x450px Slide, atau 800x600px Foto Sekolah)
 */
function cropAndApplyBase64() {
  if (!APP_STATE.cropperInstance) return;

  const isSlide = APP_STATE.currentCropType === 'slide';
  const isFotoSekolah = APP_STATE.currentCropType === 'fotosekolah';

  let outWidth = 250;
  let outHeight = 250;
  let outFormat = 'image/png';
  let outQuality = 1.0;

  if (isSlide) {
    outWidth = 1050;
    outHeight = 450;
    outFormat = 'image/jpeg';
    outQuality = 0.88;
  } else if (isFotoSekolah) {
    outWidth = 800;
    outHeight = 600;
    outFormat = 'image/jpeg';
    outQuality = 0.88;
  }

  const canvas = APP_STATE.cropperInstance.getCroppedCanvas({
    width: outWidth,
    height: outHeight,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  });

  if (!canvas) {
    return showMsg('error', 'Gagal', 'Tidak dapat memproses area potongan gambar.');
  }

  const base64Data = canvas.toDataURL(outFormat, outQuality);
  $('#modalCrop').modal('hide');

  if (isSlide) {
    $('#preview_slide_img').attr('src', base64Data).show();
    $('#preview_slide_placeholder').hide();
    $('#slide_imageData').val(base64Data);
    showToast('success', 'Foto slide berhasil dipotong (7:3 Base64)!');
  } else if (isFotoSekolah) {
    $('#preview_fotosekolah').attr('src', base64Data).show();
    $('#preview_fotosekolah_placeholder').hide();
    $('#input_fotosekolah').val(base64Data);
    $('#heroSide60').css('background-image', `url(${base64Data})`);
    showToast('success', 'Foto Gedung Sekolah berhasil dipotong (4:3 Base64)!');
  } else if (APP_STATE.currentCropType === 'logo') {
    $('#preview_logo, #ui-logo-nav, #ui-logo-hero, #ui-logo-admin-nav').attr('src', base64Data).show();
    $('#input_logo').val(base64Data);
    showToast('success', 'Logo Sekolah berhasil dipotong (250x250px Base64)!');
  } else {
    $('#preview_instansi, #ui-logoinstansi-hero').attr('src', base64Data).show();
    $('#input_instansi').val(base64Data);
    showToast('success', 'Logo Instansi berhasil dipotong (250x250px Base64)!');
  }
}

/**
 * ====================================================================
 * MANAJEMEN FOTO SLIDE BERANDA (CRUD & TABLE)
 * ====================================================================
 */
async function loadSlidesData() {
  $('#tableSlides tbody').html('<tr><td colspan="5" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div> Memuat data slide...</td></tr>');
  try {
    const res = await fetchAPI('getAllSlides', { token: Auth.getToken() });
    renderSlidesTable(res.data || []);
  } catch (err) {
    $('#tableSlides tbody').html(`<tr><td colspan="5" class="text-center text-danger py-4">${escapeHtml(err.message)}</td></tr>`);
  }
}

function renderSlidesTable(data) {
  const tbody = $('#tableSlides tbody');
  tbody.empty();

  if (!data || data.length === 0) {
    return tbody.html('<tr><td colspan="5" class="text-center py-5 text-muted">Belum ada foto slide banner. Silakan klik Tambah Foto Slide.</td></tr>');
  }

  data.forEach((item, index) => {
    const cleanItem = { ...item };
    const jsonStr = encodeURIComponent(JSON.stringify(cleanItem));
    const isActive = item.active !== false;

    tbody.append(`
      <tr>
        <td class="ps-4 fw-bold text-muted">${index + 1}</td>
        <td>
          <img src="${item.image}" alt="Slide" style="width: 120px; aspect-ratio: 7/3; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
        </td>
        <td>
          <div class="fw-bold text-dark">${escapeHtml(item.title || "Tanpa Judul")}</div>
          <small class="text-muted d-block text-truncate" style="max-width: 320px;">${escapeHtml(item.desc || "-")}</small>
        </td>
        <td>
          <span class="badge ${isActive ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary'} rounded-pill px-3 py-1 cursor-pointer" onclick="toggleSlide('${escapeHtml(item.id)}')" title="Klik untuk ubah status">
            <i class="fas ${isActive ? 'fa-check-circle' : 'fa-eye-slash'} me-1"></i> ${isActive ? 'Tampil (Aktif)' : 'Disembunyikan'}
          </span>
        </td>
        <td class="text-end pe-4">
          <button class="btn btn-sm btn-outline-primary rounded-circle" title="Edit Slide" onclick="editSlide('${jsonStr}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger rounded-circle ms-1" title="Hapus Slide" onclick="deleteSlide('${escapeHtml(item.id)}', '${escapeHtml(item.title || '')}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `);
  });
}

function openModalSlide() {
  $('#formSlide')[0].reset();
  $('#slide_isEdit').val('false');
  $('#slide_id').val('');
  $('#slide_imageData').val('');
  $('#preview_slide_img').attr('src', '').hide();
  $('#preview_slide_placeholder').show();
  $('#slide_active').prop('checked', true);
  $('#modalSlideTitle').text('Tambah Foto Slide Banner');
  $('#modalSlide').modal('show');
}

function editSlide(jsonStr) {
  try {
    const item = JSON.parse(decodeURIComponent(jsonStr));
    $('#slide_isEdit').val('true');
    $('#slide_id').val(item.id);
    $('#slide_title').val(item.title || '');
    $('#slide_desc').val(item.desc || '');
    $('#slide_imageData').val(item.image || '');
    $('#slide_active').prop('checked', item.active !== false);

    if (item.image) {
      $('#preview_slide_img').attr('src', item.image).show();
      $('#preview_slide_placeholder').hide();
    } else {
      $('#preview_slide_img').hide();
      $('#preview_slide_placeholder').show();
    }

    $('#modalSlideTitle').text('Edit Foto Slide Banner');
    $('#modalSlide').modal('show');
  } catch (e) {
    showMsg('error', 'Gagal', 'Tidak dapat memuat data slide.');
  }
}

async function saveSlideSubmit(e) {
  e.preventDefault();
  const imgData = $('#slide_imageData').val();
  if (!imgData) {
    return showMsg('warning', 'Pilih Foto', 'Silakan pilih dan potong foto banner slide terlebih dahulu.');
  }

  const slideData = {
    id: $('#slide_id').val() || null,
    title: $('#slide_title').val().trim(),
    desc: $('#slide_desc').val().trim(),
    image: imgData,
    active: $('#slide_active').is(':checked')
  };

  showLoading();
  try {
    const res = await fetchAPI('saveSlideItem', {
      slideData: slideData,
      token: Auth.getToken()
    });

    if (!res.success) throw new Error(res.error || 'Gagal menyimpan slide.');

    $('#modalSlide').modal('hide');
    showToast('success', 'Foto slide berhasil disimpan!');
    loadSlidesData();
    if (typeof loadHomeSlides === 'function') loadHomeSlides();
  } catch (err) {
    showMsg('error', 'Gagal', err.message);
  } finally {
    hideLoading();
  }
}

function deleteSlide(slideId, title) {
  Swal.fire({
    title: 'Hapus Slide?',
    text: `Apakah Anda yakin ingin menghapus slide '${title || slideId}'?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    confirmButtonColor: '#dc3545',
    cancelButtonText: 'Batal'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoading();
      try {
        const res = await fetchAPI('deleteSlideItem', {
          slideId: slideId,
          token: Auth.getToken()
        });
        if (!res.success) throw new Error(res.error || 'Gagal menghapus slide.');

        showToast('success', 'Slide berhasil dihapus.');
        loadSlidesData();
        if (typeof loadHomeSlides === 'function') loadHomeSlides();
      } catch (err) {
        showMsg('error', 'Gagal', err.message);
      } finally {
        hideLoading();
      }
    }
  });
}

async function toggleSlide(slideId) {
  try {
    const res = await fetchAPI('toggleSlideItem', {
      slideId: slideId,
      token: Auth.getToken()
    });
    if (res.success) {
      showToast('info', res.active ? 'Slide diaktifkan.' : 'Slide dinonaktifkan.');
      loadSlidesData();
      if (typeof loadHomeSlides === 'function') loadHomeSlides();
    }
  } catch (err) {
    showMsg('error', 'Gagal', err.message);
  }
}

/**
 * ====================================================================
 * MANAJEMEN TEMA GRADIEN 3 WARNA
 * ====================================================================
 */
function applyThemePreset(presetId, c1, c2, c3) {
  $('.theme-card-preset').removeClass('active');
  $(`#preset-${presetId}`).addClass('active');

  $('#themeColor1').val(c1);
  $('#themeColor2').val(c2);
  $('#themeColor3').val(c3);

  const grad = `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
  applyTheme(grad, c1, true, c1, c2, c3);
  showToast('info', 'Tema gradien diterapkan!');
}

function updateCustomGradient() {
  $('.theme-card-preset').removeClass('active');
  const c1 = $('#themeColor1').val();
  const c2 = $('#themeColor2').val();
  const c3 = $('#themeColor3').val();

  const grad = `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
  applyTheme(grad, c1, true, c1, c2, c3);
}

function resetThemeDefault() {
  applyThemePreset('indigo', '#4e54c8', '#6c5ce7', '#8f94fb');
}

/**
 * ====================================================================
 * BACKUP & RESTORE DATABASE JSON
 * ====================================================================
 */
async function exportBackupJSON() {
  showLoading();
  try {
    let reports = [];
    let users = [];

    // Ambil data laporan
    const resData = await fetchAPI('getAdminData', {
      token: Auth.getToken(),
      page: 1,
      limit: 99999
    });
    reports = resData.data || [];

    // Ambil data users (jika superadmin)
    try {
      const resUsers = await fetchAPI('getAllUsers', { token: Auth.getToken() });
      if (resUsers && resUsers.data) users = resUsers.data;
    } catch (e) {}

    const backupPackage = {
      app: "SiLaDuMas",
      version: "2.0-modular",
      exportedAt: new Date().toISOString(),
      config: APP_STATE.config || {},
      reports: reports,
      users: users
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPackage, null, 2));
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const filename = `Backup_SiLaDuMas_${dateStr}.json`;

    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", filename);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    Swal.fire({
      icon: 'success',
      title: 'Backup Berhasil!',
      text: `File cadangan database '${filename}' berhasil diunduh.`,
      confirmButtonColor: '#4e54c8'
    });
  } catch (err) {
    showMsg('error', 'Gagal Backup', err.message);
  } finally {
    hideLoading();
  }
}

async function triggerDriveBackup() {
  showLoading();
  try {
    if (CONFIG.DEV_MODE) {
      await new Promise(r => setTimeout(r, 600));
      Swal.fire('Mode Ujicoba', 'Backup Google Drive berhasil disimulasikan.', 'info');
      return;
    }

    const res = await fetchAPI('createDailyBackup', { token: Auth.getToken() });
    Swal.fire('Sukses', 'Trigger cadangan Google Drive berhasil dijalankan.', 'success');
  } catch (err) {
    showMsg('error', 'Gagal Backup Drive', err.message);
  } finally {
    hideLoading();
  }
}

function importRestoreJSON() {
  const fileInput = document.getElementById('restoreFileInput');
  if (!fileInput.files || !fileInput.files[0]) {
    return showMsg('warning', 'Pilih File', 'Silakan pilih file cadangan (.json) terlebih dahulu.');
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const backupData = JSON.parse(e.target.result);

      if (!backupData || !backupData.reports) {
        throw new Error("Struktur file backup tidak valid.");
      }

      const totalReports = backupData.reports.length;
      const totalUsers = backupData.users ? backupData.users.length : 0;

      Swal.fire({
        title: 'Konfirmasi Restore',
        html: `Apakah Anda yakin ingin memulihkan database?<br><br>
               <b>${totalReports}</b> data laporan dan <b>${totalUsers}</b> akun pengguna akan dipulihkan.<br>
               <span class="text-danger small fw-bold">Data saat ini akan ditimpa!</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Ya, Pulihkan Sekarang',
        cancelButtonText: 'Batal'
      }).then(async (result) => {
        if (result.isConfirmed) {
          showLoading();

          // Jika mode simulasi / lokal
          if (CONFIG.DEV_MODE && typeof MockAPI !== 'undefined') {
            MockAPI.saveReports(backupData.reports);
            if (backupData.users) MockAPI.saveUsers(backupData.users);
            if (backupData.config) MockAPI.saveConfig(backupData.config);

            hideLoading();
            Swal.fire({
              icon: 'success',
              title: 'Data Berhasil Dipulihkan!',
              text: 'Seluruh database simulasi telah diperbarui dari file cadangan.',
              confirmButtonColor: '#4e54c8'
            }).then(() => {
              loadAppConfig();
              loadData(1);
            });
          } else {
            // Live Server: kirim data restore ke backend
            try {
              await fetchAPI('restoreDatabase', {
                token: Auth.getToken(),
                backupData: backupData
              });
              Swal.fire('Sukses', 'Database berhasil dipulihkan di server.', 'success').then(() => {
                location.reload();
              });
            } catch (err) {
              showMsg('error', 'Gagal Restore', err.message);
            } finally {
              hideLoading();
            }
          }
        }
      });

    } catch (err) {
      showMsg('error', 'File Tidak Valid', 'Gagal membaca file JSON: ' + err.message);
    }
  };

  reader.readAsText(file);
}

/**
 * Simpan Form Pengaturan Aplikasi (Sistem, Logo, & Tema)
 */
async function saveSettings(e) {
  e.preventDefault();
  const form = document.getElementById('formSetting');

  const data = {
    cfg_logo: form.cfg_logo.value,
    cfg_instansi: form.cfg_instansi.value,
    cfg_fotosekolah: form.cfg_fotosekolah ? form.cfg_fotosekolah.value : '',
    cfg_theme: form.cfg_theme.value || localStorage.getItem('APP_THEME') || '',
    cfg_sekolah: form.cfg_sekolah.value,
    cfg_provinsi: form.cfg_provinsi.value,
    cfg_slogan: form.cfg_slogan.value,
    cfg_jalan: form.cfg_jalan.value,
    cfg_telp: form.cfg_telp.value,
    cfg_email: form.cfg_email.value,
    cfg_tahun: form.cfg_tahun.value,
    cfg_website: form.cfg_website.value,
    cfg_dinas: form.cfg_dinas.value,
    cfg_spmb: form.cfg_spmb.value,
    cfg_running: form.cfg_running.value
  };

  showLoading();
  try {
    const res = await fetchAPI('saveAppConfig', {
      form: data,
      token: Auth.getToken()
    });

    if (!res.success) throw new Error(res.error || 'Gagal menyimpan pengaturan.');

    Swal.fire({
      icon: 'success',
      title: 'Tersimpan!',
      text: 'Seluruh pengaturan identitas, logo Base64, dan tema berhasil disimpan.',
      confirmButtonColor: '#4e54c8'
    }).then(() => {
      loadAppConfig();
    });
  } catch (err) {
    showMsg('error', 'Gagal Simpan', err.message);
  } finally {
    hideLoading();
  }
}

/**
 * Window & Utility Listeners
 */
function refreshData() {
  $('.fa-sync-alt').addClass('fa-spin');
  loadData(APP_STATE.currentPage);
  setTimeout(() => $('.fa-sync-alt').removeClass('fa-spin'), 900);
}

window.onscroll = function() {
  const btn = document.getElementById("btn-back-to-top");
  if (!btn) return;
  btn.style.display = (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) ? "block" : "none";
};

$(window).on('resize', function() {
  if ($(window).width() > 768) {
    $('#adminSidebar, #sidebar-overlay').removeClass('show');
  }
});
