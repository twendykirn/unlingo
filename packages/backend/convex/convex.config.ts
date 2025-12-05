// convex/convex.config.ts
import { defineApp } from "convex/server";
import polar from "@convex-dev/polar/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import r2 from "@convex-dev/r2/convex.config";

const app = defineApp();
app.use(polar);
app.use(r2);
app.use(workpool, { name: "languageWorkpool" });
app.use(workpool, { name: "createLanguageWorkpool" });
app.use(workpool, { name: "mergeWorkpool" });
app.use(workpool, { name: "emailWorkpool" });

export default app;
