import { PrismaClient } from "@prisma/client";
import { softDeleteMiddleware } from "./prisma-middleware";

const prismaClientSingleton = () => {
  const client = new PrismaClient();
  client.$use(softDeleteMiddleware);
  return client;
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
