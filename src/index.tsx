import React, { Suspense, lazy, ComponentType, LazyExoticComponent } from 'react';
import ReactDOM from 'react-dom/client';
import './appInsights';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { getAppInsights } from './appInsights';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { routes } from './config/routes';

const App = lazy(() => import('./App'));
const ExternalRedirect = lazy(() => import('./components/ExternalRedirect'));
const RecentCelebrationsPage = lazy(() => import('./RecentCelebrationsPage'));
const SadhanaFormPage = lazy(() => import('./sadhana/SadhanaFormPage'));
const SadhanaRecordsPage = lazy(() => import('./sadhana/SadhanaRecordsPage'));
const SadhanaAdminOverviewPage = lazy(() => import('./sadhana/SadhanaAdminOverviewPage'));

/** CRA + TS 3.9 + React 19 types: JSX on `lazy()` components is mis-inferred; `createElement` is typed correctly. */
function lazyEl(C: LazyExoticComponent<ComponentType>) {
  return React.createElement(C);
}

function RouteFallback() {
  return (
    <div
      style={{
        padding: '3rem 1rem',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#444',
      }}
    >
      Loading…
    </div>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const router = createBrowserRouter([
  {
    path: routes.home,
    element: (
      <Suspense fallback={<RouteFallback />}>
        {lazyEl(App)}
      </Suspense>
    ),
  },
  {
    path: routes.spbooks,
    element: (
      <Suspense fallback={<RouteFallback />}>
        {React.createElement(ExternalRedirect as unknown as React.ComponentType<{ to: string }>, {
          to: routes.external.spbooks,
        })}
      </Suspense>
    ),
  },
  {
    path: routes.spletters,
    element: (
      <Suspense fallback={<RouteFallback />}>
        {React.createElement(ExternalRedirect as unknown as React.ComponentType<{ to: string }>, {
          to: routes.external.spletters,
        })}
      </Suspense>
    ),
  },
  {
    path: '/recentcelebrations',
    element: (
      <Suspense fallback={<RouteFallback />}>
        {lazyEl(RecentCelebrationsPage)}
      </Suspense>
    ),
  },
  {
    path: routes.sadhana,
    element: (
      <Suspense fallback={<RouteFallback />}>
        {lazyEl(SadhanaFormPage)}
      </Suspense>
    ),
  },
  {
    path: routes.sadhanaRecords,
    element: (
      <Suspense fallback={<RouteFallback />}>
        {lazyEl(SadhanaRecordsPage)}
      </Suspense>
    ),
  },
  {
    path: routes.sadhanaAdmin,
    element: (
      <Suspense fallback={<RouteFallback />}>
        {lazyEl(SadhanaAdminOverviewPage)}
      </Suspense>
    ),
  },
  {
    path: '*',
    element: <Navigate to={routes.default} replace />,
  },
]);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

reportWebVitals((metric) => {
  const ai = getAppInsights();
  if (!ai) {
    return;
  }
  ai.trackMetric(
    { name: `WebVital/${metric.name}`, average: metric.value },
    { id: metric.id, delta: String(metric.delta) }
  );
});
