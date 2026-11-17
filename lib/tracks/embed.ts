import { embed, gateway } from "ai";

// Through the AI Gateway (AI_GATEWAY_API_KEY). Vectors are identical to calling
// Google directly, so switching providers doesn't require re-embedding.
export async function embedText(text: string, kind: "track" | "search") {
  const { embedding } = await embed({
    model: gateway.textEmbeddingModel("google/gemini-embedding-001"),
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
