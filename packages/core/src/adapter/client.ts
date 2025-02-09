import type { NewMessageEvent } from 'telegram/events'
import type { TelegramAdapter, TelegramMessage, TelegramMessageType } from './types'

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as input from '@inquirer/prompts'
import { useLogger } from '@tg-search/common'
import { Api, TelegramClient } from 'telegram'
import { NewMessage } from 'telegram/events'
import { StringSession } from 'telegram/sessions'

import { MediaService } from '../services/media'

export interface ClientAdapterConfig {
  apiId: number
  apiHash: string
  phoneNumber: string
  password?: string
}

export interface Dialog {
  id: number
  name: string
  type: 'user' | 'group' | 'channel' | 'saved'
  unreadCount: number
  lastMessage?: string
  lastMessageDate?: Date
}

export interface DialogsResult {
  dialogs: Dialog[]
  total: number
}

export interface Folder {
  id: number
  title: string
  // Custom folder ID from Telegram
  customId?: number
}

export class ClientAdapter implements TelegramAdapter {
  private client: TelegramClient
  private messageCallback?: (message: TelegramMessage) => Promise<void>
  private config: ClientAdapterConfig
  private sessionFile: string
  private session: StringSession
  private mediaService: MediaService
  private logger = useLogger()

  constructor(config: ClientAdapterConfig) {
    this.config = config
    this.sessionFile = path.join(process.cwd(), '.session')

    // Create client with session
    this.session = new StringSession('')
    this.client = new TelegramClient(
      this.session,
      config.apiId,
      config.apiHash,
      { connectionRetries: 5 },
    )
    this.mediaService = new MediaService(this.client)
  }

  get type() {
    return 'client' as const
  }

  /**
   * Load session string from file
   */
  private async loadSession(): Promise<string> {
    try {
      return await fs.readFile(this.sessionFile, 'utf-8')
    }
    catch {
      return ''
    }
  }

  /**
   * Save session string to file
   */
  private async saveSession(session: string) {
    await fs.writeFile(this.sessionFile, session, 'utf-8')
  }

  /**
   * Get entity type and name
   */
  private getEntityInfo(entity: any): { type: 'user' | 'group' | 'channel', name: string } {
    // 检查是否是用户
    if ('firstName' in entity || 'lastName' in entity || ('username' in entity && !('title' in entity))) {
      return {
        type: 'user',
        name: [entity.firstName, entity.lastName].filter(Boolean).join(' ') || entity.username || 'Unknown User',
      }
    }

    // 检查是否是群组或频道
    if ('title' in entity) {
      // 检查是否是超级群组
      if ('megagroup' in entity && entity.megagroup) {
        return { type: 'group', name: entity.title }
      }
      // 检查是否是普通群组
      if ('participantsCount' in entity || entity.className === 'Chat') {
        return { type: 'group', name: entity.title }
      }
      // 其他情况认为是频道
      return { type: 'channel', name: entity.title }
    }

    // 默认情况
    return {
      type: 'user',
      name: 'Unknown',
    }
  }

