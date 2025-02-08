import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { NewMessage, NewMessageEvent } from 'telegram/events'
import { TelegramAdapter, TelegramMessage, TelegramMessageType } from './types'
import * as input from '@inquirer/prompts'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface ClientAdapterConfig {
  apiId: number
  apiHash: string
  phoneNumber: string
  password?: string
}

export interface Dialog {
  id: number
  name: string
  type: 'user' | 'group' | 'channel'
  unreadCount: number
  lastMessage?: string
  lastMessageDate?: Date
}

export interface DialogsResult {
  dialogs: Dialog[]
  total: number
}

export class ClientAdapter implements TelegramAdapter {
  private client: TelegramClient
  private messageCallback?: (message: TelegramMessage) => Promise<void>
  private config: ClientAdapterConfig
  private sessionFile: string
  private session: StringSession

  constructor(config: ClientAdapterConfig) {
    this.config = config
    this.sessionFile = path.join(process.cwd(), '.session')
    
    // Create client with session
    this.session = new StringSession('')
    this.client = new TelegramClient(
      this.session,
      config.apiId,
      config.apiHash,
      { connectionRetries: 5 }
    )
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
    } catch {
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
  private getEntityInfo(entity: any): { type: 'user' | 'group' | 'channel'; name: string } {
    // 检查是否是用户
    if ('firstName' in entity || 'lastName' in entity || ('username' in entity && !('title' in entity))) {
      return {
        type: 'user',
        name: [entity.firstName, entity.lastName].filter(Boolean).join(' ') || entity.username || 'Unknown User'
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
      name: 'Unknown'
    }
  }

  /**
   * Get all dialogs (chats) with pagination
   */
  async getDialogs(offset = 0, limit = 10): Promise<DialogsResult> {
    const dialogs = await this.client.getDialogs({
      limit: limit + 1, // Get one extra to check if there are more
      offsetDate: undefined,
      offsetId: 0,
      offsetPeer: undefined,
      ignorePinned: false,
    })

    const hasMore = dialogs.length > limit
    const dialogsToReturn = hasMore ? dialogs.slice(0, limit) : dialogs

    return {
      dialogs: dialogsToReturn.map(dialog => {
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
      }),
      total: dialogs.length
    }
  }

  /**
   * Convert message type from Telegram to our type
   */
  private getMessageType(message: any): TelegramMessageType {
    if (message.message) return 'text'
    if (message.photo) return 'photo'
    if (message.video) return 'video'
    if (message.document) return 'document'
    return 'other'
  }

  /**
   * Convert message from Telegram to our format
   */
  private convertMessage(message: any): TelegramMessage {
    return {
      id: message.id,
      chatId: message.chatId?.value || message.peerId?.channelId?.value || message.peerId?.chatId?.value || message.peerId?.userId?.value,
      type: this.getMessageType(message),
      content: message.message,
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
    // Load session
    const savedSession = await this.loadSession()
    if (savedSession) {
      console.log('使用已保存的会话...')
      this.session = new StringSession(savedSession)
      this.client = new TelegramClient(
        this.session,
        this.config.apiId,
        this.config.apiHash,
        { connectionRetries: 5 }
      )
    }

    await this.client.start({
      phoneNumber: async () => this.config.phoneNumber,
      password: async () => {
        console.log('需要输入两步验证密码')
        const password = await input.password({ message: '请输入两步验证密码：' })
        if (!password) throw new Error('需要两步验证密码')
        return password
      },
      phoneCode: async () => {
        console.log('需要输入验证码')
        const code = await input.input({ message: '请输入你收到的验证码：' })
        if (!code) throw new Error('需要验证码')
        return code
      },
      onError: (err) => console.error('连接错误:', err),
    })

    // Save session
    const sessionString = this.session.save()
    await this.saveSession(sessionString)

    // Setup message handler
    this.client.addEventHandler(async (event: NewMessageEvent) => {
      if (this.messageCallback && event.message) {
        const message = this.convertMessage(event.message)
        await this.messageCallback(message)
      }
    }, new NewMessage({}))

    console.log('已连接到 Telegram')
  }

  async disconnect() {
    await this.client.disconnect()
  }

  async *getMessages(chatId: number, limit = 100): AsyncGenerator<TelegramMessage> {
    const messages = await this.client.getMessages(chatId, { limit })
    for (const message of messages) {
      yield this.convertMessage(message)
    }
  }

  onMessage(callback: (message: TelegramMessage) => Promise<void>) {
    this.messageCallback = callback
  }
}
