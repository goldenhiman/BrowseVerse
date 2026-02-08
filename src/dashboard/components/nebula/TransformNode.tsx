import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Shuffle } from 'lucide-react';
import type { TransformConfig } from '../../../shared/types';

const transformLabels: Record<string, string> = {
  merge: 'Merge',
  filter: 'Filter',
  format: 'Format',
  extract: 'Extract',
};

function TransformNodeComponent({ data, selected }: NodeProps) {
  const config = data as unknown as TransformConfig;

  return (
    <div
      className={`rounded-xl bg-white px-4 py-3 min-w-[180px] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] transition-[box-shadow] duration-150 ease-[var(--ease-out-cubic)] ${selected ? 'shadow-[0_0_0_2px_var(--color-primary-400),0_4px_12px_rgba(92,124,250,0.2)]' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white"
      />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50">
          <Shuffle className="h-3.5 w-3.5 text-amber-600" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-amber-600">
          Transform
        </span>
      </div>
      <p className="text-xs font-semibold text-surface-900 truncate">{config.label}</p>
      <p className="text-[10px] text-surface-500 mt-0.5">
        {transformLabels[config.transform_type] || config.transform_type}
      </p>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white"
      />
    </div>
  );
}

export const TransformNode = memo(TransformNodeComponent);