  /**
   * Get all dialogs (chats) with pagination
   */
  async getDialogs(offset = 0, limit = 10): Promise<DialogsResult> {
    // Get all dialogs first
    const dialogs = await this.client.getDialogs({
      limit: limit + 1, // Get one extra to check if there are more
      offsetDate: undefined,
      offsetId: 0,
      offsetPeer: undefined,
      ignorePinned: false,
    })

    const hasMore = dialogs.length > limit
    const dialogsToReturn = hasMore ? dialogs.slice(0, limit) : dialogs

    // Get current user for Saved Messages
    const me = await this.client.getMe()

    // Convert dialogs to our format, handle Saved Messages specially
    const convertedDialogs = dialogsToReturn.map((dialog) => {
      const entity = dialog.entity
      const { type, name } = this.getEntityInfo(entity)

      // If this is the current user (Saved Messages), mark it as saved type
      if (entity?.id?.toJSNumber() === me?.id?.toJSNumber()) {
        return {
          id: entity.id.toJSNumber(),
          name: '常用',
          type: 'saved' as const,
          unreadCount: dialog.unreadCount,
          lastMessage: dialog.message?.message,
          lastMessageDate: dialog.message?.date ? new Date(dialog.message.date * 1000) : undefined,
        }
      }

      return {
        id: entity?.id.toJSNumber() || 0,
        name,
        type,
        unreadCount: dialog.unreadCount,
        lastMessage: dialog.message?.message,
        lastMessageDate: dialog.message?.date ? new Date(dialog.message.date * 1000) : undefined,
      }
    })

    // If Saved Messages is not in the list, add it at the beginning
    const hasSavedMessages = convertedDialogs.some(d => d.type === 'saved')
    if (!hasSavedMessages) {
      convertedDialogs.unshift({
        id: me.id.toJSNumber(),
        name: '常用',
        type: 'saved' as const,
        unreadCount: 0,
        lastMessage: undefined,
        lastMessageDate: undefined,
      })
    }

    return {
      dialogs: convertedDialogs,
      total: dialogs.length + (hasSavedMessages ? 0 : 1), // Add 1 to total if we added Saved Messages
    }
  }

  /**
   * Convert message type from Telegram to our type
   */
  private getMessageType(message: any): TelegramMessageType {
    if (message.media) {
      if ('photo' in message.media)
        return 'photo'
      if ('document' in message.media)
        return 'document'
      if ('video' in message.media)
        return 'video'
      if ('sticker' in message.media)
        return 'sticker'
      return 'other'
    }
    if (message.message)
      return 'text'
    return 'other'
  }

  /**
   * Convert message from Telegram to our format
   */
  private async convertMessage(message: any): Promise<TelegramMessage> {
    const type = this.getMessageType(message)
    let mediaInfo

    // Handle media files
    if (message.media) {
      mediaInfo = this.mediaService.getMediaInfo(message)
      if (mediaInfo) {
        // Download media file
        const localPath = await this.mediaService.downloadMedia(message, mediaInfo)
        if (localPath) {
          mediaInfo.localPath = localPath
        }
      }
    }

    return {
      id: message.id,
      chatId: message.chatId?.value || message.peerId?.channelId?.value || message.peerId?.chatId?.value || message.peerId?.userId?.value,
      type,
      content: message.message,
      mediaInfo,
      fromId: message.fromId?.userId?.value,
      replyToId: message.replyTo?.replyToMsgId,
      forwardFromChatId: message.fwdFrom?.fromId?.channelId?.value,
      forwardFromMessageId: message.fwdFrom?.channelPost,
      views: message.views,
      forwards: message.forwards,
      createdAt: new Date(message.date * 1000),
    }
  }

  async connect() {
    // Initialize media service
    await this.mediaService.init()

    // Load session
    const savedSession = await this.loadSession()
    if (savedSession) {
      this.logger.log('使用已保存的会话...')
      this.session = new StringSession(savedSession)
      this.client = new TelegramClient(
        this.session,
        this.config.apiId,
        this.config.apiHash,
        { connectionRetries: 5 },
      )
      this.mediaService = new MediaService(this.client)
    }

    await this.client.start({
      phoneNumber: async () => this.config.phoneNumber,
      password: async () => {
        this.logger.log('需要输入两步验证密码')
        const password = await input.password({ message: '请输入两步验证密码：' })
        if (!password)
          throw new Error('需要两步验证密码')
        return password
      },
      phoneCode: async () => {
        this.logger.log('需要输入验证码')
        const code = await input.input({ message: '请输入你收到的验证码：' })
        if (!code)
          throw new Error('需要验证码')
        return code
      },
      onError: err => this.logger.log('连接错误:', String(err)),
    })

    // Save session
    const sessionString = this.session.save()
    await this.saveSession(sessionString)

    // Setup message handler
    this.client.addEventHandler(async (event: NewMessageEvent) => {
      if (this.messageCallback && event.message) {
        const message = await this.convertMessage(event.message)
        await this.messageCallback(message)
      }
    }, new NewMessage({}))

    this.logger.log('已连接到 Telegram')
  }

