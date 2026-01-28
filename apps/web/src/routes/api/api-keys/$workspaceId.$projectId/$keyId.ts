import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { Unkey } from "@unkey/api";

export const Route = createFileRoute(
  "/api/api-keys/$workspaceId/$projectId/$keyId",
)({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        try {
          const { userId, orgId } = await auth();

          if (!userId || !orgId) {
            return new Response("Unauthorized", { status: 401 });
          }

          const { keyId, workspaceId, projectId } = await params;

          const unkey = new Unkey({ rootKey: process.env.UNKEY_API_KEY! });

          const getResponse = await unkey.keys.getKey({
            keyId,
          });

          if (!getResponse.data) {
            return new Response("API key not found", { status: 404 });
          }

          if (
            getResponse.data.identity?.externalId !==
            `${workspaceId}_${projectId}`
          ) {
            return new Response("API key not found or access denied", {
              status: 403,
            });
          }

          const deleteResponse = await unkey.keys.deleteKey({
            keyId,
          });

          if (!deleteResponse.data) {
            return new Response("Failed to delete API key", { status: 500 });
          }

          return json({
            success: true,
          });
        } catch (error) {
          console.error("Error deleting API key:", error);
          return new Response(
            error instanceof Error ? error.message : "Unknown error",
            { status: 500 },
          );
        }
      },
    },
  },
});
