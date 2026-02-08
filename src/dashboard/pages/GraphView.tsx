import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { Button } from '../components/shared/Button';
import { EmptyState } from '../components/shared/EmptyState';
import { useAllTopics } from '../hooks/useTopics';
import { useAllCategories } from '../hooks/useCategories';
import { useAllRelationships } from '../hooks/useRelationships';
import { useRecentPages } from '../hooks/usePages';
import { pagesRepo } from '../../db/repositories/pages';
import { topicsRepo } from '../../db/repositories/topics';
import { getAIProvider, isAIAvailable } from '../../ai/manager';
import type { GraphData, GraphNode, GraphLink, EntityType, Page, Topic } from '../../shared/types';
import {
  GitFork,
  Filter,
  X,
  Globe,
  Tag,
  Layers,
  Clock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

const entityColors: Record<EntityType, string> = {
  page: '#748ffc',
  session: '#69db7c',
  topic: '#ffa94d',
  category: '#e599f7',
  concept: '#66d9e8',
  knowledge_box: '#ff8787',
};

const entityLabels: Record<EntityType, string> = {
  page: 'Pages',
  session: 'Sessions',
  topic: 'Topics',
  category: 'Categories',
  concept: 'Concepts',
  knowledge_box: 'Constellations',
};

interface NodeDetail {
  node: GraphNode;
  connectedNodes: GraphNode[];
  relatedPages: Page[];
  relatedTopics: Topic[];
}

interface NodeSummaryState {
  summary: string | null;
  generatedAt: number | null;
  loading: boolean;
  error: string | null;
  dataHash: string | null;
  isStale: boolean;
}

function computeNodeDataHash(detail: NodeDetail): string {
  return `${detail.node.id}_${detail.connectedNodes.map(n => n.id).join(',')}_${detail.relatedPages.length}_${Date.now() - (Date.now() % 60000)}`;
}

export default function GraphView() {
  const topics = useAllTopics();
  const categories = useAllCategories();
  const relationships = useAllRelationships();
  const recentPages = useRecentPages(50);

  const [showTypes, setShowTypes] = useState<Set<EntityType>>(
    new Set(['topic', 'category', 'page']),
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Right panel state
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [summaryState, setSummaryState] = useState<NodeSummaryState>({
    summary: null,
    generatedAt: null,
    loading: false,
    error: null,
    dataHash: null,
    isStale: false,
  });

  // Cache summaries in memory so they persist during session
  const summaryCache = useRef<Map<string, { summary: string; generatedAt: number; dataHash: string }>>(new Map());

  useEffect(() => {
    isAIAvailable().then(setAiAvailable);
  }, []);

  const toggleType = (type: EntityType) => {
    setShowTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const graphData: GraphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIdSet = new Set<string>();

    // Add topic nodes
    if (showTypes.has('topic') && topics) {
      for (const topic of topics) {
        const id = `topic-${topic.id}`;
        nodes.push({
          id,
          label: topic.name,
          type: 'topic',
          size: Math.max(4, Math.min(16, topic.page_ids.length)),
          color: entityColors.topic,
          entityId: topic.id,
        });
        nodeIdSet.add(id);
      }
    }

    // Add category nodes
    if (showTypes.has('category') && categories) {
      for (const cat of categories) {
        const id = `category-${cat.id}`;
        nodes.push({
          id,
          label: cat.name,
          type: 'category',
          size: Math.max(6, Math.min(20, cat.topic_ids.length * 3)),
          color: entityColors.category,
          entityId: cat.id,
        });
        nodeIdSet.add(id);

        // Link categories to their topics
        if (showTypes.has('topic')) {
          for (const topicId of cat.topic_ids) {
            const targetId = `topic-${topicId}`;
            if (nodeIdSet.has(targetId)) {
              links.push({
                source: id,
                target: targetId,
                type: 'semantic',
                strength: 0.8,
                label: 'contains',
              });
            }
          }
        }
      }
    }

    // Add page nodes (limited to top domains)
    if (showTypes.has('page') && recentPages) {
      const domainPages = new Map<string, typeof recentPages>();
      for (const page of recentPages.slice(0, 30)) {
        if (!domainPages.has(page.domain)) domainPages.set(page.domain, []);
        domainPages.get(page.domain)!.push(page);
      }

      for (const page of recentPages.slice(0, 30)) {
        const id = `page-${page.id}`;
        nodes.push({
          id,
          label: page.title || page.domain,
          type: 'page',
          size: 3,
          color: entityColors.page,
          entityId: page.id,
        });
        nodeIdSet.add(id);
      }

      // Link pages to topics based on topic.page_ids
      if (showTypes.has('topic') && topics) {
        for (const topic of topics) {
          for (const pageId of topic.page_ids) {
            const sourceId = `page-${pageId}`;
            const targetId = `topic-${topic.id}`;
            if (nodeIdSet.has(sourceId) && nodeIdSet.has(targetId)) {
              links.push({
                source: sourceId,
                target: targetId,
                type: 'semantic',
                strength: 0.5,
              });
            }
          }
        }
      }
    }

    // Add relationship edges
    if (relationships) {
      for (const rel of relationships) {
        const sourceId = `${rel.from_entity_type}-${rel.from_entity_id}`;
        const targetId = `${rel.to_entity_type}-${rel.to_entity_id}`;
        if (nodeIdSet.has(sourceId) && nodeIdSet.has(targetId)) {
          links.push({
            source: sourceId,
            target: targetId,
            type: rel.relationship_type,
            strength: rel.strength,
            label: rel.explanation,
          });
        }
      }
    }

    return { nodes, links };
  }, [topics, categories, relationships, recentPages, showTypes]);

  // Simple force-directed layout rendered on canvas
  const positionsRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(
    new Map(),
  );

  // Handle node click - find the clicked node from canvas coordinates
  const handleCanvasClick = useCallback(
    async (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Find closest node
      let closestNode: GraphNode | null = null;
      let closestDist = Infinity;

      for (const node of graphData.nodes) {
        const pos = positionsRef.current.get(node.id);
        if (!pos) continue;
        const dx = pos.x - x;
        const dy = pos.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = (node.size || 5) + 4; // Extra click tolerance
        if (dist < hitRadius && dist < closestDist) {
          closestNode = node;
          closestDist = dist;
        }
      }

      if (closestNode) {
        setSelectedNode(closestNode);
        setPanelOpen(true);

        // Find connected nodes
        const connectedIds = new Set<string>();
        for (const link of graphData.links) {
          if (link.source === closestNode.id) connectedIds.add(link.target);
          if (link.target === closestNode.id) connectedIds.add(link.source);
        }
        const connectedNodes = graphData.nodes.filter((n) => connectedIds.has(n.id));

        // Load related pages
        const pageNodes = connectedNodes.filter((n) => n.type === 'page');
        const pageIds = pageNodes.map((n) => n.entityId).filter(Boolean) as number[];
        let relatedPages: Page[] = [];
        if (pageIds.length > 0) {
          relatedPages = await pagesRepo.getByIds(pageIds);
        }
        // If the clicked node is itself a page, include it
        if (closestNode.type === 'page' && closestNode.entityId) {
          const selfPage = await pagesRepo.getById(closestNode.entityId);
          if (selfPage && !relatedPages.find((p) => p.id === selfPage.id)) {
            relatedPages.unshift(selfPage);
          }
        }

        // Load related topics
        const topicNodes = connectedNodes.filter((n) => n.type === 'topic');
        const topicIds = topicNodes.map((n) => n.entityId).filter(Boolean) as number[];
        let relatedTopics: Topic[] = [];
        if (topicIds.length > 0) {
          relatedTopics = await topicsRepo.getByIds(topicIds);
        }
        if (closestNode.type === 'topic' && closestNode.entityId) {
          const selfTopic = await topicsRepo.getById(closestNode.entityId);
          if (selfTopic && !relatedTopics.find((t) => t.id === selfTopic.id)) {
            relatedTopics.unshift(selfTopic);
          }
        }

        const detail: NodeDetail = {
          node: closestNode,
          connectedNodes,
          relatedPages: relatedPages.slice(0, 8),
          relatedTopics: relatedTopics.slice(0, 10),
        };
        setNodeDetail(detail);

        // Check for cached summary
        const cached = summaryCache.current.get(closestNode.id);
        if (cached) {
          const currentHash = computeNodeDataHash(detail);
          setSummaryState({
            summary: cached.summary,
            generatedAt: cached.generatedAt,
            loading: false,
            error: null,
            dataHash: cached.dataHash,
            isStale: cached.dataHash !== currentHash,
          });
        } else {
          setSummaryState({
            summary: null,
            generatedAt: null,
            loading: false,
            error: null,
            dataHash: null,
            isStale: false,
          });
        }
      }
    },
    [graphData],
  );

  const handleGenerateNodeSummary = useCallback(async () => {
    if (!nodeDetail || !selectedNode) return;
    setSummaryState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const provider = await getAIProvider();
      if (!provider) {
        setSummaryState((prev) => ({
          ...prev,
          loading: false,
          error: 'AI is not configured. Enable AI in Settings and add your API key.',
        }));
        return;
      }

      const pagesText = nodeDetail.relatedPages
        .map((p) => `- "${p.title}" (${p.domain})`)
        .join('\n');
      const topicsText = nodeDetail.relatedTopics.map((t) => t.name).join(', ');
      const connectionsText = nodeDetail.connectedNodes
        .map((n) => `${n.type}: ${n.label}`)
        .join(', ');

      const prompt = `Summarize this knowledge graph node and its connections:

Node: "${nodeDetail.node.label}" (Type: ${nodeDetail.node.type})
Connected entities (${nodeDetail.connectedNodes.length}): ${connectionsText}

Related Pages (${nodeDetail.relatedPages.length}):
${pagesText || 'None'}

Related Topics: ${topicsText || 'None'}

Provide a concise 2-3 sentence summary of what this node represents in the user's browsing knowledge, its key connections, and any notable patterns.`;

      const response = await provider.complete(prompt, {
        systemPrompt:
          'You are a personal knowledge assistant analyzing a browsing knowledge graph. Be concise, insightful, and helpful. Respond with just the summary text, no JSON.',
        maxTokens: 300,
        temperature: 0.5,
      });

      const now = Date.now();
      const hash = computeNodeDataHash(nodeDetail);

      // Cache it
      summaryCache.current.set(selectedNode.id, {
        summary: response,
        generatedAt: now,
        dataHash: hash,
      });

      setSummaryState({
        summary: response,
        generatedAt: now,
        loading: false,
        error: null,
        dataHash: hash,
        isStale: false,
      });
    } catch (err: any) {
      setSummaryState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to generate summary',
      }));
    }
  }, [nodeDetail, selectedNode]);

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedNode(null);
    setNodeDetail(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      setDimensions({ width: rect.width, height: Math.max(500, rect.height - 20) });
    }
  }, [panelOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || graphData.nodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Initialize positions
    const positions = positionsRef.current;
    for (const node of graphData.nodes) {
      if (!positions.has(node.id)) {
        positions.set(node.id, {
          x: width / 2 + (Math.random() - 0.5) * width * 0.6,
          y: height / 2 + (Math.random() - 0.5) * height * 0.6,
          vx: 0,
          vy: 0,
        });
      }
    }

    // Remove stale
    for (const key of positions.keys()) {
      if (!graphData.nodes.find((n) => n.id === key)) {
        positions.delete(key);
      }
    }

    let animFrame: number;
    let iteration = 0;

    function simulate() {
      if (!ctx) return;
      iteration++;
      const alpha = Math.max(0.001, 1 - iteration / 300);

      // Repulsion
      const nodeList = graphData.nodes;
      for (let i = 0; i < nodeList.length; i++) {
        for (let j = i + 1; j < nodeList.length; j++) {
          const a = positions.get(nodeList[i].id)!;
          const b = positions.get(nodeList[j].id)!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const force = (80 * alpha) / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // Attraction
      for (const link of graphData.links) {
        const a = positions.get(link.source);
        const b = positions.get(link.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = (dist - 80) * 0.01 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Center gravity
      for (const node of nodeList) {
        const pos = positions.get(node.id)!;
        pos.vx += (width / 2 - pos.x) * 0.001 * alpha;
        pos.vy += (height / 2 - pos.y) * 0.001 * alpha;
      }

      // Apply velocity with damping
      for (const node of nodeList) {
        const pos = positions.get(node.id)!;
        pos.vx *= 0.9;
        pos.vy *= 0.9;
        pos.x += pos.vx;
        pos.y += pos.vy;
        pos.x = Math.max(20, Math.min(width - 20, pos.x));
        pos.y = Math.max(20, Math.min(height - 20, pos.y));
      }

      // Draw
      ctx.clearRect(0, 0, width, height);

      // Draw links
      ctx.lineWidth = 0.5;
      for (const link of graphData.links) {
        const a = positions.get(link.source);
        const b = positions.get(link.target);
        if (!a || !b) continue;

        // Highlight links connected to selected node
        const isSelected =
          selectedNode &&
          (link.source === selectedNode.id || link.target === selectedNode.id);
        ctx.strokeStyle = isSelected
          ? `rgba(92, 124, 250, ${0.5 + link.strength * 0.5})`
          : `rgba(173, 181, 189, ${0.3 + link.strength * 0.4})`;
        ctx.lineWidth = isSelected ? 1.5 : 0.5;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodeList) {
        const pos = positions.get(node.id)!;
        const size = node.size || 5;
        const isSelected = selectedNode?.id === node.id;

        // Selected glow
        if (isSelected) {
          ctx.fillStyle = `${node.color || '#adb5bd'}40`;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size + 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = node.color || '#adb5bd';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size + 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = node.color || '#adb5bd';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Label
        if (size >= 4) {
          ctx.fillStyle = '#495057';
          ctx.font = `${isSelected ? 'bold ' : ''}10px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          const label =
            node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label;
          ctx.fillText(label, pos.x, pos.y + size + 12);
        }
      }

      if (iteration < 300) {
        animFrame = requestAnimationFrame(simulate);
      }
    }

    simulate();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [graphData, dimensions, selectedNode]);

  return (
    <div>
      <Header
        title="Graph View"
        subtitle="Explore connections between your browsing entities"
      />

      <div className="p-6">
        {/* Filter bar */}
        <Card className="mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-surface-500">
              <Filter className="h-3.5 w-3.5" />
              Show:
            </div>
            {(Object.entries(entityLabels) as [EntityType, string][]).map(
              ([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  aria-pressed={showTypes.has(type)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-[background-color,color] duration-150 ease-[var(--ease-out-cubic)] ${
                    showTypes.has(type)
                      ? 'bg-surface-100 text-surface-700'
                      : 'text-surface-400 hover:text-surface-600'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: showTypes.has(type) ? entityColors[type] : '#dee2e6',
                    }}
                  />
                  {label}
                </button>
              ),
            )}

            <div className="ml-auto text-xs text-surface-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {graphData.nodes.length} nodes &middot; {graphData.links.length} edges
            </div>
          </div>
        </Card>

        {/* Graph canvas + right panel */}
        <div className="flex gap-4">
          {/* Graph canvas */}
          <div className={`flex-1 transition-[max-width] duration-200 ease-[var(--ease-out-cubic)] ${panelOpen ? 'max-w-[calc(100%-380px)]' : ''}`}>
            {graphData.nodes.length === 0 ? (
              <EmptyState
                icon={<GitFork className="h-12 w-12" />}
                title="No graph data yet"
                description="Browse the web and relationships will be visualized here"
              />
            ) : (
              <Card className="p-0 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  role="img"
                  aria-label="Knowledge graph visualization showing connections between browsing entities"
                  style={{ width: dimensions.width, height: dimensions.height, cursor: 'crosshair', touchAction: 'none' }}
                  className="w-full"
                />
              </Card>
            )}
          </div>

          {/* Right Panel */}
          {panelOpen && nodeDetail && (
            <div className="w-[360px] shrink-0 animate-slide-in-right" style={{ zIndex: 'var(--z-panel)' }}>
              <Card className="sticky top-6 max-h-[calc(100vh-180px)] overflow-y-auto">
                {/* Panel header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: entityColors[nodeDetail.node.type] }}
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-surface-900 truncate">
                        {nodeDetail.node.label}
                      </h3>
                      <p className="text-[10px] text-surface-400 capitalize">
                        {nodeDetail.node.type === 'knowledge_box' ? 'Constellation' : nodeDetail.node.type}
                        {' '}&middot; {nodeDetail.connectedNodes.length} connections
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closePanel}
                    aria-label="Close detail panel"
                    className="p-1 rounded text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-[background-color,color] duration-150 ease-[var(--ease-out-cubic)] min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Related Pages */}
                {nodeDetail.relatedPages.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-surface-500 mb-2">
                      <Globe className="h-3 w-3" />
                      Related Pages ({nodeDetail.relatedPages.length})
                    </div>
                    <div className="space-y-1">
                      {nodeDetail.relatedPages.map((page) => (
                        <a
                          key={page.id}
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-surface-600 hover:bg-surface-50 transition-[background-color] duration-150 ease-[var(--ease-out-cubic)] group"
                        >
                          {page.favicon ? (
                            <img src={page.favicon} alt="" className="h-3 w-3 rounded-sm shrink-0" />
                          ) : (
                            <Globe className="h-3 w-3 text-surface-300 shrink-0" />
                          )}
                          <span className="truncate flex-1">{page.title || page.domain}</span>
                          <ExternalLink className="h-2.5 w-2.5 text-surface-300 opacity-0 group-hover:opacity-100 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Topics */}
                {nodeDetail.relatedTopics.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-surface-500 mb-2">
                      <Tag className="h-3 w-3" />
                      Related Topics
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {nodeDetail.relatedTopics.map((topic) => (
                        <Badge key={topic.id} variant="primary">
                          {topic.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected Entities */}
                {nodeDetail.connectedNodes.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-surface-500 mb-2">
                      <Layers className="h-3 w-3" />
                      Connected Entities
                    </div>
                    <div className="space-y-1">
                      {nodeDetail.connectedNodes.slice(0, 6).map((n) => (
                        <div
                          key={n.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-surface-600"
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: entityColors[n.type] }}
                          />
                          <span className="truncate">{n.label}</span>
                          <span className="text-[10px] text-surface-400 capitalize shrink-0">
                            {n.type === 'knowledge_box' ? 'constellation' : n.type}
                          </span>
                        </div>
                      ))}
                      {nodeDetail.connectedNodes.length > 6 && (
                        <p className="text-[10px] text-surface-400 px-2">
                          +{nodeDetail.connectedNodes.length - 6} more
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                {aiAvailable && (
                  <div className="border-t border-surface-100 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-surface-500">
                        <Sparkles className="h-3 w-3 text-violet-500" />
                        AI Summary
                      </div>
                      {summaryState.summary && (
                        <button
                          type="button"
                          onClick={handleGenerateNodeSummary}
                          disabled={summaryState.loading}
                          aria-label="Regenerate AI summary"
                          className="flex items-center gap-1 text-[10px] text-surface-400 hover:text-surface-600 transition-[color] duration-150 ease-[var(--ease-out-cubic)]"
                        >
                          <RefreshCw className={`h-2.5 w-2.5 ${summaryState.loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                          Regenerate
                        </button>
                      )}
                    </div>

                    {/* Stale warning */}
                    {summaryState.summary && summaryState.isStale && (
                      <div className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5 mb-2">
                        <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                        <p className="text-[10px] text-amber-700 flex-1">
                          Graph data has changed since this summary.
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateNodeSummary}
                          disabled={summaryState.loading}
                          aria-label="Update stale summary"
                          className="text-[10px] font-medium text-amber-700 hover:text-amber-800 whitespace-nowrap"
                        >
                          Update
                        </button>
                      </div>
                    )}

                    {summaryState.summary ? (
                      <div>
                        <p className="text-xs text-surface-600 leading-relaxed">
                          {summaryState.summary}
                        </p>
                        {summaryState.generatedAt && (
                          <p className="flex items-center gap-1 text-[10px] text-surface-400 mt-1.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(summaryState.generatedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleGenerateNodeSummary}
                        disabled={summaryState.loading}
                        className="w-full"
                      >
                        <Sparkles className={`h-3 w-3 ${summaryState.loading ? 'animate-pulse' : ''}`} />
                        {summaryState.loading ? 'Generating...' : 'Generate AI Summary'}
                      </Button>
                    )}

                    {summaryState.error && (
                      <p className="text-[10px] text-error mt-1.5">{summaryState.error}</p>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4">
          {(Object.entries(entityLabels) as [EntityType, string][])
            .filter(([type]) => showTypes.has(type))
            .map(([type, label]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-surface-500">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entityColors[type] }}
                />
                {label}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
