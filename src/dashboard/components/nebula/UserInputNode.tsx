import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TextCursorInput } from 'lucide-react';
import type { UserInputConfig } from '../../../shared/types';

function UserInputNodeComponent({ data, selected }: NodeProps) {
  const config = data as unknown as UserInputConfig;

  return (
    <div
      className={`rounded-xl bg-white px-4 py-3 min-w-[180px] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] transition-[box-shadow] duration-150 ease-[var(--ease-out-cubic)] ${selected ? 'shadow-[0_0_0_2px_var(--color-primary-400),0_4px_12px_rgba(92,124,250,0.2)]' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
          <TextCursorInput className="h-3.5 w-3.5 text-blue-600" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-blue-600">
          User Input
        </span>
      </div>
      <p className="text-xs font-semibold text-surface-900 truncate">{config.label}</p>
      <p className="text-[10px] text-surface-500 mt-0.5">
        {config.input_type}
        {config.required ? ' (required)' : ''}
      </p>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-white"
      />
    </div>
  );
}

export const UserInputNode = memo(UserInputNodeComponent);
