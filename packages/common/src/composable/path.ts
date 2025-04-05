import { join } from 'node:path'

import { resolveHomeDir } from '../helper/path'
import { getConfig } from './config'

export function usePaths() {
  const config = getConfig()
  const storagePath = resolveHomeDir(config.path.storage)
  const sessionPath = join(storagePath, 'session')
  const mediaPath = join(storagePath, 'media')

  return {
    storagePath,
    sessionPath,
    mediaPath,
  }
}
