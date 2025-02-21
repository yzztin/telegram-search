import type { TelegramClient } from 'telegram'

import { useLogger } from '@tg-search/common'
import { getUser, upsertUser } from '@tg-search/db'
import { Api } from 'telegram'

/**
 * Handles resolution and caching of Telegram user information
 */
export class UserResolver {
  private logger = useLogger()

  constructor(
    private readonly client: TelegramClient,
  ) {}

  /**
   * Get and cache user information from Telegram API
   */
  private async getUserInfo(userId: number): Promise<{
    username?: string
    displayName: string
  } | null> {
    try {
      this.logger.debug(`Fetching user info from Telegram API for user ${userId}`)
      const sender = await this.client.getEntity(userId)

      if (sender instanceof Api.User) {
        const displayName = [sender.firstName, sender.lastName].filter(Boolean).join(' ')
          || sender.username
          || `User ${userId}`

        this.logger.withFields({
          userId,
          displayName,
          username: sender.username,
          firstName: sender.firstName,
          lastName: sender.lastName,
        }).debug('Got user info from Telegram API')

        // Cache user information
        await upsertUser({
          id: userId,
          username: sender.username || undefined,
          displayName,
          updatedAt: new Date(),
        })

        return {
          username: sender.username || undefined,
          displayName,
        }
      }
      else {
        this.logger.withFields({
          userId,
          entityType: sender.className,
        }).warn('Entity is not a user')
      }
    }
    catch (error) {
      // Log more details about the error
      this.logger.withFields({
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }).warn('Failed to get user info from Telegram API')
    }
    return null
  }

  /**
   * Get user information from cache or API
   * If not found in cache, fetch from API and update cache
   * If cache is older than 7 days, refresh from API
   */
  async resolveUser(userId: number): Promise<{
    username?: string
    displayName: string
  } | null> {
    try {
      // Try to get from cache first
      const user = await getUser(userId)
      if (user) {
        // Check if cache is older than 7 days
        const cacheAge = Date.now() - user.updatedAt.getTime()
        const cacheExpired = cacheAge > 7 * 24 * 60 * 60 * 1000 // 7 days

        if (!cacheExpired) {
          this.logger.withFields({
            userId,
            displayName: user.displayName,
            cacheAge: Math.floor(cacheAge / (24 * 60 * 60 * 1000)), // days
          }).debug('Got user info from cache')

          return {
            username: user.username || undefined,
            displayName: user.displayName,
          }
        }

        this.logger.withFields({
          userId,
          cacheAge: Math.floor(cacheAge / (24 * 60 * 60 * 1000)), // days
        }).debug('Cache expired, refreshing from API')
      }
      else {
        this.logger.debug(`User ${userId} not found in cache`)
      }

      // If not in cache or cache expired, fetch from API and update cache
      return await this.getUserInfo(userId)
    }
    catch (error) {
      // Log more details about the error
      this.logger.withFields({
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }).warn('Failed to resolve user info')
      return null
    }
  }
}
