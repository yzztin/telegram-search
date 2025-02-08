import { initLogger, useLogger } from '@tg-search/common'

export function main() {
  initLogger()
  useLogger().log('Hello World')
}

main()
