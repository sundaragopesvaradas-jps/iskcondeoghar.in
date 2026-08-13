'use client';

import { useEffect } from 'react';
import { getAppInsights } from '@/appInsights';

/** Loads Application Insights only in the browser. */
export default function AppInsightsInit() {
  useEffect(() => {
    getAppInsights();
  }, []);
  return null;
}
