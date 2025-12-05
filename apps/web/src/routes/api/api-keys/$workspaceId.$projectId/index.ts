import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { Unkey } from "@unkey/api";

export const Route = createFileRoute("/api/api-keys/$workspaceId/$projectId/")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { userId, orgId } = await auth();

          if (!userId || !orgId) {
            return new Response("Unauthorized", { status: 401 });
          }

          const { workspaceId, projectId } = await params;

          const unkey = new Unkey({ rootKey: process.env.UNKEY_API_KEY! });

          const listResponse = await unkey.apis.listKeys({
            apiId: process.env.UNKEY_API_ID!,
            externalId: `${workspaceId}_${projectId}`,
          });

          if (!listResponse.data) {
            return new Response("Failed to list API keys", { status: 500 });
          }

          // Format the response
          const formattedKeys = listResponse.data.map((key) => ({
            id: key.keyId,
            name: key.name || "Unnamed Key",
            prefix: key.start || "",
            createdAt: key.createdAt,
            permissions: key.permissions || [],
          }));

          return json({
            keys: formattedKeys,
          });
        } catch (error) {
          console.error("Error listing API keys:", error);
          return new Response(
            error instanceof Error ? error.message : "Unknown error",
            { status: 500 },
          );
        }
      },
      POST: async ({ request, params }) => {
        try {
          const { userId, orgId } = await auth();

          if (!userId || !orgId) {
            return new Response("Unauthorized", { status: 401 });
          }

          const { workspaceId, projectId } = await params;

          const body = await request.json();
          const { name, permissions } = body;

          if (!projectId || !workspaceId || !name || !permissions) {
            return new Response("Missing required fields.", { status: 400 });
          }

          // Initialize Unkey client
          const unkey = new Unkey({ rootKey: process.env.UNKEY_API_KEY! });

          const externalId = `${workspaceId}_${projectId}`;

          const listResponse = await unkey.apis.listKeys({
            apiId: process.env.UNKEY_API_ID!,
            externalId,
          });

          if (!listResponse.data) {
            return new Response("Failed to list API keys", { status: 500 });
          }

          if (listResponse.data.length > 49) {
            return new Response(
              "Exceeded maximum number of API keys per project",
              { status: 400 },
            );
          }

          const prefix = "unlingo";

          const unkeyResponse = await unkey.keys.createKey({
            apiId: process.env.UNKEY_API_ID!,
            name,
            externalId,
            prefix,
            permissions,
          });

          if (!unkeyResponse.data) {
            return new Response("Failed to create API key", { status: 500 });
          }

          const { key, keyId } = unkeyResponse.data;

          return json({
            id: keyId,
            key,
            name,
            prefix,
          });
        } catch (error) {
          console.error("Error creating API key:", error);
          return new Response(
            error instanceof Error ? error.message : "Unknown error",
            { status: 500 },
          );
        }
      },
    },
  },
});
