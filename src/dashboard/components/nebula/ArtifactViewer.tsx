import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Download, Check } from 'lucide-react';
import { Button } from '../shared/Button';
import type { Artifact } from '../../../shared/types';

interface ArtifactViewerProps {
  artifact: Artifact;
}

export function ArtifactViewer({ artifact }: ArtifactViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = artifact.format === 'markdown' ? '.md' : '.txt';
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-')}${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-surface-900">{artifact.title}</h3>
          <p className="text-[10px] text-surface-400 mt-0.5">
            Created {new Date(artifact.created_at).toLocaleString()} · {artifact.format}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl bg-white p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] prose prose-sm prose-surface max-w-none">
        {artifact.format === 'markdown' ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-surface-900 mb-4 mt-0 first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-semibold text-surface-800 mt-6 mb-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-surface-700 mt-4 mb-1.5">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-sm text-surface-600 leading-relaxed mb-3">{children}</p>
              ),
              li: ({ children }) => (
                <li className="text-sm text-surface-600 leading-relaxed">{children}</li>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="rounded bg-surface-100 px-1.5 py-0.5 text-xs font-mono text-surface-700">
                    {children}
                  </code>
                ) : (
                  <code className={className}>{children}</code>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-primary-200 pl-4 italic text-surface-500">
                  {children}
                </blockquote>
              ),
            }}
          >
            {artifact.content}
          </ReactMarkdown>
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-surface-700 font-mono">
            {artifact.content}
          </pre>
        )}
      </div>
    </div>
  );
}
