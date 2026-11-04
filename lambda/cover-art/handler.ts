import type { SQSEvent, SQSBatchResponse } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { generatePlaylistCover } from "@/lib/playlists/cover-art";

const s3 = new S3Client({});
let keyLoaded: Promise<void> | undefined;

async function loadApiKey() {
  const { Parameter } = await new SSMClient({}).send(
    new GetParameterCommand({
      Name: process.env.AI_KEY_PARAM,
      WithDecryption: true,
    }),
  );
  process.env.AI_GATEWAY_API_KEY = Parameter!.Value;
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  keyLoaded ??= loadApiKey();
  await keyLoaded;

  const batchItemFailures: { itemIdentifier: string }[] = [];
  for (const record of event.Records) {
    try {
      const job = JSON.parse(record.body);
      const { jpegBase64, prompt } = await generatePlaylistCover(job);

      // write the sidecar first: the .jpg appearing is the "done" signal
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.COVER_ART_BUCKET,
          Key: `${job.key}.json`,
          Body: JSON.stringify({ prompt }),
          ContentType: "application/json",
        }),
      );
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.COVER_ART_BUCKET,
          Key: `${job.key}.jpg`,
          Body: Buffer.from(jpegBase64, "base64"),
          ContentType: "image/jpeg",
        }),
      );
    } catch (err) {
      console.error("cover art job failed", record.messageId, err);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
