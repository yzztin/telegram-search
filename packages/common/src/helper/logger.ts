import path from 'node:path'
import { Format, LogLevel, setGlobalFormat, setGlobalLogLevel, useLogg } from '@guiiai/logg'

export type Logger = ReturnType<typeof useLogg>

/**
 * Enhanced logger type with overloaded log methods
 */
export interface EnhancedLogger {
  log: (message: string, fields?: Record<string, any>) => void
  debug: (message: string, fields?: Record<string, any>) => void
  warn: (message: string, fields?: Record<string, any>) => void
  error: (message: string, fields?: Record<string, any>) => void
  withFields: (fields: Record<string, any>) => Logger
  withError: (error: Error | unknown) => Logger
}

export function initLogger() {
  setGlobalLogLevel(LogLevel.Debug)
  setGlobalFormat(Format.Pretty)

  const logger = useLogg('logger').useGlobalConfig()
  logger.log('Logger initialized')
}

/**
 * Enhance logger with fields support
 */
function enhanceLogger(logger: Logger): EnhancedLogger {
  const enhancedLogger = {
    // Wrap original methods
    log: (message: string, fields?: Record<string, any>) => {
      if (fields) {
        logger.withFields(fields).log(message)
      }
      else {
        logger.log(message)
      }
    },

    debug: (message: string, fields?: Record<string, any>) => {
      if (fields) {
        logger.withFields(fields).debug(message)
      }
      else {
        logger.debug(message)
      }
    },

    warn: (message: string, fields?: Record<string, any>) => {
      if (fields) {
        logger.withFields(fields).warn(message)
      }
      else {
        logger.warn(message)
      }
    },

    error: (message: string, fields?: Record<string, any>) => {
      if (fields) {
        logger.withFields(fields).error(message)
      }
      else {
        logger.error(message)
      }
    },

    // Pass through these methods
    withFields: (fields: Record<string, any>) => logger.withFields(fields),
    withError: (error: Error | unknown) => logger.withError(error),
  }

  return enhancedLogger as EnhancedLogger
}

/**
 * Get logger instance with directory name and filename
 * @returns logger instance configured with "directoryName/filename"
 */
export function useLogger(name?: string): EnhancedLogger {
  if (name)
    return enhanceLogger(useLogg(name).useGlobalConfig())

  const stack = new Error('logger').stack
  const caller = stack?.split('\n')[2]

  // Extract directory, filename and line number from stack trace
  const match = caller?.match(/(?:([^/]+)\/)?([^/\s]+?)(?:\.[jt]s)?:(\d+)(?::\d+)?\)?$/)
  const dirName = match?.[1] || path.basename(path.dirname(__filename))
  const fileName = match?.[2] || path.basename(__filename, '.ts')
  const lineNumber = match?.[3] || '?'

  return enhanceLogger(useLogg(`${dirName}/${fileName}:${lineNumber}`).useGlobalConfig())
}
