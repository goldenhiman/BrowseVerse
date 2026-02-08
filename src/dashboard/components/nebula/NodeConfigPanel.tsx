import React from 'react';
import { X } from 'lucide-react';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import type {
  NebulaNodeDef,
  DataSourceConfig,
  UserInputConfig,
  AIProcessConfig,
  TransformConfig,
  OutputConfig,
} from '../../../shared/types';

interface NodeConfigPanelProps {
  node: NebulaNodeDef;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose, onDelete }: NodeConfigPanelProps) {
  const data = node.data as unknown as Record<string, unknown>;

  const updateField = (field: string, value: unknown) => {
    onUpdate(node.id, { ...data, [field]: value });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
        <h3 className="text-sm font-semibold text-surface-900">Configure Node</h3>
        <button
          onClick={onClose}
          className="p-1 rounded text-surface-400 hover:text-surface-600 transition-[color] duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Common: Label */}
        <Input
          label="Label"
          value={(data.label as string) || ''}
          onChange={(e) => updateField('label', e.target.value)}
        />

        {/* Type-specific config */}
        {node.type === 'data-source' && (
          <DataSourceFields data={data as unknown as DataSourceConfig} updateField={updateField} />
        )}
        {node.type === 'user-input' && (
          <UserInputFields data={data as unknown as UserInputConfig} updateField={updateField} />
        )}
        {node.type === 'ai-process' && (
          <AIProcessFields data={data as unknown as AIProcessConfig} updateField={updateField} />
        )}
        {node.type === 'transform' && (
          <TransformFields data={data as unknown as TransformConfig} updateField={updateField} />
        )}
        {node.type === 'output' && (
          <OutputFields data={data as unknown as OutputConfig} updateField={updateField} />
        )}
      </div>

      <div className="border-t border-surface-200 px-4 py-3">
        <Button variant="danger" size="sm" onClick={() => onDelete(node.id)} className="w-full">
          Delete Node
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Type-specific config forms
// ------------------------------------------------------------------

function DataSourceFields({
  data,
  updateField,
}: {
  data: DataSourceConfig;
  updateField: (field: string, value: unknown) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">Source Type</label>
        <select
          value={data.source_type || 'pages'}
          onChange={(e) => updateField('source_type', e.target.value)}
          className="w-full rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm text-surface-900 focus:border-primary-400 focus:outline-none"
        >
          <option value="pages">Pages</option>
          <option value="topics">Topics</option>
          <option value="highlights">Highlights</option>
          <option value="categories">Categories</option>
          <option value="concepts">Concepts</option>
        </select>
      </div>
      <Input
        label="Limit (optional)"
        type="number"
        value={data.filters?.limit?.toString() || ''}
        onChange={(e) => {
          const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
          updateField('filters', { ...data.filters, limit: val });
        }}
        placeholder="e.g., 30"
      />
    </>
  );
}

function UserInputFields({
  data,
  updateField,
}: {
  data: UserInputConfig;
  updateField: (field: string, value: unknown) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">Input Type</label>
        <select
          value={data.input_type || 'text'}
          onChange={(e) => updateField('input_type', e.target.value)}
          className="w-full rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm text-surface-900 focus:border-primary-400 focus:outline-none"
        >
          <option value="text">Text</option>
          <option value="textarea">Text Area</option>
          <option value="select">Select</option>
          <option value="tags">Tags</option>
        </select>
      </div>
      <Input
        label="Placeholder"
        value={data.placeholder || ''}
        onChange={(e) => updateField('placeholder', e.target.value)}
      />
      <Input
        label="Default Value"
        value={data.default_value || ''}
        onChange={(e) => updateField('default_value', e.target.value)}
      />
      {data.input_type === 'select' && (
        <Input
          label="Options (comma-separated)"
          value={(data.options || []).join(', ')}
          onChange={(e) =>
            updateField(
              'options',
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            )
          }
          placeholder="Option 1, Option 2, Option 3"
        />
      )}
      <label className="flex items-center gap-2 text-xs text-surface-700">
        <input
          type="checkbox"
          checked={data.required ?? false}
          onChange={(e) => updateField('required', e.target.checked)}
          className="rounded border-surface-300"
        />
        Required
      </label>
    </>
  );
}

function AIProcessFields({
  data,
  updateField,
}: {
  data: AIProcessConfig;
  updateField: (field: string, value: unknown) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">Prompt Template</label>
        <textarea
          value={data.prompt_template || ''}
          onChange={(e) => updateField('prompt_template', e.target.value)}
          rows={8}
          placeholder="Use {{node-id}} to reference upstream nodes..."
          className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs text-surface-900 focus:border-primary-400 focus:outline-none resize-y font-mono"
        />
        <p className="text-[10px] text-surface-400 mt-1">
          Use {'{{node-id}}'} to insert results from connected nodes.
        </p>
      </div>
      <Input
        label="Temperature"
        type="number"
        value={data.temperature?.toString() ?? '0.5'}
        onChange={(e) => updateField('temperature', parseFloat(e.target.value) || 0.5)}
        placeholder="0.0 - 1.0"
      />
      <Input
        label="Max Tokens"
        type="number"
        value={data.max_tokens?.toString() ?? '3000'}
        onChange={(e) => updateField('max_tokens', parseInt(e.target.value, 10) || 3000)}
      />
    </>
  );
}

function TransformFields({
  data,
  updateField,
}: {
  data: TransformConfig;
  updateField: (field: string, value: unknown) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">Transform Type</label>
        <select
          value={data.transform_type || 'merge'}
          onChange={(e) => updateField('transform_type', e.target.value)}
          className="w-full rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm text-surface-900 focus:border-primary-400 focus:outline-none"
        >
          <option value="merge">Merge (combine inputs)</option>
          <option value="filter">Filter (by keyword)</option>
          <option value="format">Format (add header/footer)</option>
          <option value="extract">Extract (first N lines)</option>
        </select>
      </div>
      {data.transform_type === 'filter' && (
        <Input
          label="Filter Keyword"
          value={(data.config?.keyword as string) || ''}
          onChange={(e) => updateField('config', { ...data.config, keyword: e.target.value })}
        />
      )}
      {data.transform_type === 'extract' && (
        <Input
          label="Lines to Extract"
          type="number"
          value={(data.config?.lines as number)?.toString() || '20'}
          onChange={(e) =>
            updateField('config', { ...data.config, lines: parseInt(e.target.value, 10) || 20 })
          }
        />
      )}
    </>
  );
}

function OutputFields({
  data,
  updateField,
}: {
  data: OutputConfig;
  updateField: (field: string, value: unknown) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">Format</label>
        <select
          value={data.format || 'markdown'}
          onChange={(e) => updateField('format', e.target.value)}
          className="w-full rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm text-surface-900 focus:border-primary-400 focus:outline-none"
        >
          <option value="markdown">Markdown</option>
          <option value="plain_text">Plain Text</option>
        </select>
      </div>
      <Input
        label="Artifact Title Template"
        value={data.artifact_title_template || ''}
        onChange={(e) => updateField('artifact_title_template', e.target.value)}
        placeholder="e.g., Article: {{input-topic}}"
      />
    </>
  );
}
