import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  type Connection,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '../components/shared/Button';
import { NodePalette } from '../components/nebula/NodePalette';
import { NodeConfigPanel } from '../components/nebula/NodeConfigPanel';
import { DataSourceNode } from '../components/nebula/DataSourceNode';
import { UserInputNode } from '../components/nebula/UserInputNode';
import { AIProcessNode } from '../components/nebula/AIProcessNode';
import { TransformNode } from '../components/nebula/TransformNode';
import { OutputNode } from '../components/nebula/OutputNode';

import { useNebulaById } from '../hooks/useNebulas';
import { nebulasRepo } from '../../db/repositories/nebulas';
import type {
  NebulaNodeType,
  NebulaNodeDef,
  NebulaEdgeDef,
} from '../../shared/types';

import {
  ArrowLeft,
  Save,
  Play,
} from 'lucide-react';

// Convenience alias for the data payload ReactFlow expects
type RFNode = Node<Record<string, unknown>>;
type RFEdge = Edge;

// Register custom node types
const nodeTypes = {
  'data-source': DataSourceNode,
  'user-input': UserInputNode,
  'ai-process': AIProcessNode,
  transform: TransformNode,
  output: OutputNode,
};

const defaultEdgeStyle = { stroke: '#94a3b8', strokeWidth: 1.5 };

// Default data for each node type
function getDefaultNodeData(type: NebulaNodeType): Record<string, unknown> {
  switch (type) {
    case 'data-source':
      return { label: 'Data Source', source_type: 'pages', filters: {} };
    case 'user-input':
      return { label: 'User Input', input_type: 'text', placeholder: '', required: true };
    case 'ai-process':
      return { label: 'AI Process', prompt_template: '', temperature: 0.5, max_tokens: 3000 };
    case 'transform':
      return { label: 'Transform', transform_type: 'merge', config: {} };
    case 'output':
      return { label: 'Output', format: 'markdown', artifact_title_template: '' };
  }
}

let nodeIdCounter = 0;

export default function NebulaEditor() {
  const { id } = useParams<{ id: string }>();
  const nebulaId = id ? parseInt(id, 10) : undefined;
  const nebula = useNebulaById(nebulaId);
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nebulaName, setNebulaName] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance<RFNode, RFEdge> | null>(null);

  // Load nebula data into the editor when it becomes available
  useEffect(() => {
    if (nebula && !initialized) {
      setNebulaName(nebula.name);

      // Convert NebulaNodeDef[] -> RFNode[]
      const rfNodes: RFNode[] = nebula.nodes.map((n: NebulaNodeDef) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data as unknown as Record<string, unknown>,
      }));

      // Convert NebulaEdgeDef[] -> RFEdge[]
      const rfEdges: RFEdge[] = nebula.edges.map((e: NebulaEdgeDef) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        animated: true,
        style: defaultEdgeStyle,
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);

      // Set counter above max existing ID number
      const maxNum = nebula.nodes.reduce((max, n) => {
        const match = n.id.match(/(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      nodeIdCounter = maxNum + 1;

      setInitialized(true);
    }
  }, [nebula, initialized, setNodes, setEdges]);

  // Connect edges
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: defaultEdgeStyle }, eds),
      );
    },
    [setEdges],
  );

  // Add node from palette
  const handleAddNode = useCallback(
    (type: NebulaNodeType) => {
      const nodeId = `${type}-${nodeIdCounter++}`;
      const viewport = reactFlowInstance.current?.getViewport();
      const position = {
        x: (viewport ? -viewport.x / (viewport.zoom || 1) : 0) + 250,
        y: (viewport ? -viewport.y / (viewport.zoom || 1) : 0) + 200,
      };

      const newNode: RFNode = {
        id: nodeId,
        type,
        position,
        data: getDefaultNodeData(type),
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(nodeId);
    },
    [setNodes],
  );

  // Handle drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/nebula-node-type') as NebulaNodeType;
      if (!type) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds || !reactFlowInstance.current) return;

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const nodeId = `${type}-${nodeIdCounter++}`;
      const newNode: RFNode = {
        id: nodeId,
        type,
        position,
        data: getDefaultNodeData(type),
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(nodeId);
    },
    [setNodes],
  );

  // Node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: RFNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Update node data from config panel
  const handleUpdateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n)),
      );
    },
    [setNodes],
  );

  // Delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(null);
    },
    [setNodes, setEdges],
  );

  // Save
  const handleSave = useCallback(async () => {
    if (!nebulaId) return;
    setSaving(true);
    try {
      const nebulaNodes: NebulaNodeDef[] = nodes.map((n) => ({
        id: n.id,
        type: n.type as NebulaNodeType,
        position: n.position,
        data: n.data as unknown as NebulaNodeDef['data'],
      }));
      const nebulaEdges: NebulaEdgeDef[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined,
      }));
      const viewport = reactFlowInstance.current?.getViewport();
      await nebulasRepo.update(nebulaId, {
        name: nebulaName,
        nodes: nebulaNodes,
        edges: nebulaEdges,
        viewport: viewport
          ? { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
          : undefined,
      });
    } finally {
      setSaving(false);
    }
  }, [nebulaId, nebulaName, nodes, edges]);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  if (!nebula) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-surface-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-200 bg-white shrink-0">
        <button
          onClick={() => navigate('/nebulas')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-50 transition-[background-color,color] duration-150"
          aria-label="Back to nebulas"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-lg mr-1">{nebula.icon}</span>
        <input
          type="text"
          value={nebulaName}
          onChange={(e) => setNebulaName(e.target.value)}
          className="text-sm font-semibold text-surface-900 bg-transparent border-none outline-none focus:ring-0 min-w-[120px]"
          placeholder="Nebula name"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              await handleSave();
              navigate(`/nebulas/${nebulaId}/run`);
            }}
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
        </div>
      </div>

      {/* Main editor */}
      <div className="flex flex-1 min-h-0">
        {/* Left palette */}
        <div className="w-52 border-r border-surface-200 bg-white p-3 shrink-0 overflow-y-auto">
          <NodePalette onAddNode={handleAddNode} />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={(instance: ReactFlowInstance<RFNode, RFEdge>) => {
              reactFlowInstance.current = instance;
            }}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#94a3b8', strokeWidth: 1.5 },
            }}
          >
            <Controls
              position="bottom-left"
              showInteractive={false}
              className="!shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.08)] !rounded-lg !border-none"
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
          </ReactFlow>
        </div>

        {/* Right config panel */}
        {selectedNode && (
          <div className="w-72 border-l border-surface-200 bg-white shrink-0 overflow-y-auto">
            <NodeConfigPanel
              node={{
                id: selectedNode.id,
                type: selectedNode.type as NebulaNodeType,
                position: selectedNode.position,
                data: selectedNode.data as unknown as NebulaNodeDef['data'],
              }}
              onUpdate={handleUpdateNodeData}
              onClose={() => setSelectedNodeId(null)}
              onDelete={handleDeleteNode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
