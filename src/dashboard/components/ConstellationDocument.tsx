import React, { useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDocumentChunks } from '../hooks/useDocumentChunks';
import { Card } from './shared/Card';
import { Button } from './shared/Button';
import { EmptyState } from './shared/EmptyState';
import { getAIProvider, isAIAvailable } from '../../ai/manager';
import { updateConstellationDocument } from '../../ai/tasks/document-updater';
import { matchPagesToConstellations } from '../../ai/tasks/constellation-matcher';
import { knowledgeBoxesRepo } from '../../db/repositories/knowledgeBoxes';
import type { KnowledgeBox, DocumentChunk } from '../../shared/types';
import {
  FileText,
  RefreshCw,
  Sparkles,
  Clock,
  ChevronRight,
  BookOpen,
  AlertCircle,
  Settings,
} from 'lucide-react';

interface ConstellationDocumentProps {
  constellation: KnowledgeBox;
  constellationId: number;
}

export function ConstellationDocument({ constellation, constellationId }: ConstellationDocumentProps) {
  const chunks = useDocumentChunks(constellationId);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showToc, setShowToc] = useState(true);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  // Check AI availability
  useEffect(() => {
    isAIAvailable().then(setAiAvailable);
  }, []);

  /**
   * Full pipeline: match pages to this constellation, then generate/update the document.
   * This lets the user trigger the whole flow manually instead of waiting 15+ minutes.
   */
  const handleGenerateOrRefresh = useCallback(async () => {
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const provider = await getAIProvider();
      if (!provider) {
        setUpdateError('AI is not configured. Go to Settings to enable AI and add your API key.');
        return;
      }

      // If the constellation has no pages yet, run the matcher first to assign pages
      if (constellation.related_page_ids.length === 0) {
        console.log('[BKO] No pages assigned yet, running constellation matcher first...');
        await matchPagesToConstellations(provider);
      }

      // Re-fetch the constellation to get any newly assigned pages
      // (the constellation prop may be stale after matching)
      const freshConstellation = await knowledgeBoxesRepo.getById(constellationId);
      if (!freshConstellation) {
        setUpdateError('Constellation not found');
        return;
      }

      if (freshConstellation.related_page_ids.length === 0) {
        setUpdateError('No pages could be matched to this constellation. Browse some pages related to your goal, then try again.');
        return;
      }

      await updateConstellationDocument(provider, freshConstellation);
    } catch (err: any) {
      setUpdateError(err?.message || 'Failed to update document');
    } finally {
      setIsUpdating(false);
    }
  }, [constellation, constellationId]);

  // Loading state
  if (chunks === undefined) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-surface-100 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-3 bg-surface-100 rounded w-full" />
          <div className="h-3 bg-surface-100 rounded w-5/6" />
          <div className="h-3 bg-surface-100 rounded w-4/6" />
        </div>
      </Card>
    );
  }

  // Empty state — no document yet
  if (!chunks || chunks.length === 0) {
    const hasPages = constellation.related_page_ids.length > 0;

    // AI not configured
    if (aiAvailable === false) {
      return (
        <Card>
          <EmptyState
            icon={<Settings className="h-10 w-10" />}
            title="AI not configured"
            description="Enable AI in Settings and add your API key to generate living documents for your constellations."
            className="py-12"
          />
        </Card>
      );
    }

    return (
      <Card>
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="No document yet"
          description={
            hasPages
              ? 'A living document will be automatically generated from the linked pages. You can also generate it now.'
              : 'Click below to match your browsing history to this constellation and generate a living document, or wait for the automatic background process.'
          }
          action={
            <div className="flex flex-col items-center gap-2">
              <Button
                size="sm"
                onClick={handleGenerateOrRefresh}
                disabled={isUpdating}
              >
                <Sparkles className={`h-3.5 w-3.5 ${isUpdating ? 'animate-pulse' : ''}`} />
                {isUpdating
                  ? (hasPages ? 'Generating...' : 'Matching pages & generating...')
                  : 'Generate Document'}
              </Button>
              {!hasPages && (
                <p className="text-[10px] text-surface-400 max-w-xs text-center">
                  This will scan your recent browsing history for pages relevant to this constellation's goal.
                </p>
              )}
            </div>
          }
          className="py-12"
        />
        {updateError && (
          <div className="flex items-center gap-2 justify-center mt-2 px-4">
            <AlertCircle className="h-3 w-3 text-error shrink-0" />
            <p className="text-xs text-error">{updateError}</p>
          </div>
        )}
      </Card>
    );
  }

  const lastUpdated = Math.max(...chunks.map((c) => c.updated_at));
  const totalVersions = chunks.reduce((sum, c) => sum + c.version, 0);

  return (
    <div className="space-y-0">
      {/* Document header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary-500" />
          <span className="text-sm font-semibold text-surface-900">Living Document</span>
          <span className="text-[10px] text-surface-400 tabular-nums">
            {chunks.length} sections
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-surface-400">
            <Clock className="h-2.5 w-2.5" />
            {new Date(lastUpdated).toLocaleString()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateOrRefresh}
            disabled={isUpdating}
          >
            <RefreshCw className={`h-3 w-3 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Updating...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {updateError && (
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-3 w-3 text-error shrink-0" />
          <p className="text-xs text-error">{updateError}</p>
        </div>
      )}

      {/* Table of Contents */}
      {showToc && chunks.length > 2 && (
        <Card className="mb-4 bg-surface-50/50">
          <button
            type="button"
            onClick={() => setShowToc(!showToc)}
            className="flex items-center gap-2 text-xs font-medium text-surface-600 mb-2"
          >
            <ChevronRight className="h-3 w-3" />
            Contents
          </button>
          <nav className="space-y-1">
            {chunks.map((chunk) => (
              <a
                key={chunk.id}
                href={`#doc-section-${chunk.section_key}`}
                className="flex items-center gap-2 text-xs text-surface-500 hover:text-primary-600 py-0.5 transition-colors"
              >
                <span className="w-1 h-1 rounded-full bg-surface-300 shrink-0" />
                {chunk.title}
                {chunk.version > 1 && (
                  <span className="text-[9px] text-surface-400 tabular-nums">v{chunk.version}</span>
                )}
              </a>
            ))}
          </nav>
        </Card>
      )}

      {/* Seamless Document Rendering */}
      <Card className="overflow-hidden">
        <article className="constellation-document prose prose-sm max-w-none">
          {chunks.map((chunk, index) => (
            <DocumentSection
              key={chunk.id ?? chunk.section_key}
              chunk={chunk}
              isFirst={index === 0}
              isLast={index === chunks.length - 1}
            />
          ))}
        </article>
      </Card>
    </div>
  );
}

