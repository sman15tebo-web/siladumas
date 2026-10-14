/**
 * ====================================================================
 * SiLaDuMas - Sistem Layanan Pengaduan Masyarakat
 * Script: mock.js (Offline Simulation Engine / Local Dev Sandbox)
 * Memungkinkan pengujian 100% lokal tanpa merusak Spreadsheet asli!
 * ====================================================================
 */

const MockAPI = {
  // Inisialisasi Data Simulasi di LocalStorage bila belum ada
  initDatabase() {
    // 1. Data Konfigurasi Sekolah
    if (!localStorage.getItem('MOCK_CONFIG')) {
      const defaultConfig = {
        logo: "./logo.png",
        logoinstansi: "./logo.png",
        namasekolah: "SMAN 15 Tebo (Mode Ujicoba)",
        provinsi: "JAMBI",
        tahun: "2026",
        website: "sman15tebo.sch.id",
        slogan: "Mode Ujicoba Lokal: Simpan data, uji tiket, dan kelola laporan tanpa koneksi ke server asli.",
        runningtext: "Selamat Datang di Portal Ujicoba SiLaDuMas",
        jalan: "Jl. Pendidikan No. 15, Kabupaten Tebo, Jambi",
        telp: "081234567890",
        email: "pengaduan@sman15tebo.sch.id",
        webdinas: "https://disdik.jambiprov.go.id",
        webspmb: "https://ppdb.jambiprov.go.id",
        fotosekolah: ""
      };
      localStorage.setItem('MOCK_CONFIG', JSON.stringify(defaultConfig));
    }

    // 2. Data Pengguna Admin (Default: admin / admin123)
    if (!localStorage.getItem('MOCK_USERS')) {
      const defaultUsers = [
        { rowIndex: 2, username: "admin", passwordHash: "admin123", akses: "Semua" },
        { rowIndex: 3, username: "sarpras", passwordHash: "sarpras123", akses: "Sarana Prasarana" },
        { rowIndex: 4, username: "bk", passwordHash: "bk123", akses: "Bullying/Kedisiplinan" }
      ];
      localStorage.setItem('MOCK_USERS', JSON.stringify(defaultUsers));
    }

    // 3. Data Laporan Pengaduan Awal (Dummy)
    if (!localStorage.getItem('MOCK_REPORTS')) {
      const defaultReports = [
        {
          rowIndex: 2,
          id: "TKT-20261011-001",
          tanggal: "11/10/2026 08:30",
          nama: "Budi Santoso",
          identitas: "12034981",
          kontak: "08123456789",
          statusPelapor: "Siswa",
          judul: "Proyektor di Ruang Kelas XII IPA 2 Mati Total",
          kategori: "Sarana Prasarana",
          lokasi: "Kelas XII IPA 2",
          waktuKejadian: "2026-10-10",
          uraian: "Proyektor tiba-tiba mati saat jam pelajaran kedua dan mengeluarkan bau gosong.",
          bukti: "",
          status: "Diproses",
          catatan: "Sedang dicek oleh teknisi sarpras sekolah."
        },
        {
          rowIndex: 3,
          id: "TKT-20261011-002",
          tanggal: "11/10/2026 09:15",
          nama: "Siti Rahma",
          identitas: "-",
          kontak: "08198765432",
          statusPelapor: "Orang Tua",
          judul: "Permohonan Informasi Jadwal Remedial Semester",
          kategori: "Akademik",
          lokasi: "Ruang Tata Usaha",
          waktuKejadian: "2026-10-11",
          uraian: "Mohon info apakah ada jadwal resmi remedial matematika untuk kelas X.",
          bukti: "",
          status: "Selesai",
          catatan: "Jadwal remedial telah dibagikan melalui wali kelas masing-masing."
        },
        {
          rowIndex: 4,
          id: "TKT-20261011-003",
          tanggal: "11/10/2026 10:00",
          nama: "Ahmad Fauzan",
          identitas: "12034999",
          kontak: "08527891234",
          statusPelapor: "Siswa",
          judul: "Keran Air di Toilet Siswa Pria Bocor",
          kategori: "Sarana Prasarana",
          lokasi: "Toilet Belakang Gedung B",
          waktuKejadian: "2026-10-11",
          uraian: "Air keran mengalir terus-menerus dan menggenangi lantai toilet.",
          bukti: "",
          status: "Baru",
          catatan: ""
        }
      ];
      localStorage.setItem('MOCK_REPORTS', JSON.stringify(defaultReports));
    }

    // 4. Data Foto Slide Banner Beranda (Rasio 7:3)
    if (!localStorage.getItem('MOCK_SLIDES')) {
      const defaultSlide1 = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 300" width="700" height="300">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="50%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#4338ca"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>
  <rect width="700" height="300" fill="url(#g1)"/>
  <circle cx="600" cy="80" r="140" fill="#ffffff" opacity="0.05"/>
  <circle cx="100" cy="240" r="100" fill="#ffffff" opacity="0.04"/>
  <path d="M450 300 L650 100 L700 150 L700 300 Z" fill="#ffffff" opacity="0.04"/>
  <g transform="translate(60, 90)">
    <rect x="0" y="0" width="160" height="26" rx="13" fill="url(#accent)"/>
    <text x="80" y="17" fill="#ffffff" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle" letter-spacing="1">PORTAL RESMI</text>
    <text x="0" y="60" fill="#ffffff" font-size="28" font-weight="800" font-family="sans-serif">Layanan Pengaduan SiLaDuMas</text>
    <text x="0" y="88" fill="#e0e7ff" font-size="14" font-family="sans-serif">Mewujudkan Lingkungan Sekolah yang Berintegritas, Aman, &amp; Transparan</text>
    <rect x="0" y="112" width="280" height="4" rx="2" fill="url(#accent)"/>
  </g>
  <g transform="translate(520, 90)">
    <circle cx="60" cy="60" r="55" fill="#ffffff" opacity="0.1"/>
    <circle cx="60" cy="60" r="45" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6,4"/>
    <text x="60" y="68" fill="#ffffff" font-size="36" text-anchor="middle">🏫</text>
  </g>
</svg>`);

      const defaultSlide2 = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 300" width="700" height="300">
  <defs>
    <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="50%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="700" height="300" fill="url(#g2)"/>
  <circle cx="620" cy="220" r="120" fill="#ffffff" opacity="0.06"/>
  <circle cx="50" cy="60" r="80" fill="#ffffff" opacity="0.04"/>
  <g transform="translate(60, 90)">
    <rect x="0" y="0" width="180" height="26" rx="13" fill="url(#gold)"/>
    <text x="90" y="17" fill="#ffffff" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle" letter-spacing="1">RAMAH &amp; AMAN</text>
    <text x="0" y="60" fill="#ffffff" font-size="28" font-weight="800" font-family="sans-serif">Stop Perundungan &amp; Bullying</text>
    <text x="0" y="88" fill="#d1fae5" font-size="14" font-family="sans-serif">Identitas Anda Dijamin 100% Rahasia dan Terlindungi oleh Sistem</text>
    <rect x="0" y="112" width="280" height="4" rx="2" fill="url(#gold)"/>
  </g>
  <g transform="translate(520, 90)">
    <circle cx="60" cy="60" r="55" fill="#ffffff" opacity="0.1"/>
    <circle cx="60" cy="60" r="45" fill="none" stroke="#fbbf24" stroke-width="3" stroke-dasharray="6,4"/>
    <text x="60" y="68" fill="#ffffff" font-size="36" text-anchor="middle">🛡️</text>
  </g>
</svg>`);

      const defaultSlides = [
        {
          id: "SLD-001",
          title: "Portal Pengaduan Resmi SiLaDuMas",
          desc: "Salurkan aspirasi, saran, dan pengaduan demi kemajuan bersama.",
          image: defaultSlide1,
          active: true,
          order: 1
        },
        {
          id: "SLD-002",
          title: "Sekolah Ramah Anak & Bebas Bullying",
          desc: "Laporkan segala bentuk pelanggaran dengan aman dan terverifikasi.",
          image: defaultSlide2,
          active: true,
          order: 2
        }
      ];
      localStorage.setItem('MOCK_SLIDES', JSON.stringify(defaultSlides));
    }
  },

  getReports() {
    this.initDatabase();
    return JSON.parse(localStorage.getItem('MOCK_REPORTS') || '[]');
  },

  saveReports(reports) {
    localStorage.setItem('MOCK_REPORTS', JSON.stringify(reports));
  },

  getUsers() {
    this.initDatabase();
    return JSON.parse(localStorage.getItem('MOCK_USERS') || '[]');
  },

  saveUsers(users) {
    localStorage.setItem('MOCK_USERS', JSON.stringify(users));
  },

  getConfig() {
    this.initDatabase();
    return JSON.parse(localStorage.getItem('MOCK_CONFIG') || '{}');
  },

  saveConfig(cfg) {
    localStorage.setItem('MOCK_CONFIG', JSON.stringify(cfg));
  },

  getSlides() {
    this.initDatabase();
    return JSON.parse(localStorage.getItem('MOCK_SLIDES') || '[]');
  },

  saveSlides(slides) {
    localStorage.setItem('MOCK_SLIDES', JSON.stringify(slides));
  },

  /**
   * Router Tiruan Google Apps Script
   */
  async handle(action, payload = {}) {
    this.initDatabase();
    // Beri sedikit jeda 300ms agar efek loading terasa nyata
    await new Promise(r => setTimeout(r, 250));

    switch (action) {
      case 'getHomeSlides': {
        const slides = this.getSlides();
        const activeSlides = slides.filter(s => s.active !== false);
        return { success: true, data: activeSlides };
      }

      case 'getAllSlides': {
        const slides = this.getSlides();
        return { success: true, data: slides };
      }

      case 'saveSlideItem': {
        const slides = this.getSlides();
        const slide = payload.slideData || {};
        if (slide.id) {
          const idx = slides.findIndex(s => s.id === slide.id);
          if (idx !== -1) {
            slides[idx] = { ...slides[idx], ...slide };
          } else {
            slides.push(slide);
          }
        } else {
          slide.id = "SLD-" + Date.now();
          slide.order = slides.length + 1;
          slides.push(slide);
        }
        this.saveSlides(slides);
        return { success: true, data: slide };
      }

      case 'deleteSlideItem': {
        let slides = this.getSlides();
        slides = slides.filter(s => s.id !== payload.slideId);
        this.saveSlides(slides);
        return { success: true };
      }

      case 'toggleSlideItem': {
        const slides = this.getSlides();
        const slide = slides.find(s => s.id === payload.slideId);
        if (slide) {
          slide.active = !slide.active;
          this.saveSlides(slides);
          return { success: true, active: slide.active };
        }
        return { success: false, error: "Slide tidak ditemukan." };
      }

      case 'getAppConfig': {
        return this.getConfig();
      }

      case 'loginAdmin': {
        const users = this.getUsers();
        const inputUser = String(payload.user || '').trim().toLowerCase();
        const inputPass = String(payload.pass || '').trim();

        // Cari kecocokan username
        const match = users.find(u => u.username.toLowerCase() === inputUser);
        if (match && (match.passwordHash === inputPass || match.passwordHash === 'admin123')) {
          const fakeToken = "MOCK-SESSION-" + Date.now();
          return {
            success: true,
            token: fakeToken,
            akses: match.akses || "Semua"
          };
        }
        return { success: false, error: "Username atau Password salah! (Default ujicoba: admin / admin123)" };
      }

      case 'simpanPengaduan': {
        const reports = this.getReports();
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dateCode = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
        const randomNum = Math.floor(100 + Math.random() * 900);
        const ticketID = `TKT-${dateCode}-${randomNum}`;

        const newReport = {
          rowIndex: reports.length + 2,
          id: ticketID,
          tanggal: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
          nama: payload.data.nama || "Anonim",
          identitas: payload.data.identitas || "-",
          kontak: payload.data.kontak || "-",
          statusPelapor: payload.data.statusPelapor || "Masyarakat",
          judul: payload.data.judul || "Pengaduan",
          kategori: payload.data.kategori || "Lainnya",
          lokasi: payload.data.lokasi || "-",
          waktuKejadian: payload.data.waktuKejadian || "",
          uraian: payload.data.uraian || "",
          bukti: payload.fileData && payload.fileData.length > 0 ? "(Ada Berkas Lampiran)" : "",
          status: "Baru",
          catatan: ""
        };

        reports.unshift(newReport);
        this.saveReports(reports);
        return { success: true, ticket: ticketID };
      }

      case 'cekStatusTiket': {
        const reports = this.getReports();
        const cleanId = String(payload.ticketId || '').trim().toUpperCase();
        const match = reports.find(r => r.id.toUpperCase() === cleanId);

        if (match) {
          return {
            found: true,
            tiket: match.id,
            judul: match.judul,
            status: match.status,
            catatan: match.catatan,
            tanggal: match.tanggal
          };
        }
        return { found: false };
      }

      case 'getDashboardStats': {
        const reports = this.getReports();
        const stats = {
          total: reports.length,
          status: { 'Baru': 0, 'Diproses': 0, 'Selesai': 0, 'Ditolak': 0 },
          kategori: {},
          recent: []
        };

        reports.forEach(r => {
          if (stats.status[r.status] !== undefined) {
            stats.status[r.status]++;
          }
          stats.kategori[r.kategori] = (stats.kategori[r.kategori] || 0) + 1;
        });

        stats.recent = reports.slice(0, 5).map(r => ({
          id: r.id,
          judul: r.judul,
          status: r.status,
          tanggal: r.tanggal
        }));

        return { success: true, data: stats };
      }

      case 'getAdminData': {
        let reports = [...this.getReports()];
        const page = parseInt(payload.page) || 1;
        const limit = parseInt(payload.limit) || 10;
        const search = String(payload.search || '').toLowerCase().trim();

        if (search) {
          reports = reports.filter(r =>
            r.id.toLowerCase().includes(search) ||
            r.nama.toLowerCase().includes(search) ||
            r.judul.toLowerCase().includes(search)
          );
        }

        const total = reports.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const validPage = page > totalPages ? totalPages : page;
        const start = (validPage - 1) * limit;
        const pagedData = reports.slice(start, start + limit);

        return {
          data: pagedData,
          total: total,
          page: validPage,
          totalPages: totalPages
        };
      }

      case 'updateStatus': {
        const reports = this.getReports();
        const rIdx = parseInt(payload.rowIndex);
        const item = reports.find(r => r.rowIndex === rIdx) || reports[0];
        if (item) {
          item.status = payload.newStatus;
          item.catatan = payload.catatan || '';
          this.saveReports(reports);
          return { success: true, message: "Status berhasil diupdate." };
        }
        return { success: false, error: "Data laporan tidak ditemukan." };
      }

      case 'deleteReport': {
        let reports = this.getReports();
        const ticketId = String(payload.ticketId || '').trim();
        reports = reports.filter(r => r.id !== ticketId);
        this.saveReports(reports);
        return { success: true };
      }

      case 'getAllUsers': {
        const users = this.getUsers().map(u => ({
          rowIndex: u.rowIndex,
          username: u.username,
          akses: u.akses
        }));
        return { success: true, data: users };
      }

      case 'saveUserAccount': {
        const users = this.getUsers();
        if (payload.isEdit) {
          const u = users.find(x => x.rowIndex === payload.rowIndex);
          if (u) {
            u.username = payload.username;
            u.akses = payload.role;
            if (payload.password) u.passwordHash = payload.password;
          }
        } else {
          users.push({
            rowIndex: users.length + 2,
            username: payload.username,
            passwordHash: payload.password || '123456',
            akses: payload.role
          });
        }
        this.saveUsers(users);
        return { success: true, message: "Akun pengguna berhasil disimpan." };
      }

      case 'deleteUserAccount': {
        let users = this.getUsers();
        users = users.filter(u => u.rowIndex !== payload.rowIndex);
        this.saveUsers(users);
        return { success: true };
      }

      case 'uploadLogoFromSetup': {
        return { success: true, url: "./logo.png" };
      }

      case 'saveAppConfig': {
        const currentCfg = this.getConfig();
        const newCfg = {
          ...currentCfg,
          logo: payload.form.cfg_logo || currentCfg.logo,
          logoinstansi: payload.form.cfg_instansi || currentCfg.logoinstansi,
          fotosekolah: payload.form.cfg_fotosekolah !== undefined ? payload.form.cfg_fotosekolah : currentCfg.fotosekolah,
          namasekolah: payload.form.cfg_sekolah || currentCfg.namasekolah,
          provinsi: payload.form.cfg_provinsi || currentCfg.provinsi,
          slogan: payload.form.cfg_slogan || currentCfg.slogan,
          jalan: payload.form.cfg_jalan || currentCfg.jalan,
          telp: payload.form.cfg_telp || currentCfg.telp,
          email: payload.form.cfg_email || currentCfg.email,
          tahun: payload.form.cfg_tahun || currentCfg.tahun,
          website: payload.form.cfg_website || currentCfg.website,
          webdinas: payload.form.cfg_dinas || currentCfg.webdinas,
          webspmb: payload.form.cfg_spmb || currentCfg.webspmb,
          theme: payload.form.cfg_theme || currentCfg.theme
        };
        this.saveConfig(newCfg);
        return { success: true };
      }

      case 'exportExcel': {
        // Buat dummy CSV/Excel blob download
        const reports = this.getReports();
        let csvContent = "data:text/csv;charset=utf-8,ID,Tanggal,Nama,Kategori,Status,Catatan\n";
        reports.forEach(r => {
          csvContent += `"${r.id}","${r.tanggal}","${r.nama}","${r.kategori}","${r.status}","${r.catatan}"\n`;
        });
        const encodedUri = encodeURI(csvContent);
        return { url: encodedUri };
      }

      case 'generatePDF': {
        // Dummy data PDF untuk browser download
        const dummyPdfBlob = btoa("Ujicoba Dokumen Bukti Laporan SiLaDuMas");
        return {
          base64: dummyPdfBlob,
          filename: `Bukti_Laporan_Ujicoba.pdf`
        };
      }

      default:
        throw new Error(`Aksi mock [${action}] belum diimplementasikan.`);
    }
  }
};
