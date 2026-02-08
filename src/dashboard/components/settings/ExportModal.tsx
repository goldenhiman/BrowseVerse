import React, { useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import {
  exportAsJSON,
  exportPagesAsCSV,
  exportHighlightsAsCSV,
  downloadFile,
} from '../../../privacy/export';
import { encryptExport } from '../../../privacy/crypto';

export type ExportType = 'all' | 'pages' | 'highlights';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({
  isOpen,
  onClose,
}: ExportModalProps) {
  const [exportType, setExportType] = useState<ExportType>('all');
  const [encrypt, setEncrypt] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (exportType) {
        case 'all': {
          content = await exportAsJSON();
          if (encrypt && exportPassword.trim()) {
            content = await encryptExport(content, exportPassword.trim());
          }
          filename = `knowledge-os-export-${Date.now()}.json`;
          mimeType = 'application/json';
          break;
        }
        case 'pages': {
          content = await exportPagesAsCSV();
          filename = `knowledge-os-pages-${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
        }
        case 'highlights': {
          content = await exportHighlightsAsCSV();
          filename = `knowledge-os-highlights-${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
        }
      }

      downloadFile(content, filename, mimeType);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_20px_50px_rgba(0,0,0,0.15)] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <h2 id="export-modal-title" className="text-base font-semibold text-surface-900">
            Export Data
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-[color,background] duration-150"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-180px)] px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-600 mb-2 block">
              Export type
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportType"
                  value="all"
                  checked={exportType === 'all'}
                  onChange={() => setExportType('all')}
                  className="rounded-full border-surface-300"
                />
                <span className="text-sm text-surface-700">All data (JSON)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportType"
                  value="pages"
                  checked={exportType === 'pages'}
                  onChange={() => setExportType('pages')}
                  className="rounded-full border-surface-300"
                />
                <span className="text-sm text-surface-700">Pages (CSV)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportType"
                  value="highlights"
                  checked={exportType === 'highlights'}
                  onChange={() => setExportType('highlights')}
                  className="rounded-full border-surface-300"
                />
                <span className="text-sm text-surface-700">Highlights (CSV)</span>
              </label>
            </div>
          </div>

          {exportType === 'all' && (
            <>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={encrypt}
                  onChange={(e) => setEncrypt(e.target.checked)}
                  className="rounded border-surface-300 h-4 w-4"
                />
                <span className="text-sm text-surface-700">Encrypt export</span>
              </label>
              {encrypt && (
                <Input
                  type="password"
                  label="Encryption password"
                  placeholder="Enter password for this export"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  autoComplete="off"
                />
              )}
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 shadow-[0_0_0_1px_rgba(220,38,38,0.15)] px-3 py-2">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-surface-200 bg-surface-50/50 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={exporting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={
              exporting ||
              (exportType === 'all' && encrypt && !exportPassword.trim())
            }
          >
            <Download className="h-3 w-3" />
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  );
}
