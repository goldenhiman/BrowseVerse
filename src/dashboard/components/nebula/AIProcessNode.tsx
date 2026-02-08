import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Sparkles } from 'lucide-react';
import type { AIProcessConfig } from '../../../shared/types';

function AIProcessNodeComponent({ data, selected }: NodeProps) {
  const config = data as unknown as AIProcessConfig;
  const promptPreview = config.prompt_template
    ? config.prompt_template.slice(0, 60) + (config.prompt_template.length > 60 ? '...' : '')
    : 'No prompt configured';

  return (
    <div
      className={`rounded-xl bg-white px-4 py-3 min-w-[200px] max-w-[260px] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] transition-[box-shadow] duration-150 ease-[var(--ease-out-cubic)] ${selected ? 'shadow-[0_0_0_2px_var(--color-primary-400),0_4px_12px_rgba(92,124,250,0.2)]' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-violet-500 !border-2 !border-white"
      />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50">
          <Sparkles className="h-3.5 w-3.5 text-violet-600" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-violet-600">
          AI Process
        </span>
      </div>
      <p className="text-xs font-semibold text-surface-900 truncate">{config.label}</p>
      <p className="text-[10px] text-surface-400 mt-0.5 line-clamp-2">{promptPreview}</p>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-violet-500 !border-2 !border-white"
      />
    </div>
  );
}

export const AIProcessNode = memo(AIProcessNodeComponent);
