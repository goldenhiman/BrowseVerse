import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';

interface ChangeEncryptionPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export function ChangeEncryptionPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  onUpdatePassword,
}: ChangeEncryptionPasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      setError('Please enter your current password.');
      return;
    }
    if (!newPassword.trim()) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword !== repeatPassword) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onUpdatePassword(currentPassword.trim(), newPassword.trim());
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setCurrentPassword('');
    setNewPassword('');
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
      aria-labelledby="change-password-modal-title"
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
          <h2 id="change-password-modal-title" className="text-base font-semibold text-surface-900">
            Change Encryption Password
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
          <Input
            type="password"
            label="Current password"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            type="password"
            label="New password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            type="password"
            label="Repeat new password"
            placeholder="Repeat new password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            autoComplete="new-password"
          />

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 shadow-[0_0_0_1px_rgba(217,119,6,0.15)] px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              If you have forgotten your current password, nothing can be done for now.
            </p>
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
            disabled={
              saving ||
              !currentPassword.trim() ||
              !newPassword.trim() ||
              newPassword !== repeatPassword
            }
          >
            {saving ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </div>
    </div>
  );
}
