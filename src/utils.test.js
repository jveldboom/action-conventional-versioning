/* eslint-env jest */
const core = require('@actions/core')
const utils = require('./utils')

jest.spyOn(core, 'setOutput')

describe('utils', () => {
  beforeEach(() => {

  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('setVersionOutputs()', () => {
    it('should set output for all values', () => {
      utils.setVersionOutputs('2.3.4', 'v')
      expect(core.setOutput).toHaveBeenNthCalledWith(1, 'version', '2.3.4')
      expect(core.setOutput).toHaveBeenNthCalledWith(2, 'version-with-prefix', 'v2.3.4')
      expect(core.setOutput).toHaveBeenNthCalledWith(3, 'major', 2)
      expect(core.setOutput).toHaveBeenNthCalledWith(4, 'major-with-prefix', 'v2')
      expect(core.setOutput).toHaveBeenNthCalledWith(5, 'minor', 3)
      expect(core.setOutput).toHaveBeenNthCalledWith(6, 'patch', 4)
    })
  })

  describe('getVersionBump()', () => {
    it('should return default with no inputs', async () => {
      const bump = await utils.getVersionBump()
      expect(bump).toBe('patch')
    })

    it('should return default bump with no conventional commits', async () => {
      const commits = [
        { message: 'fix test', sha: '123456' },
        { message: 'fix bugs', sha: '789101' }
      ]
      const bump = await utils.getVersionBump(commits)
      expect(bump).toBe('patch')
    })

    it('should return override bump with no conventional commits', async () => {
      const commits = [
        { message: 'fix test', sha: '123456' },
        { message: 'fix bugs', sha: '789101' }
      ]
      const bump = await utils.getVersionBump(commits, 'major')
      expect(bump).toBe('major')
    })

    it('should return patch bump with conventional commit messages', async () => {
      const commits = [
        { message: 'ci: workflow', sha: '123456' },
        { message: 'fix bugs', sha: '789101' },
        { message: 'chore: fix bugs', sha: '234567' },
        { message: 'doc: fix bugs', sha: '234567' }
      ]
      const bump = await utils.getVersionBump(commits)
      expect(bump).toBe('patch')
    })

    it('should return minor bump with conventional commit messages', async () => {
      const commits = [
        { message: 'ci: workflow', sha: '123456' },
        { message: 'feat: green', sha: '789101' },
        { message: 'chore: fix bugs', sha: '234567' }
      ]
      const bump = await utils.getVersionBump(commits)
      expect(bump).toBe('minor')
    })

    it('should return major bump with conventional commit messages', async () => {
      const commits = [
        { message: 'ci: workflow', sha: '123456' },
        { message: 'feat!: green', sha: '789101' },
        { message: 'chore: fix bugs', sha: '234567' }
      ]
      const bump = await utils.getVersionBump(commits)
      expect(bump).toBe('major')
    })
  })
})
