import React from 'react';
import { createHashRouter } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import Overview from './pages/Overview';
import Timeline from './pages/Timeline';
import CategoryExplorer from './pages/CategoryExplorer';
import Constellations from './pages/Constellations';
import ConstellationDetail from './pages/ConstellationDetail';
import Nebulas from './pages/Nebulas';
import NebulaEditor from './pages/NebulaEditor';
import NebulaRunner from './pages/NebulaRunner';
import GraphView from './pages/GraphView';
import Settings from './pages/Settings';

/** Wrap a page component with the Shell layout */
function page(Component: React.ComponentType) {
  return (
    <Shell>
      <Component />
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