  async disconnect() {
    await this.client.disconnect()
  }

  async *getMessages(chatId: number, limit = 100): AsyncGenerator<TelegramMessage> {
    const messages = await this.client.getMessages(chatId, { limit })
    for (const message of messages) {
      yield await this.convertMessage(message)
    }
  }

  onMessage(callback: (message: TelegramMessage) => Promise<void>) {
    this.messageCallback = callback
  }

  /**
   * Get folders from a dialog
   */
  async getFolders(chatId: number): Promise<Folder[]> {
    const folders: Folder[] = []

    try {
      // Get dialog entity
      const dialog = await this.client.getEntity(chatId)
      if (!dialog)
        return folders

      // Get all folders
      const result = await this.client.invoke(new Api.messages.GetDialogFilters())

      // Convert to our format
      if (Array.isArray(result)) {
        for (const folder of result) {
          if (folder.className === 'DialogFilter') {
            folders.push({
              id: folder.id,
              title: folder.title,
              customId: folder.id,
            })
          }
        }
      }

      // Add default folder
      folders.unshift({
        id: 0,
        title: '全部消息',
      })

      // Add saved messages folder
      const me = await this.client.getMe()
      if (dialog.id.eq(me.id)) {
        folders.push({
          id: -1,
          title: '常用消息',
        })
      }
    }
    catch (error) {
      this.logger.withError(error).error('获取文件夹失败:')
    }

    return folders
  }

  /**
   * Get all folders
   */
  async getAllFolders(): Promise<Folder[]> {
    // Add "All Messages" as the first option
    const folders: Folder[] = [{
      id: 0,
      title: '全部消息',
    }]

    // Get custom folders from Telegram
    const customFolders = await this.client.invoke(new Api.messages.GetDialogFilters())
    if (customFolders && Array.isArray(customFolders)) {
      folders.push(...customFolders.map((folder: any) => ({
        id: folder.id + 1, // Add 1 to avoid conflict with "All Messages"
        title: folder.title,
        customId: folder.id,
      })))
    }

    return folders
  }

  /**
   * Get dialogs in folder
   */
  async getDialogsInFolder(folderId: number): Promise<DialogsResult> {
    // If folderId is 0, return all dialogs
    if (folderId === 0) {
      return this.getDialogs(0, 100)
    }

    // Get custom folder
    const customFolders = await this.client.invoke(new Api.messages.GetDialogFilters())
    if (!customFolders || !Array.isArray(customFolders)) {
      return { dialogs: [], total: 0 }
    }

    const customFolder = customFolders.find((f: any) => f.id === folderId - 1)
    if (!customFolder || !customFolder.includePeers) {
      return { dialogs: [], total: 0 }
    }

    // Get all dialogs first
    const allDialogs = await this.client.getDialogs({
      limit: 100,
      offsetDate: undefined,
      offsetId: 0,
      offsetPeer: undefined,
      ignorePinned: false,
    })

    // Filter dialogs by folder
    const filteredDialogs = allDialogs.filter((dialog) => {
      // Check if dialog matches folder's include rules
      // This is a simplified implementation
      return customFolder.includePeers.some((peer: any) => {
        const peerId = peer.userId?.value || peer.chatId?.value || peer.channelId?.value
        return dialog.entity?.id?.toJSNumber() === peerId
      })
    })

    // Convert dialogs to our format
    const convertedDialogs = filteredDialogs.map((dialog) => {
      const entity = dialog.entity
      const { type, name } = this.getEntityInfo(entity)

      return {
        id: entity?.id.toJSNumber() || 0,
        name,
        type,
        unreadCount: dialog.unreadCount,
        lastMessage: dialog.message?.message,
        lastMessageDate: dialog.message?.date ? new Date(dialog.message.date * 1000) : undefined,
      }
    })

    return {
      dialogs: convertedDialogs,
      total: convertedDialogs.length,
    }
  }
}
