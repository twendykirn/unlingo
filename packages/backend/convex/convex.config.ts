// convex/convex.config.ts
import { defineApp } from "convex/server";
import workpool from "@convex-dev/workpool/convex.config";
import actionRetrier from "@convex-dev/action-retrier/convex.config";

const app = defineApp();
app.use(workpool, { name: "emailWorkpool" });
app.use(actionRetrier);

export default app;
