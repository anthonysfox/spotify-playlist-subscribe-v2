import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({
    connectionString:
      process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL_NON_POOLING,
  });

  const client = new PrismaClient({ adapter }).$extends({
    query: {
      user: {
        async findMany({ args, query }) {
          // Auto filter out soft deleted records
          if (args.where?.deletedAt === undefined) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findFirst({ args, query }) {
          // Auto filter out soft deleted records
          if (args.where?.deletedAt === undefined) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
      },
      managedPlaylist: {
        async findMany({ args, query }) {
          // Auto filter out soft deleted records
          if (args.where?.deletedAt === undefined) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findFirst({ args, query }) {
          // Auto filter out soft deleted records
          if (args.where?.deletedAt === undefined) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
      },
      sourcePlaylist: {
        async findMany({ args, query }) {
          // Auto filter out soft deleted records
          if (args.where?.deletedAt === undefined) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findFirst({ args, query }) {
          // Auto filter out soft deleted records
          if (args.where?.deletedAt === undefined) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
      },
    },
  });
  return client;
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
