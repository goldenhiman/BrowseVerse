// ============================================================
// Auto-Backup - Directory handle storage & scheduled backups
// ============================================================

import { LAST_AUTO_BACKUP_KEY } from '../shared/constants';
import { loadSettings } from './exclusions';
import { exportAsJSON } from './export';
import { encryptExport } from './crypto';

// ============================================================
// Directory Handle Persistence (raw IndexedDB, not Dexie)
// ============================================================

const HANDLE_DB_NAME = 'bko_backup_handle';
const HANDLE_STORE = 'handles';
const HANDLE_KEY = 'backup_dir';

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HANDLE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Store the user-selected directory handle for backups */
export async function storeBackupDirHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite');
    tx.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Retrieve the stored directory handle (without checking permission) */
async function getRawHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, 'readonly');
      const req = tx.objectStore(HANDLE_STORE).get(HANDLE_KEY);
      req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch {
    return null;
  }
}

/**
 * Get the stored directory handle with verified write permission.
 * Returns null if no handle stored or permission was denied/lost.
 */
export async function getBackupDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await getRawHandle();
  if (!handle) return null;

  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return handle;
    // Permission not currently granted — can't request from service worker
    return null;
  } catch {
    return null;
  }
}

/** Return the display name of the stored backup directory (no permission check) */
export async function getBackupDirName(): Promise<string | null> {
  const handle = await getRawHandle();
  return handle?.name ?? null;
}

/** Remove the stored directory handle */
export async function clearBackupDirHandle(): Promise<void> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, 'readwrite');
      tx.objectStore(HANDLE_STORE).delete(HANDLE_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    // Silently ignore
  }
}

// ============================================================
// File Writing
// ============================================================

/**
 * Write content to a file inside the backup directory.
 * Returns true on success, false if the handle is unavailable.
 */
export async function writeBackupFile(
  content: string,
  filename: string,
): Promise<boolean> {
  const dirHandle = await getBackupDirHandle();
  if (!dirHandle) return false;

  try {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (err) {
    console.error('[BKO] writeBackupFile failed:', err);
    return false;
  }
}

// ============================================================
// Scheduled Auto-Backup
// ============================================================

/** Run the daily auto-backup (called from background alarm handler) */
export async function runAutoBackup(): Promise<void> {
  const settings = await loadSettings();
  if (!settings.auto_backup_enabled) return;

  // Generate the export JSON
  const json = await exportAsJSON();

  // Optionally encrypt
  let content = json;
  if (settings.backup_encryption_password) {
    content = await encryptExport(json, settings.backup_encryption_password);
  }

  // Build filename with today's date
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const filename = `browseverse-backup-${yyyy}-${mm}-${dd}.json`;

  const wrote = await writeBackupFile(content, filename);

  if (wrote) {
    // Persist last-backup timestamp
    await browser.storage.local.set({ [LAST_AUTO_BACKUP_KEY]: Date.now() });
    console.log(`[BKO] Auto-backup saved: ${filename}`);
  } else {
    console.warn('[BKO] Auto-backup skipped — no backup directory or permission lost.');
  }
}
