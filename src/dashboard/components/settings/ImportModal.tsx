import React, { useState, useRef } from 'react';
import { X, Upload, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { Badge } from '../shared/Badge';
import {
  validateExportFile,
  importFromJSON,
} from '../../../privacy/export';
import type { ImportPreview } from '../../../privacy/export';
import { isEncryptedExport, decryptExport } from '../../../privacy/crypto';

const TABLE_LABELS: Record<string, string> = {
  pages: 'Pages',
  sessions: 'Sessions',
  highlights: 'Highlights',
  topics: 'Topics',
  categories: 'Categories',
  concepts: 'Concepts',
  relationships: 'Relationships',
  knowledgeBoxes: 'Constellations',
  documentChunks: 'Document Chunks',
  nebulas: 'Nebulas',
  nebulaRuns: 'Nebula Runs',
  artifacts: 'Artifacts',
};

type ImportStep = 'select' | 'preview' | 'success';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('select');
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importNeedsPassword, setImportNeedsPassword] = useState(false);
  const [importDecryptPassword, setImportDecryptPassword] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<Record<string, number> | null>(null);

  const resetState = () => {
    setStep('select');
    setImportFileContent(null);
    setImportPreview(null);
    setImportNeedsPassword(false);
    setImportDecryptPassword('');
    setImportError(null);
    setImportSuccess(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportPreview(null);
    setImportFileContent(null);
    setImportNeedsPassword(false);
    setImportDecryptPassword('');

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (isEncryptedExport(text)) {
        setImportFileContent(text);
        setImportNeedsPassword(true);
      } else {
        const result = validateExportFile(text);
        if (!result.valid) {
          setImportError(result.error ?? 'Invalid export file.');
        } else {
          setImportPreview(result.preview!);
          setImportFileContent(text);
          setStep('preview');
        }
      }
    };
    reader.onerror = () => setImportError('Failed to read the selected file.');
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDecryptAndValidate = async () => {
    if (!importFileContent || !importDecryptPassword) return;
    setDecrypting(true);
    setImportError(null);
    try {
      const plaintext = await decryptExport(importFileContent, importDecryptPassword);
      const result = validateExportFile(plaintext);
      if (!result.valid) {
        setImportError(result.error ?? 'Decrypted file is not a valid export.');
      } else {
        setImportPreview(result.preview!);
        setImportFileContent(plaintext);
        setImportNeedsPassword(false);
        setStep('preview');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Decryption failed.');
    }
    setDecrypting(false);
  };

  const handleImportConfirm = async () => {
    if (!importFileContent) return;
    setImporting(true);
    setImportError(null);
    const result = await importFromJSON(importFileContent);
    setImporting(false);
    if (result.success) {
      setImportSuccess(result.counts);
      setStep('success');
      onImportComplete();
    } else {
      setImportError(result.error ?? 'Import failed.');
    }
  };

  const handleCancelPreview = () => {
    setStep('select');
    setImportFileContent(null);
    setImportPreview(null);
    setImportNeedsPassword(false);
    setImportDecryptPassword('');
    setImportError(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_20px_50px_rgba(0,0,0,0.15)] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <h2 id="import-modal-title" className="text-base font-semibold text-surface-900">
            {step === 'select' && 'Import Data'}
            {step === 'preview' && 'Import Preview'}
            {step === 'success' && 'Import Successful'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-[color,background] duration-150"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-140px)] px-5 py-4">
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-xs text-surface-500">
                Select a JSON export file to restore your data. Encrypted files will prompt for a password.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileSelect}
              />

              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3 w-3" /> Select file
              </Button>

              {importNeedsPassword && importFileContent && (
                <div className="space-y-3 pt-2 border-t border-surface-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-medium text-surface-700">Encrypted Export Detected</p>
                  </div>
                  <p className="text-xs text-surface-500">
                    Enter the password that was used to encrypt this file.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="Encryption password"
                      value={importDecryptPassword}
                      onChange={(e) => setImportDecryptPassword(e.target.value)}
                      autoComplete="off"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleDecryptAndValidate}
                      disabled={decrypting || !importDecryptPassword.trim()}
                    >
                      {decrypting ? 'Decrypting…' : 'Continue'}
                    </Button>
                  </div>
                </div>
              )}

              {importError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 shadow-[0_0_0_1px_rgba(220,38,38,0.15)] px-3 py-2">
                  <p className="text-xs text-red-700">{importError}</p>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && importPreview && (
            <div className="space-y-4">
              <p className="text-xs text-surface-500">
                Exported on{' '}
                <strong>{new Date(importPreview.exported_at).toLocaleString()}</strong>
                {importPreview.hasSettings && ' — includes settings'}
              </p>

              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-50 text-blue-700 text-[10px]">
                  v{importPreview.version}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(importPreview.counts)
                  .filter(([, count]) => count > 0)
                  .map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-surface-600">{TABLE_LABELS[key] ?? key}</span>
                      <span className="font-medium text-surface-800">{count.toLocaleString()}</span>
                    </div>
                  ))}
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-50 shadow-[0_0_0_1px_rgba(217,119,6,0.15)] px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  This will <strong>replace all existing data</strong>. Make sure you have a backup if needed.
                </p>
              </div>

              {importError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 shadow-[0_0_0_1px_rgba(220,38,38,0.15)] px-3 py-2">
                  <p className="text-xs text-red-700">{importError}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleImportConfirm}
                  disabled={importing}
                >
                  {importing ? 'Importing…' : 'Import & Replace All Data'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancelPreview} disabled={importing}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && importSuccess && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-800">Import Successful</p>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(importSuccess)
                  .filter(([, count]) => count > 0)
                  .map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-green-700">{TABLE_LABELS[key] ?? key}</span>
                      <span className="font-medium text-green-900">{count.toLocaleString()}</span>
                    </div>
                  ))}
              </div>

              <Button variant="ghost" size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
