import { Format, LogLevel, setGlobalFormat, setGlobalLogLevel, useLogg } from '@guiiai/logg'
import ErrorStackParser from 'error-stack-parser'
import path from 'path-browserify-esm'

export type Logger = ReturnType<typeof useLogg>
export { Format as LoggerFormat, LogLevel as LoggerLevel }

let isDebugMode = false

export function getDebugMode() {
  return !!isDebugMode
}

export function parseEnvLogLevel(envLogLevel?: string) {
  envLogLevel = envLogLevel?.toLowerCase()

  switch (envLogLevel) {
    case 'debug':
      return LogLevel.Debug
    case 'verbose':
      return LogLevel.Verbose
    default:
      return LogLevel.Log
  }
}

export function initLogger(
  level = LogLevel.Verbose,
  format = Format.Pretty,
) {
  setGlobalLogLevel(level)
  setGlobalFormat(format)

  if (level === LogLevel.Debug)
    isDebugMode = true

  const logger = useLogg('logger').useGlobalConfig()
  logger.withFields({ level: LogLevel[level], format }).log('Logger initialized')
}

export function isBrowser() {
  return typeof window !== 'undefined'
}

export function useLogger(name?: string): Logger {
  // eslint-disable-next-line unicorn/error-message
  const stack = ErrorStackParser.parse(new Error())
  const currentStack = stack[1]
  const basePath = currentStack.fileName?.replace('async', '').trim() || ''
  const fileName = path.join(...basePath.split(path.sep).slice(-2))

  const nameToDisplay = name || `${fileName}:${currentStack.lineNumber}`
  const hyperlink = isBrowser() ? `\x1B]8;;<URL>\x1B\\${nameToDisplay}\x1B]8;;\x1B\\` : nameToDisplay
  return useLogg(hyperlink).useGlobalConfig()
}
