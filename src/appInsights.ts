import { ApplicationInsights } from '@microsoft/applicationinsights-web';

// Azure Portal → your Application Insights resource → Configure → Connection strings.
const APPLICATION_INSIGHTS_CONNECTION_STRING = 'InstrumentationKey=5015e373-ad9e-41bb-9b59-48c615ec48e2;IngestionEndpoint=https://centralus-2.in.applicationinsights.azure.com/;LiveEndpoint=https://centralus.livediagnostics.monitor.azure.com/;ApplicationId=22d4cea8-04fd-4bea-9130-547d1d14e373';

let instance: ApplicationInsights | null = null;

if (APPLICATION_INSIGHTS_CONNECTION_STRING.trim() !== '') {
  instance = new ApplicationInsights({
    config: {
      connectionString: APPLICATION_INSIGHTS_CONNECTION_STRING.trim(),
      enableAutoRouteTracking: true,
    },
  });
  instance.loadAppInsights();
}

export function getAppInsights(): ApplicationInsights | null {
  return instance;
}
