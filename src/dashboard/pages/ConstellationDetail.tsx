import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, CardHeader, CardTitle } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { EmptyState } from '../components/shared/EmptyState';
import { ConstellationDocument } from '../components/ConstellationDocument';
import { useKnowledgeBoxById } from '../hooks/useKnowledgeBoxes';
import { knowledgeBoxesRepo } from '../../db/repositories/knowledgeBoxes';
import { pagesRepo } from '../../db/repositories/pages';
import { topicsRepo } from '../../db/repositories/topics';
import { exportKnowledgeBoxAsMarkdown, downloadFile } from '../../privacy/export';
import { useLiveQuery } from 'dexie-react-hooks';
import type { KnowledgeBoxStatus, KnowledgeBoxNote } from '../../shared/types';
import {
  ArrowLeft,
  Target,
  Plus,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  Globe,
  Tag,
  Download,
  StickyNote,
} from 'lucide-react';

export default function ConstellationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const boxId = id ? parseInt(id) : undefined;
  const box = useKnowledgeBoxById(boxId);

  const relatedPages = useLiveQuery(
    () => (box?.related_page_ids.length ? pagesRepo.getByIds(box.related_page_ids) : Promise.resolve([])),
    [box?.related_page_ids],
  );

  const relatedTopics = useLiveQuery(
    () => (box?.related_topic_ids.length ? topicsRepo.getByIds(box.related_topic_ids) : Promise.resolve([])),
    [box?.related_topic_ids],
  );

  const [newNote, setNewNote] = useState('');

  if (!box) {
    return (
      <div>
        <Header title="Constellation" />
        <div className="p-6">
          <EmptyState title="Constellation not found" />
        </div>
      </div>
    );
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !boxId) return;
    const note: KnowledgeBoxNote = {
      id: crypto.randomUUID(),
      text: newNote.trim(),
      timestamp: Date.now(),
    };
    await knowledgeBoxesRepo.addNote(boxId, note);
    setNewNote('');
  };

  const handleRemoveNote = async (noteId: string) => {
    if (!boxId) return;
    await knowledgeBoxesRepo.removeNote(boxId, noteId);
  };

  const handleStatusChange = async (status: KnowledgeBoxStatus) => {
    if (!boxId) return;
    await knowledgeBoxesRepo.setStatus(boxId, status);
  };

  const handleExport = async () => {
    if (!boxId) return;
    const md = await exportKnowledgeBoxAsMarkdown(boxId);
    if (md) {
      downloadFile(md, `${box.title.replace(/\s+/g, '-').toLowerCase()}.md`, 'text/markdown');
    }
  };

  const handleDelete = async () => {
    if (!boxId) return;
    if (confirm('Are you sure you want to delete this constellation?')) {
      await knowledgeBoxesRepo.deleteBox(boxId);
      navigate('/constellations');
    }
  };

  const statusActions: Record<KnowledgeBoxStatus, React.ReactNode> = {
    active: (
      <>
        <Button variant="secondary" size="sm" onClick={() => handleStatusChange('paused')}>
          <Pause className="h-3 w-3" /> Pause
        </Button>
        <Button variant="secondary" size="sm" onClick={() => handleStatusChange('completed')}>
          <CheckCircle2 className="h-3 w-3" /> Complete
        </Button>
      </>
    ),
    paused: (
      <Button variant="secondary" size="sm" onClick={() => handleStatusChange('active')}>
        <Play className="h-3 w-3" /> Resume
      </Button>
    ),
    completed: (
      <Button variant="secondary" size="sm" onClick={() => handleStatusChange('active')}>
        <Play className="h-3 w-3" /> Reopen
      </Button>
    ),
  };

  return (
    <div>
      <Header
        title={box.title}
        subtitle={box.goal_statement}
        actions={
          <div className="flex items-center gap-2">
            {statusActions[box.status]}
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="h-3 w-3" /> Export
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        }
      />

      <div className="p-6">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/constellations')}
          className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 mb-4 transition-[color] duration-150 ease-[var(--ease-out-cubic)] min-h-[44px]"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Back to Constellations
        </button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Goal */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary-500" />
                    Goal
                  </span>
                </CardTitle>
                <Badge
                  variant={
                    box.status === 'active'
                      ? 'success'
                      : box.status === 'paused'
                        ? 'warning'
                        : 'default'
                  }
                >
                  {box.status}
                </Badge>
              </CardHeader>
              <p className="text-sm text-surface-700">
                {box.goal_statement || 'No goal statement set'}
              </p>
            </Card>

            {/* Living Document */}
            {boxId && (
              <ConstellationDocument
                constellation={box}
                constellationId={boxId}
              />
            )}

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-amber-500" />
                    Notes ({box.notes.length})
                  </span>
                </CardTitle>
              </CardHeader>

              {/* Add note */}
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Add a note or reflection..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {box.notes.length === 0 ? (
                <p className="text-xs text-surface-400 py-4 text-center">
                  No notes yet. Add reflections as you explore.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...box.notes].reverse().map((note) => (
                    <div
                      key={note.id}
                      className="group flex items-start gap-3 rounded-lg bg-surface-50 p-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-surface-700">{note.text}</p>
                        <p className="text-[10px] text-surface-400 mt-1">
                          {new Date(note.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveNote(note.id)}
                        aria-label="Remove note"
                        className="opacity-0 group-hover:opacity-100 p-1 text-surface-400 hover:text-error transition-[opacity,color] duration-150 ease-[var(--ease-out-cubic)]"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Related Pages */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    Pages ({relatedPages?.length || 0})
                  </span>
                </CardTitle>
              </CardHeader>
              {relatedPages && relatedPages.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {relatedPages.map((page) => (
                    <a
                      key={page.id}
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-surface-600 hover:bg-surface-50 transition-colors"
                    >
                      {page.favicon ? (
                        <img src={page.favicon} alt="" className="h-3 w-3 rounded-sm" />
                      ) : (
                        <Globe className="h-3 w-3 text-surface-300" />
                      )}
                      <span className="truncate">{page.title || page.domain}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-surface-400 py-2 text-center">
                  No linked pages
                </p>
              )}
            </Card>

            {/* Related Topics */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-purple-500" />
                    Topics ({relatedTopics?.length || 0})
                  </span>
                </CardTitle>
              </CardHeader>
              {relatedTopics && relatedTopics.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {relatedTopics.map((topic) => (
                    <Badge key={topic.id} variant="primary">
                      {topic.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-surface-400 py-2 text-center">
                  No linked topics
                </p>
              )}
            </Card>

            {/* Meta */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <div className="space-y-2 text-xs text-surface-500">
                <div className="flex justify-between">
                  <span>Started</span>
                  <span className="text-surface-700">
                    {new Date(box.start_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last updated</span>
                  <span className="text-surface-700">
                    {new Date(box.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pages linked</span>
                  <span className="text-surface-700">{box.related_page_ids.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Notes</span>
                  <span className="text-surface-700">{box.notes.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
