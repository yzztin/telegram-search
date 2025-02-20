import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { findConfigDir, findRootPackage, resolveHomeDir } from './path'

// Mock fs module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

describe('path', () => {
  describe('resolveHomeDir', () => {
    it('should resolve home directory path', () => {
      const homeDir = os.homedir()
      expect(resolveHomeDir('~/test')).toBe(path.join(homeDir, 'test'))
    })

    it('should not modify absolute path', () => {
      const absolutePath = '/usr/local/bin'
      expect(resolveHomeDir(absolutePath)).toBe(absolutePath)
    })
  })

  describe('findRootPackage', () => {
    it('should find root package directory', () => {
      // Mock fs.existsSync to simulate package.json exists
      vi.mocked(fs.existsSync).mockImplementation((filePath: fs.PathLike) => {
        const paths = [
          '/test/project/package.json',
          '/test/project/src/some-file.ts',
        ]
        return paths.includes(filePath.toString())
      })

      const testDir = '/test/project/src'
      const result = findRootPackage(testDir)
      expect(result).toBe('/test/project')
    })

    it('should throw error when package.json not found', () => {
      // Mock fs.existsSync to simulate package.json not exists
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(() => findRootPackage('/test/project')).toThrow('Could not find root package directory')
    })
  })

  describe('findConfigDir', () => {
    it('should find config directory', () => {
      // Mock fs.existsSync to simulate config.yaml exists
      vi.mocked(fs.existsSync).mockImplementation((filePath: fs.PathLike) => {
        const paths = [
          '/test/project/config/config.yaml',
          '/test/project/src/some-file.ts',
        ]
        return paths.includes(filePath.toString())
      })

      const testDir = '/test/project/src'
      const result = findConfigDir(testDir)
      expect(result).toBe('/test/project/config')
    })

    it('should throw error when config directory not found', () => {
      // Mock fs.existsSync to simulate config.yaml not exists
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(() => findConfigDir('/test/project')).toThrow('Could not find config directory')
    })
  })

  // Reset all mocks after each test
  afterEach(() => {
    vi.resetAllMocks()
  })
})
