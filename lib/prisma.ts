import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const client = new PrismaClient().$extends({
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
