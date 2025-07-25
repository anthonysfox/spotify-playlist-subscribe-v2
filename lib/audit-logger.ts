import { AuditAction } from '@prisma/client'
import prisma from './prisma'

interface AuditLogData {
  action: AuditAction
  entityType: string
  entityId: string
  userId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
}

export class AuditLogger {
  static async log(data: AuditLogData) {
    try {
      await prisma.auditLog.create({
        data: {
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          userId: data.userId,
          oldValues: data.oldValues || null,
          newValues: data.newValues || null,
          metadata: data.metadata || null,
        }
      })
    } catch (error) {
      // Don't let audit logging break the main operation
      console.error('Audit logging failed:', error)
    }
  }

  // Convenience methods for common operations
  static async logSubscriptionCreated(
    managedPlaylistId: string, 
    sourcePlaylistId: string, 
    userId?: string
  ) {
    await this.log({
      action: 'SUBSCRIBED',
      entityType: 'ManagedPlaylistSourceSubscription',
      entityId: `${managedPlaylistId}-${sourcePlaylistId}`,
      userId,
      newValues: { managedPlaylistId, sourcePlaylistId }
    })
  }

  static async logSubscriptionDeleted(
    managedPlaylistId: string, 
    sourcePlaylistId: string, 
    userId?: string
  ) {
    await this.log({
      action: 'UNSUBSCRIBED',
      entityType: 'ManagedPlaylistSourceSubscription',
      entityId: `${managedPlaylistId}-${sourcePlaylistId}`,
      userId,
      oldValues: { managedPlaylistId, sourcePlaylistId }
    })
  }

  static async logPlaylistCreated(playlist: any, userId?: string) {
    await this.log({
      action: 'CREATED',
      entityType: 'ManagedPlaylist',
      entityId: playlist.id,
      userId,
      newValues: playlist
    })
  }

  static async logPlaylistUpdated(
    playlistId: string, 
    oldValues: any, 
    newValues: any, 
    userId?: string
  ) {
    await this.log({
      action: 'UPDATED',
      entityType: 'ManagedPlaylist',
      entityId: playlistId,
      userId,
      oldValues,
      newValues
    })
  }

  static async logPlaylistDeleted(playlist: any, userId?: string) {
    await this.log({
      action: 'DELETED',
      entityType: 'ManagedPlaylist',
      entityId: playlist.id,
      userId,
      oldValues: playlist
    })
  }

  // Query audit logs
  static async getEntityHistory(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'desc' }
    })
  }

  static async getUserActivity(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit
    })
  }
}