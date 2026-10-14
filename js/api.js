/**
 * ====================================================================
 * SiLaDuMas - Sistem Layanan Pengaduan Masyarakat
 * Script: api.js (Centralized HTTP Client for Google Apps Script)
 * ====================================================================
 */

/**
 * Gateway API Fetcher ke Google Apps Script Web App (atau Mock Engine saat DEV_MODE aktif)
 * @param {string} action Nama endpoint / aksi
 * @param {object} payload Data request
 * @param {number} timeoutMs Waktu batas request dalam ms (default 30 detik)
 */
async function fetchAPI(action, payload = {}, timeoutMs = 30000) {
  // Jika mode uji coba / simulasi aktif, alihkan request ke engine lokal MockAPI
  if (CONFIG.DEV_MODE) {
    if (typeof MockAPI !== 'undefined' && MockAPI.handle) {
      console.log(`%c[DEV MOCK API] %cAction: "${action}"`, 'color: #f59e0b; font-weight: bold;', 'color: inherit;', payload);
      return await MockAPI.handle(action, payload);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: action,
        payload: payload
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Verifikasi format standar response backend { success: boolean, data?: any, error?: string }
    if (!result.success) {
      throw new Error(result.error || 'Terjadi kesalahan sistem di server backend.');
    }

    return result.data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Koneksi ke server Google Apps Script timeout (waktu habis). Silakan coba lagi.');
    }

    console.error(`[API ERROR] Action: "${action}":`, error);
    throw error;
  }
}
