import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";

const awsConfig = {
  region: "us-east-1",
  credentaisl: {
    accessKeyId: process.env.PLAYLISTFOX_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.PLAYLISTFX_AWS_SECRET_ACCESS_KEY!,
  },
};

const s3 = new S3Client(awsConfig);
const sqs = new SQSClient(awsConfig);
