// ============================================================
// Nebula Execution Engine
// Runs a nebula workflow by topologically sorting the node graph
// and executing each node in dependency order.
// ============================================================

import type { AIProvider } from '../interface';
import type {
  Nebula,
  NebulaNodeDef,
  NebulaEdgeDef,
  DataSourceConfig,
  UserInputConfig,
  AIProcessConfig,
  TransformConfig,
  OutputConfig,
} from '../../shared/types';
import { db } from '../../db/index';
import { nebulaRunsRepo } from '../../db/repositories/nebulaRuns';
import { artifactsRepo } from '../../db/repositories/artifacts';
import { getAIProvider } from '../manager';

export interface ExecutionCallbacks {
  onNodeStart?: (nodeId: string, label: string) => void;
  onNodeComplete?: (nodeId: string, label: string) => void;
  onError?: (nodeId: string, error: string) => void;
}

/**
 * Execute a nebula workflow, producing an artifact.
 * Returns the run ID.
 */
export async function executeNebula(
  nebula: Nebula,
  userInputs: Record<string, unknown>,
  callbacks?: ExecutionCallbacks,
): Promise<number> {
  if (!nebula.id) throw new Error('Nebula must be saved before execution');

  // Create the run record
  const runId = await nebulaRunsRepo.create({
    nebula_id: nebula.id,
    status: 'pending',
    inputs: userInputs,
    created_at: Date.now(),
  });

  try {
    await nebulaRunsRepo.setStatus(runId, 'running', { started_at: Date.now() });

    // Get AI provider (may be null if not configured)
    const provider = await getAIProvider();

    // Topological sort
    const sortedNodeIds = topologicalSort(nebula.nodes, nebula.edges);

    // Execute nodes in order, collecting intermediate results
    const nodeResults: Record<string, string> = {};
    let artifactContent = '';
    let artifactTitle = '';
    let artifactFormat: 'markdown' | 'plain_text' = 'markdown';
    const sourcePagesCollected: number[] = [];
    const sourceTopicsCollected: number[] = [];

    for (const nodeId of sortedNodeIds) {
      const node = nebula.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const nodeLabel = (node.data as { label: string }).label || node.id;
      callbacks?.onNodeStart?.(nodeId, nodeLabel);

      try {
        const result = await executeNode(
          node,
          nebula.edges,
          nodeResults,
          userInputs,
          provider,
          sourcePagesCollected,
          sourceTopicsCollected,
        );
        nodeResults[nodeId] = result;

        // If this is the output node, capture the artifact info
        if (node.type === 'output') {
          const outputData = node.data as OutputConfig;
          artifactFormat = outputData.format;
          artifactTitle = resolveTemplate(
            outputData.artifact_title_template || 'Nebula Output',
            nodeResults,
            userInputs,
          );
          // The output node's result is the content from its upstream
          const upstreamEdges = nebula.edges.filter((e) => e.target === nodeId);
          if (upstreamEdges.length > 0) {
            artifactContent = nodeResults[upstreamEdges[0].source] || result;
          } else {
            artifactContent = result;
          }
        }

        callbacks?.onNodeComplete?.(nodeId, nodeLabel);
      } catch (err: any) {
        const errMsg = err?.message || 'Node execution failed';
        callbacks?.onError?.(nodeId, errMsg);
        throw new Error(`Node "${nodeLabel}" failed: ${errMsg}`);
      }
    }

    // Create artifact
    await artifactsRepo.create({
      run_id: runId,
      nebula_id: nebula.id,
      title: artifactTitle,
      content: artifactContent,
      format: artifactFormat,
      source_page_ids: [...new Set(sourcePagesCollected)],
      source_topic_ids: [...new Set(sourceTopicsCollected)],
      created_at: Date.now(),
    });

    // Mark run complete
    await nebulaRunsRepo.setStatus(runId, 'completed', {
      completed_at: Date.now(),
      node_results: nodeResults,
    });

    return runId;
  } catch (err: any) {
    await nebulaRunsRepo.setStatus(runId, 'failed', {
      completed_at: Date.now(),
      error: err?.message || 'Execution failed',
    });
    throw err;
  }
}

