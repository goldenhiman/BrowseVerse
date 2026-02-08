import React, { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { SETTINGS_STORAGE_KEY } from '../../../shared/constants';
import { setPaused } from '../../../privacy/exclusions';

export function PausedBanner() {
  const [paused, setPausedState] = useState(false);

  useEffect(() => {
    const load = async () => {
      const result = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
      const settings = result[SETTINGS_STORAGE_KEY] as { extension_paused?: boolean } | undefined;
      setPausedState(!!settings?.extension_paused);
    };
    void load();

    const listener = (
      changes: Record<string, browser.Storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === 'local' && changes[SETTINGS_STORAGE_KEY]) {
        const settings = changes[SETTINGS_STORAGE_KEY].newValue as { extension_paused?: boolean } | undefined;
        setPausedState(!!settings?.extension_paused);
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  const handleResume = async () => {
    await setPaused(false);
    setPausedState(false);
  };

  if (!paused) return null;

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-50 border-b border-amber-200 px-6 py-2.5">
      <span className="flex items-center gap-2 text-amber-800 text-sm font-medium">
        <Pause className="h-4 w-4 shrink-0" />
        Collection is paused — no browsing data is being captured
      </span>
      <button
        onClick={handleResume}
        className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors shrink-0"
      >
        <Play className="h-3.5 w-3.5" />
        Resume
      </button>
    </div>
  );
}
