// convex/convex.config.ts
import { defineApp } from "convex/server";
import polar from "@convex-dev/polar/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import actionRetrier from "@convex-dev/action-retrier/convex.config";

const app = defineApp();
app.use(polar);
app.use(workpool, { name: "emailWorkpool" });
app.use(actionRetrier);

export default app;
