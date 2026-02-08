import React from 'react';
import {
  Database,
  TextCursorInput,
  Sparkles,
  Shuffle,
  FileOutput,
} from 'lucide-react';
import type { NebulaNodeType } from '../../../shared/types';

interface PaletteItem {
  type: NebulaNodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const paletteItems: PaletteItem[] = [
  {
    type: 'data-source',
    label: 'Data Source',
    description: 'Pull from your browsing data',
    icon: <Database className="h-4 w-4" />,
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    type: 'user-input',
    label: 'User Input',
    description: 'Collect input at run time',
    icon: <TextCursorInput className="h-4 w-4" />,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    type: 'ai-process',
    label: 'AI Process',
    description: 'Generate content with AI',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-violet-600 bg-violet-50',
  },
  {
    type: 'transform',
    label: 'Transform',
    description: 'Merge, filter, or format data',
    icon: <Shuffle className="h-4 w-4" />,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    type: 'output',
    label: 'Output',
    description: 'Produce the final artifact',
    icon: <FileOutput className="h-4 w-4" />,
    color: 'text-rose-600 bg-rose-50',
  },
];

interface NodePaletteProps {
  onAddNode: (type: NebulaNodeType) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const onDragStart = (event: React.DragEvent, nodeType: NebulaNodeType) => {
    event.dataTransfer.setData('application/nebula-node-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 px-1 mb-2">
        Nodes
      </h3>
      {paletteItems.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => onDragStart(e, item.type)}
          onClick={() => onAddNode(item.type)}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-grab active:cursor-grabbing hover:bg-surface-50 transition-[background-color] duration-150 ease-[var(--ease-out-cubic)]"
        >
          <div className={`flex h-7 w-7 items-center justify-center rounded-md ${item.color}`}>
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-surface-800">{item.label}</p>
            <p className="text-[10px] text-surface-400 truncate">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
