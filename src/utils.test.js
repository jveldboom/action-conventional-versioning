/* eslint-env jest */
const core = require('@actions/core')
const utils = require('./utils')

describe('utils', () => {
  beforeEach(() => {

  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('setVersionOutputs()', () => {
    it('should set output for all values', () => {
      utils.setVersionOutputs({ version: '2.3.4', bump: 'minor', previousVersion: '2.2.4' })
      expect(core.setOutput).toHaveBeenNthCalledWith(1, 'version', '2.3.4')
      expect(core.setOutput).toHaveBeenNthCalledWith(2, 'version-with-prefix', 'v2.3.4')
      expect(core.setOutput).toHaveBeenNthCalledWith(3, 'previous-version', '2.2.4')
      expect(core.setOutput).toHaveBeenNthCalledWith(4, 'previous-version-with-prefix', 'v2.2.4')
      expect(core.setOutput).toHaveBeenNthCalledWith(5, 'major', 2)
      expect(core.setOutput).toHaveBeenNthCalledWith(6, 'major-with-prefix', 'v2')
      expect(core.setOutput).toHaveBeenNthCalledWith(7, 'minor', 3)
      expect(core.setOutput).toHaveBeenNthCalledWith(8, 'patch', 4)
      expect(core.setOutput).toHaveBeenNthCalledWith(9, 'bump', 'minor')
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

    it('should drop excluded scopes before computing the bump', async () => {
      const commits = [
        { message: 'feat(api): add endpoint', sha: '111' },
        { message: 'chore(deps)!: bump lodash', sha: '222' }
      ]
      const bump = await utils.getVersionBump(commits, 'patch', { excludeScopes: ['deps'] })
      expect(bump).toBe('minor')
    })

    it('should limit consideration to included scopes', async () => {
      const commits = [
        { message: 'feat(api): add endpoint', sha: '111' },
        { message: 'feat(docs)!: overhaul site', sha: '222' }
      ]
      const bump = await utils.getVersionBump(commits, 'patch', { includeScopes: ['api'] })
      expect(bump).toBe('minor')
    })
  })

  describe('filterCommitsByScope()', () => {
    const commits = [
      { message: 'feat(api): add endpoint', sha: '1' },
      { message: 'chore(deps): bump lodash', sha: '2' },
      { message: 'fix: root-level fix', sha: '3' },
      { message: 'not conventional at all', sha: '4' }
    ]

    it('returns input unchanged when no filters given', () => {
      expect(utils.filterCommitsByScope(commits)).toEqual(commits)
      expect(utils.filterCommitsByScope(commits, {})).toEqual(commits)
    })

    it('keeps only commits with an included scope', () => {
      const result = utils.filterCommitsByScope(commits, { includeScopes: ['api'] })
      expect(result.map(c => c.sha)).toEqual(['1'])
    })

    it('drops commits with an excluded scope', () => {
      const result = utils.filterCommitsByScope(commits, { excludeScopes: ['deps'] })
      expect(result.map(c => c.sha)).toEqual(['1', '3', '4'])
    })

    it('drops unscoped commits when excludeUnscoped is true', () => {
      const result = utils.filterCommitsByScope(commits, { excludeUnscoped: true })
      expect(result.map(c => c.sha)).toEqual(['1', '2'])
    })

    it('treats non-conventional messages as unscoped', () => {
      const result = utils.filterCommitsByScope(
        [{ message: 'not conventional', sha: 'x' }],
        { excludeUnscoped: true }
      )
      expect(result).toEqual([])
    })

    it('applies include and exclude together', () => {
      const result = utils.filterCommitsByScope(commits, {
        includeScopes: ['api', 'deps'],
        excludeScopes: ['deps']
      })
      expect(result.map(c => c.sha)).toEqual(['1'])
    })
  })
})
