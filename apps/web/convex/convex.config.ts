// convex/convex.config.ts
import { defineApp } from 'convex/server';
import polar from '@convex-dev/polar/convex.config';
import resend from '@convex-dev/resend/convex.config';

const app = defineApp();
app.use(polar);
app.use(resend);

export default app;