/**
 * Renders a single document chunk as a seamless part of the document.
 * No visible boundaries between chunks — it reads as one document.
 */
function DocumentSection({
  chunk,
  isFirst,
  isLast,
}: {
  chunk: DocumentChunk;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <section
      id={`doc-section-${chunk.section_key}`}
      className={`group relative ${!isFirst ? 'mt-6 pt-6 border-t border-surface-100' : ''}`}
    >
      {/* Subtle version indicator on hover */}
      <div className="absolute -right-1 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-[9px] text-surface-300 tabular-nums">
          v{chunk.version}
        </span>
      </div>

      {/* Markdown content */}
      <div className="document-section-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom heading renderers for clean typography
            h1: ({ children }) => (
              <h1 className="text-xl font-bold text-surface-900 mb-3 leading-tight">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold text-surface-800 mb-2 mt-1 leading-snug">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-semibold text-surface-700 mb-1.5 mt-3">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="text-sm text-surface-700 leading-relaxed mb-3">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="text-sm text-surface-700 space-y-1 mb-3 pl-4 list-disc">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="text-sm text-surface-700 space-y-1 mb-3 pl-4 list-decimal">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed">{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-surface-800">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-surface-600">{children}</em>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline decoration-primary-300 hover:decoration-primary-500 transition-colors"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-primary-200 pl-3 my-3 text-sm text-surface-600 italic">
                {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="bg-surface-100 text-surface-700 px-1 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                );
              }
              return (
                <code className="block bg-surface-50 text-surface-700 p-3 rounded-lg text-xs font-mono overflow-x-auto mb-3">
                  {children}
                </code>
              );
            },
            hr: () => (
              <hr className="border-surface-100 my-4" />
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-xs border-collapse">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="text-left font-semibold text-surface-700 px-2 py-1.5 border-b border-surface-200 bg-surface-50">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="text-surface-600 px-2 py-1.5 border-b border-surface-100">
                {children}
              </td>
            ),
          }}
        >
          {chunk.content}
        </ReactMarkdown>
      </div>
    </section>
  );
}
