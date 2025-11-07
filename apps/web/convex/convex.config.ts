// convex/convex.config.ts
import { defineApp } from 'convex/server';
import polar from '@convex-dev/polar/convex.config';
import resend from '@convex-dev/resend/convex.config';
import workpool from '@convex-dev/workpool/convex.config';

const app = defineApp();
app.use(polar);
app.use(resend);
app.use(workpool, { name: 'languageWorkpool' });
app.use(workpool, { name: 'createLanguageWorkpool' });

export default app;
