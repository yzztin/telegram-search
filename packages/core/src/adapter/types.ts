/**
 * Telegram adapter type
 */
export type TelegramAdapterType = 'bot' | 'client'

/**
 * Message type from Telegram
 */
export type TelegramMessageType = 'text' | 'photo' | 'video' | 'document' | 'other'

/**
 * Message from Telegram
 */
export interface TelegramMessage {
  id: number
  chatId: number
  type: TelegramMessageType
  content?: string
  fromId?: number
  replyToId?: number
  forwardFromChatId?: number
  forwardFromMessageId?: number
  views?: number
  forwards?: number
  createdAt: Date
}

/**
 * Telegram adapter interface
 */
export interface TelegramAdapter {
  /**
   * Get adapter type
   */
  readonly type: TelegramAdapterType

  /**
   * Connect to Telegram
   */
  connect(): Promise<void>

  /**
   * Disconnect from Telegram
   */
  disconnect(): Promise<void>

  /**
   * Get messages from chat
   */
  getMessages(chatId: number, limit?: number): AsyncGenerator<TelegramMessage>

  /**
   * Listen for new messages
   */
  onMessage(callback: (message: TelegramMessage) => Promise<void>): void
}