// ------------------------------------------------------------------
// Node execution dispatcher
// ------------------------------------------------------------------

async function executeNode(
  node: NebulaNodeDef,
  edges: NebulaEdgeDef[],
  nodeResults: Record<string, string>,
  userInputs: Record<string, unknown>,
  provider: AIProvider | null,
  sourcePagesCollected: number[],
  sourceTopicsCollected: number[],
): Promise<string> {
  switch (node.type) {
    case 'data-source':
      return executeDataSource(
        node.data as DataSourceConfig,
        sourcePagesCollected,
        sourceTopicsCollected,
      );
    case 'user-input':
      return executeUserInput(node.id, node.data as UserInputConfig, userInputs);
    case 'ai-process':
      return executeAIProcess(node, edges, nodeResults, userInputs, provider);
    case 'transform':
      return executeTransform(node, edges, nodeResults);
    case 'output':
      return executeOutput(node, edges, nodeResults);
    default:
      return '';
  }
}

// ------------------------------------------------------------------
// Data source execution
// ------------------------------------------------------------------

async function executeDataSource(
  config: DataSourceConfig,
  sourcePagesCollected: number[],
  sourceTopicsCollected: number[],
): Promise<string> {
  switch (config.source_type) {
    case 'pages': {
      // Boolean values aren't valid IndexedDB keys — fetch all then filter
      const allPages = await db.pages.orderBy('last_seen_at').reverse().toArray();
      const pages = allPages.filter((p) => !p.excluded);
      const limited = config.filters?.limit ? pages.slice(0, config.filters.limit) : pages;
      sourcePagesCollected.push(...limited.map((p) => p.id!).filter(Boolean));
      return limited
        .map(
          (p) =>
            `- [${p.title}](${p.url}) (${p.domain}) — visited ${new Date(p.last_seen_at).toLocaleDateString()}${p.ai_summary ? ` | Summary: ${p.ai_summary}` : ''}${p.metadata?.description ? ` | ${p.metadata.description}` : ''}`,
        )
        .join('\n');
    }
    case 'topics': {
      const topics = await db.topics.orderBy('updated_at').reverse().toArray();
      const limited = config.filters?.limit ? topics.slice(0, config.filters.limit) : topics;
      sourceTopicsCollected.push(...limited.map((t) => t.id!).filter(Boolean));
      return limited
        .map(
          (t) =>
            `- **${t.name}** (${t.lifecycle_state}): ${t.description} [${t.page_ids.length} pages]`,
        )
        .join('\n');
    }
    case 'highlights': {
      const highlights = await db.highlights.orderBy('timestamp').reverse().toArray();
      const limited = config.filters?.limit ? highlights.slice(0, config.filters.limit) : highlights;
      return limited
        .map((h) => `- "${h.text}" (page #${h.page_id})`)
        .join('\n');
    }
    case 'categories': {
      const categories = await db.categories.orderBy('updated_at').reverse().toArray();
      return categories
        .map((c) => `- **${c.name}**: ${c.description} [trend: ${c.trend}, ${c.topic_ids.length} topics]`)
        .join('\n');
    }
    case 'concepts': {
      const concepts = await db.concepts.orderBy('created_at').reverse().toArray();
      const limited = config.filters?.limit ? concepts.slice(0, config.filters.limit) : concepts;
      return limited
        .map((c) => `- **${c.label}**: ${c.explanation}`)
        .join('\n');
    }
    default:
      return '(no data)';
  }
}

// ------------------------------------------------------------------
// User input execution
// ------------------------------------------------------------------

function executeUserInput(
  nodeId: string,
  config: UserInputConfig,
  userInputs: Record<string, unknown>,
): string {
  const value = userInputs[nodeId];
  if (value !== undefined && value !== null) return String(value);
  if (config.default_value) return config.default_value;
  if (config.required) throw new Error(`Required input "${config.label}" was not provided`);
  return '';
}

// ------------------------------------------------------------------
// AI process execution
// ------------------------------------------------------------------

