import { Prisma } from '@prisma/client'

export function handlePrismaError(error: any) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const target = error.meta?.target as string[]
        if (target?.includes('clerkUserId')) {
          return {
            success: false,
            error: 'User already exists',
            code: 'USER_EXISTS'
          }
        }
        if (target?.includes('email')) {
          return {
            success: false,
            error: 'Email already in use',
            code: 'EMAIL_EXISTS'
          }
        }
        if (target?.includes('spotifyPlaylistId')) {
          return {
            success: false,
            error: 'Playlist already being managed',
            code: 'PLAYLIST_EXISTS'
          }
        }
        return {
          success: false,
          error: 'Record already exists',
          code: 'DUPLICATE_RECORD'
        }
      
      case 'P2025':
        // Record not found
        return {
          success: false,
          error: 'Record not found',
          code: 'NOT_FOUND'
        }
      
      default:
        return {
          success: false,
          error: 'Database error occurred',
          code: 'DATABASE_ERROR'
        }
    }
  }
  
  // Unknown error
  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  }
}

// Usage in API routes:
export async function safeCreate<T>(operation: () => Promise<T>) {
  try {
    const result = await operation()
    return { success: true, data: result }
  } catch (error) {
    return handlePrismaError(error)
  }
}