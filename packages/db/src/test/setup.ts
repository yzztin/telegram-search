import { initConfig, initDB } from '@tg-search/common'

export function setupTest() {
  initConfig()
  initDB()
}