async function executeAIProcess(
  node: NebulaNodeDef,
  edges: NebulaEdgeDef[],
  nodeResults: Record<string, string>,
  userInputs: Record<string, unknown>,
  provider: AIProvider | null,
): Promise<string> {
  if (!provider) {
    throw new Error('AI is not configured. Enable an AI provider in Settings to run this nebula.');
  }

  const config = node.data as AIProcessConfig;

  // Resolve the prompt template by replacing {{nodeId}} placeholders
  const resolvedPrompt = resolveTemplate(config.prompt_template, nodeResults, userInputs);

  const result = await provider.complete(resolvedPrompt, {
    temperature: config.temperature ?? 0.5,
    maxTokens: config.max_tokens ?? 3000,
    systemPrompt:
      'You are a knowledgeable assistant helping a user generate content based on their browsing research and inputs. Follow the instructions carefully and produce high-quality output.',
  });

  return result;
}

// ------------------------------------------------------------------
// Transform execution
// ------------------------------------------------------------------

function executeTransform(
  node: NebulaNodeDef,
  edges: NebulaEdgeDef[],
  nodeResults: Record<string, string>,
): string {
  const config = node.data as TransformConfig;
  const upstreamEdges = edges.filter((e) => e.target === node.id);
  const upstreamResults = upstreamEdges.map((e) => nodeResults[e.source] || '');

  switch (config.transform_type) {
    case 'merge':
      return upstreamResults.join('\n\n---\n\n');
    case 'filter': {
      // Simple keyword filter — keep lines containing the keyword
      const keyword = (config.config?.keyword as string) || '';
      if (!keyword) return upstreamResults.join('\n');
      return upstreamResults
        .join('\n')
        .split('\n')
        .filter((line) => line.toLowerCase().includes(keyword.toLowerCase()))
        .join('\n');
    }
    case 'format': {
      // Wrap content with a header/footer
      const header = (config.config?.header as string) || '';
      const footer = (config.config?.footer as string) || '';
      return [header, ...upstreamResults, footer].filter(Boolean).join('\n\n');
    }
    case 'extract': {
      // Extract first N lines
      const lines = Number(config.config?.lines) || 20;
      return upstreamResults.join('\n').split('\n').slice(0, lines).join('\n');
    }
    default:
      return upstreamResults.join('\n');
  }
}

// ------------------------------------------------------------------
// Output execution
// ------------------------------------------------------------------

function executeOutput(
  node: NebulaNodeDef,
  edges: NebulaEdgeDef[],
  nodeResults: Record<string, string>,
): string {
  // Just pass through the upstream content
  const upstreamEdges = edges.filter((e) => e.target === node.id);
  if (upstreamEdges.length > 0) {
    return nodeResults[upstreamEdges[0].source] || '';
  }
  return '';
}

// ------------------------------------------------------------------
// Utilities
// ------------------------------------------------------------------

/** Replace {{nodeId}} placeholders with node results or user inputs */
function resolveTemplate(
  template: string,
  nodeResults: Record<string, string>,
  userInputs: Record<string, unknown>,
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
    const trimmed = key.trim();
    // Check node results first, then user inputs
    if (trimmed in nodeResults) return nodeResults[trimmed];
    if (trimmed in userInputs) return String(userInputs[trimmed]);
    return `(${trimmed}: not available)`;
  });
}

/** Topological sort using Kahn's algorithm */
function topologicalSort(nodes: NebulaNodeDef[], edges: NebulaEdgeDef[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  // Build graph
  for (const edge of edges) {
    const prev = inDegree.get(edge.target) ?? 0;
    inDegree.set(edge.target, prev + 1);
    adjacency.get(edge.source)?.push(edge.target);
  }

  // Collect nodes with in-degree 0
  const queue: string[] = [];
  for (const [nodeId, deg] of inDegree) {
    if (deg === 0) queue.push(nodeId);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) || []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // If not all nodes are sorted, there's a cycle
  if (sorted.length !== nodes.length) {
    throw new Error('Workflow contains a cycle — cannot execute');
  }

  return sorted;
}
