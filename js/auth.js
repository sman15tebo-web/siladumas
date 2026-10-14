/**
 * ====================================================================
 * SiLaDuMas - Sistem Layanan Pengaduan Masyarakat
 * Script: auth.js (Authentication & Session Guard)
 * ====================================================================
 */

const Auth = {
  getToken() {
    return sessionStorage.getItem(CONFIG.STORAGE_TOKEN) || "";
  },

  getRole() {
    return sessionStorage.getItem(CONFIG.STORAGE_ROLE) || "";
  },

  setSession(token, role) {
    sessionStorage.setItem(CONFIG.STORAGE_TOKEN, token);
    sessionStorage.setItem(CONFIG.STORAGE_ROLE, role);
  },

  clearSession() {
    sessionStorage.removeItem(CONFIG.STORAGE_TOKEN);
    sessionStorage.removeItem(CONFIG.STORAGE_ROLE);
  },

  isLoggedIn() {
    return Boolean(this.getToken());
  },

  isSuperadmin() {
    const role = this.getRole();
    return role === "Semua" || role === "Superadmin";
  }
};

/**
 * Handle submit login admin
 */
async function handleLogin(e) {
  e.preventDefault();
  const username = $('#user').val().trim();
  const password = $('#pass').val().trim();

  if (!username || !password) {
    return showMsg('warning', 'Peringatan', 'Username dan password wajib diisi.');
  }

  showLoading();

  try {
    const res = await fetchAPI('loginAdmin', { user: username, pass: password });
    if (!res.success) throw new Error(res.error || 'Login gagal.');

    Auth.setSession(res.token, res.akses);
    $('#user').val('');
    $('#pass').val('');

    navigasiKe('dashboard');

    Swal.fire({
      icon: 'success',
      title: 'Login Berhasil',
      text: `Selamat datang, ${escapeHtml(username)}!`,
      showConfirmButton: false,
      timer: 1500,
      backdrop: false
    });
  } catch (err) {
    showMsg('error', 'Login Gagal', err.message);
  } finally {
    hideLoading();
  }
}

/**
 * Konfirmasi dan proses logout
 */
function logout() {
  Swal.fire({
    title: 'Konfirmasi Keluar',
    text: 'Apakah Anda yakin ingin mengakhiri sesi admin?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#4e54c8',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Ya, Keluar',
    cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {
      Auth.clearSession();
      navigasiKe('public');
      showToast('info', 'Anda telah keluar.');
    }
  });
}

/**
 * Toggle visibility password input
 */
function togglePass() {
  const input = document.getElementById('pass');
  const icon = document.getElementById('eyeIcon');
  if (!input || !icon) return;

  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}
