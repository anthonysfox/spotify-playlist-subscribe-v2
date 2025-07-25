import { Prisma } from '@prisma/client'

export const softDeleteMiddleware: Prisma.Middleware = async (params, next) => {
  // Models that support soft deletes
  const softDeleteModels = ['User', 'ManagedPlaylist', 'SourcePlaylist']
  
  if (softDeleteModels.includes(params.model || '')) {
    // Automatically filter out soft-deleted records for find operations
    if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'findUnique') {
      if (params.args.where) {
        // Only add deletedAt filter if it's not already specified
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null
        }
      } else {
        params.args.where = { deletedAt: null }
      }
    }

    // Convert hard deletes to soft deletes
    if (params.action === 'delete') {
      params.action = 'update'
      params.args.data = {
        deletedAt: new Date()
      }
    }

    if (params.action === 'deleteMany') {
      params.action = 'updateMany'
      params.args.data = {
        deletedAt: new Date()
      }
    }
  }

  return next(params)
}