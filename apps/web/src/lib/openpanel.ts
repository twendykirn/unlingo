import { OpenPanel } from '@openpanel/web';

export const op = new OpenPanel({
  clientId: import.meta.env.VITE_OPENPANEL_CLIENT_ID!,
  trackScreenViews: true,
  trackAttributes: true,
  trackOutgoingLinks: true,
  disabled: import.meta.env.DEV,
});
