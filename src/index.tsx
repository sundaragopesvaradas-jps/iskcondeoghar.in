import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { routes } from './config/routes';
import ExternalRedirect from './components/ExternalRedirect';
import RecentCelebrationsPage from './RecentCelebrationsPage';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const router = createBrowserRouter([
  {
    path: '*',
    element: <Navigate to={routes.default} replace />
  },
  {
    path: routes.home,
    element: <App />
  },
  {
    path: routes.spllm,
    element: <ExternalRedirect to={routes.external.spllm} />
  },
  {
    path: '/recentcelebrations',
    element: <RecentCelebrationsPage />
  }
]);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
