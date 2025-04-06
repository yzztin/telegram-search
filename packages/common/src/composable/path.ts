import { join } from 'node:path'

import { resolveHomeDir } from '../helper/path'
import { useConfig } from './config'

export function usePaths() {
  const config = useConfig()
  const storagePath = resolveHomeDir(config.path.storage)
  const sessionPath = join(storagePath, 'sessions')
  const mediaPath = join(storagePath, 'media')

  return {
    storagePath,
    sessionPath,
    mediaPath,
  }
}
