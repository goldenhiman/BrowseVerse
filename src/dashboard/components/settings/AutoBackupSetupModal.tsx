import React, { useState, useEffect } from 'react';
import { X, FolderOpen, ShieldCheck } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';

interface AutoBackupSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    folderHandle: FileSystemDirectoryHandle;
    encryptionPassword?: string;
  }) => Promise<void>;
}

export function AutoBackupSetupModal({
  isOpen,
  onClose,
  onComplete,
}: AutoBackupSetupModalProps) {
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [enableEncryption, setEnableEncryption] = useState(false);
  const [encPassword, setEncPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedFolderName(null);
      setFolderHandle(null);
      setEnableEncryption(false);
      setEncPassword('');
      setRepeatPassword('');
      setError(null);
    }
  }, [isOpen]);

  const handleChooseFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setFolderHandle(handle);
      setSelectedFolderName(handle.name);
      setError(null);
    } catch {
      // User cancelled
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderHandle) {
      setError('Please choose a backup folder.');
      return;
    }
    if (enableEncryption) {
      if (!encPassword.trim()) {
        setError('Please enter an encryption password.');
        return;
      }
      if (encPassword !== repeatPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await onComplete({
        folderHandle,
        encryptionPassword: enableEncryption ? encPassword.trim() : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedFolderName(null);
    setFolderHandle(null);
    setEnableEncryption(false);
    setEncPassword('');
    setRepeatPassword('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="autobackup-setup-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={handleCancel}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_20px_50px_rgba(0,0,0,0.15)] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <h2 id="autobackup-setup-modal-title" className="text-base font-semibold text-surface-900">
            Set up Auto-Backup
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close"
            className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-[color,background] duration-150"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(85vh-180px)] px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1.5 block">Backup Folder</label>
            {selectedFolderName ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-surface-50 border border-surface-200 px-3 py-1.5 flex-1 min-w-0">
                  <FolderOpen className="h-3.5 w-3.5 text-surface-500 shrink-0" />
                  <span className="text-sm text-surface-700 truncate">{selectedFolderName}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleChooseFolder}>
                  Change
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleChooseFolder}
              >
                <FolderOpen className="h-3 w-3" /> Choose Folder
              </Button>
            )}
          </div>

          <div className="border-t border-surface-200 pt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
              <input
                type="checkbox"
                checked={enableEncryption}
                onChange={(e) => setEnableEncryption(e.target.checked)}
                className="rounded border-surface-300 h-4 w-4"
              />
              <span className="text-sm font-medium text-surface-700">Set encryption password</span>
            </label>
            {enableEncryption && (
              <div className="space-y-2 mt-2">
                <Input
                  type="password"
                  placeholder="Encryption password"
                  value={encPassword}
                  onChange={(e) => setEncPassword(e.target.value)}
                  autoComplete="off"
                />
                <Input
                  type="password"
                  placeholder="Repeat password"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-xs text-surface-500 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  All exports and backups will be encrypted. You will need this password to import.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 shadow-[0_0_0_1px_rgba(220,38,38,0.15)] px-3 py-2">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </form>

        <div className="px-5 py-3 border-t border-surface-200 bg-surface-50/50 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving || !folderHandle || (enableEncryption && (!encPassword.trim() || encPassword !== repeatPassword))}
          >
            {saving ? 'Setting up…' : enableEncryption ? 'Set up auto backup with encryption' : 'Set up auto backup'}
          </Button>
        </div>
      </div>
    </div>
  );
}
