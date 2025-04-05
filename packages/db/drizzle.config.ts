import { getDatabaseDSN, initConfig, initLogger, useConfig } from '@tg-search/common'
import { defineConfig } from 'drizzle-kit'

initLogger()
initConfig()
const config = useConfig()

export default defineConfig({
  schema: './src/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseDSN(config),
  },
})
