import React, { Suspense, lazy } from 'react';
import { createHashRouter } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { Loader2 } from 'lucide-react';

// Lazy-loaded pages — each becomes its own chunk so the initial
// dashboard bundle stays small and heavy deps (ReactFlow, force-graph,
// recharts) are only fetched when the user navigates to them.
const Overview = lazy(() => import('./pages/Overview'));
const Timeline = lazy(() => import('./pages/Timeline'));
const CategoryExplorer = lazy(() => import('./pages/CategoryExplorer'));
const Constellations = lazy(() => import('./pages/Constellations'));
const ConstellationDetail = lazy(() => import('./pages/ConstellationDetail'));
const Nebulas = lazy(() => import('./pages/Nebulas'));
const NebulaEditor = lazy(() => import('./pages/NebulaEditor'));
const NebulaRunner = lazy(() => import('./pages/NebulaRunner'));
const GraphView = lazy(() => import('./pages/GraphView'));
const Settings = lazy(() => import('./pages/Settings'));

/** Lightweight spinner shown while a page chunk loads */
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-5 w-5 text-surface-300 animate-spin" />
    </div>
  );
}

/** Wrap a lazy page component with Shell + Suspense */
function page(Component: React.LazyExoticComponent<React.ComponentType>) {
  return (
    <Shell>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </Shell>
  );
}

// Using HashRouter because Chrome extension pages don't support pushState
export const router = createHashRouter([
  { path: '/', element: page(Overview) },
  { path: '/timeline', element: page(Timeline) },
  { path: '/categories', element: page(CategoryExplorer) },
  { path: '/constellations', element: page(Constellations) },
  { path: '/constellations/:id', element: page(ConstellationDetail) },
  { path: '/nebulas', element: page(Nebulas) },
  { path: '/nebulas/:id/edit', element: page(NebulaEditor) },
  { path: '/nebulas/:id/run', element: page(NebulaRunner) },
  { path: '/graph', element: page(GraphView) },
  { path: '/settings', element: page(Settings) },
]);
