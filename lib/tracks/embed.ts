import { google } from "@ai-sdk/google";
import { embed } from "ai";

export async function embedText(text: string, kind: "track" | "search") {
  const { embedding } = await embed({
    model: google.embedding("gemini-embedding-001"),
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: 1536,
        taskType: kind === "track" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
      },
    },
  });

  return embedding;
}
