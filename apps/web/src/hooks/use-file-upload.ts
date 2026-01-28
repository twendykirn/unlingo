import { api } from "@unlingo/backend/convex/_generated/api";
import type { Id } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback } from "react";

export function useUploadFile(workspaceId: Id<"workspaces">, projectId: Id<"projects">) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  return useCallback(
    async (file: File) => {
      const { url, key } = await generateUploadUrl({
        workspaceId,
        projectId,
      });
      try {
        const result = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) {
          throw new Error(`Failed to upload image: ${result.statusText}`);
        }
      } catch (error) {
        throw new Error(`Failed to upload image: ${error}`);
      }
      return key;
    },
    [generateUploadUrl],
  );
}
