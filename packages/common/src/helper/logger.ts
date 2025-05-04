import path from 'node:path'
import { Format, LogLevel, setGlobalFormat, setGlobalLogLevel, useLogg } from '@guiiai/logg'

export type Logger = ReturnType<typeof useLogg>
export { Format as LoggerFormat, LogLevel as LoggerLevel }

export function initLogger(
  level = LogLevel.Verbose,
  format = Format.Pretty,
) {
  setGlobalLogLevel(level)
  setGlobalFormat(format)

  const logger = useLogg('logger').useGlobalConfig()
  logger.withFields({ level, format }).log('Logger initialized')
}

export function useLogger(name?: string): Logger {
  if (name)
    return useLogg(`${name}`).useGlobalConfig()

  const stack = new Error('logger').stack
  const caller = stack?.split('\n')[2]

  // Extract directory, filename and line number from stack trace
  const match = caller?.match(/(?:([^/]+)\/)?([^/\s]+?)(?:\.[jt]s)?:(\d+)(?::\d+)?\)?$/)
  const dirName = match?.[1] || path.basename(path.dirname(__filename))
  const fileName = match?.[2] || path.basename(__filename, '.ts')
  const lineNumber = match?.[3] || '?'

  return useLogg(`${dirName}/${fileName}:${lineNumber}`).useGlobalConfig()
}
