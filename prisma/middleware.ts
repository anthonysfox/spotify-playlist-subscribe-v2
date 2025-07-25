import { Prisma } from "@prisma/client";

export const softDeleteMiddleware: Prisma.Middleware = async (params, next) => {
  // Auto filter out soft deleted records
  if (params.action === "findMany" || params.action === "findFirst") {
    if (params.args.where) {
      if (params.args.where.deletedAt === undefined) {
        // If deletedAt is specified, we don't filter it out
        params.args.where.deletedAt = null;
      }
    } else {
      params.args.where = { deletedAt: null };
    }
  }

  if (params.action === "delete") {
    params.action = "update";
    params.args.data = { deletedAt: new Date() };
  }

  if (params.action === "deleteMany") {
    params.action = "updateMany";
    params.args.data = { deletedAt: new Date() };
  }

  return next(params);
};
