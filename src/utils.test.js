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

    it('keeps only commits with an included scope and drops non-conventional messages', () => {
      const result = utils.filterCommitsByScope(commits, { includeScopes: ['api'] })
      expect(result.map(c => c.sha)).toEqual(['1'])
    })

    it('drops commits with an excluded scope', () => {
      const result = utils.filterCommitsByScope(commits, { excludeScopes: ['deps'] })
      expect(result.map(c => c.sha)).toEqual(['1', '3', '4'])
    })

    it('drops unscoped conventional commits when excludeUnscoped is true, keeping non-conventional ones', () => {
      const result = utils.filterCommitsByScope(commits, { excludeUnscoped: true })
      expect(result.map(c => c.sha)).toEqual(['1', '2', '4'])
    })

    it('passes non-conventional messages through exclusion-only filters', () => {
      const nonConventional = [{ message: 'revert something\n\nThis reverts commit abc.', sha: 'x' }]
      expect(utils.filterCommitsByScope(nonConventional, { excludeUnscoped: true })).toEqual(nonConventional)
      expect(utils.filterCommitsByScope(nonConventional, { excludeScopes: ['deps'] })).toEqual(nonConventional)
    })

    it('drops non-conventional messages when an include filter is active', () => {
      const nonConventional = [{ message: 'Update docs\n\nBREAKING CHANGE: gone', sha: 'x' }]
      expect(utils.filterCommitsByScope(nonConventional, { includeScopes: ['api'] })).toEqual([])
    })

    it('applies include and exclude together', () => {
      const result = utils.filterCommitsByScope(commits, {
        includeScopes: ['api', 'deps'],
        excludeScopes: ['deps']
      })
      expect(result.map(c => c.sha)).toEqual(['1'])
    })
  })

  describe('getMajorCommits()', () => {
    const commits = [
      { message: 'feat(api)!: drop endpoint', sha: '1111111' },
      { message: 'fix: small bug', sha: '2222222' },
      { message: 'chore(deps): bump\n\nBREAKING CHANGE: node 24', sha: '3333333' }
    ]

    it('should return only commits requesting a major bump', async () => {
      const result = await utils.getMajorCommits(commits)
      expect(result.map(c => c.sha)).toEqual(['1111111', '3333333'])
    })

    it('should respect scope filters', async () => {
      const result = await utils.getMajorCommits(commits, { excludeScopes: ['deps'] })
      expect(result.map(c => c.sha)).toEqual(['1111111'])
    })

    it('should return empty array with no inputs', async () => {
      expect(await utils.getMajorCommits()).toEqual([])
    })

    describe('reverted breaking commits', () => {
      const A = { message: 'feat!: drop api', sha: 'aaaaaaa1111', hash: 'aaaaaaa1111' }
      const R = { message: 'Revert "feat!: drop api"\n\nThis reverts commit aaaaaaa1111.', sha: 'bbbbbbb2222', hash: 'bbbbbbb2222' }
      const F = { message: 'fix: x', sha: 'ccccccc3333', hash: 'ccccccc3333' }
      const B = { message: 'feat!: other', sha: 'ddddddd4444', hash: 'ddddddd4444' }

      it('should exclude a breaking commit cancelled by a revert', async () => {
        expect(await utils.getMajorCommits([A, R, F])).toEqual([])
        expect(await utils.getVersionBump([A, R, F], 'patch')).toBe('patch')
      })

      it('should include the breaking commit when not reverted', async () => {
        expect(await utils.getMajorCommits([A, F])).toEqual([A])
      })

      it('should only return breaking commits that were not reverted', async () => {
        expect(await utils.getMajorCommits([A, R, B])).toEqual([B])
      })
    })
  })

  describe('parseMaxMajorVersion()', () => {
    it.each([[''], ['   '], [undefined], [null]])('should return null for unset value %p', (raw) => {
      expect(utils.parseMaxMajorVersion(raw)).toBeNull()
    })

    it.each([['1', 1], ['0', 0], [' 2 ', 2], ['10', 10]])('should parse %p as %p', (raw, expected) => {
      expect(utils.parseMaxMajorVersion(raw)).toBe(expected)
    })

    it.each([['-1'], ['1.5'], ['abc'], ['1a'], ['+1']])('should throw for invalid value %p', (raw) => {
      expect(() => utils.parseMaxMajorVersion(raw)).toThrow('max-major-version must be a non-negative integer')
    })
  })

  describe('exceedsMajorCap()', () => {
    it('should be true only for a major bump above the cap', () => {
      expect(utils.exceedsMajorCap({ previousVersion: '1.4.2', bump: 'major', maxMajor: 1 })).toBe(true)
      expect(utils.exceedsMajorCap({ previousVersion: '0.0.0', bump: 'major', maxMajor: 0 })).toBe(true)
      expect(utils.exceedsMajorCap({ previousVersion: '3.1.0', bump: 'major', maxMajor: 1 })).toBe(true)
    })

    it('should be false when the cap allows the bump', () => {
      expect(utils.exceedsMajorCap({ previousVersion: '1.4.2', bump: 'major', maxMajor: 2 })).toBe(false)
    })

    it('should be false for minor/patch bumps or no cap', () => {
      expect(utils.exceedsMajorCap({ previousVersion: '1.4.2', bump: 'minor', maxMajor: 0 })).toBe(false)
      expect(utils.exceedsMajorCap({ previousVersion: '1.4.2', bump: 'patch', maxMajor: 0 })).toBe(false)
      expect(utils.exceedsMajorCap({ previousVersion: '1.4.2', bump: 'major', maxMajor: null })).toBe(false)
      expect(utils.exceedsMajorCap({ previousVersion: '1.4.2', bump: 'major' })).toBe(false)
    })
  })

  describe('applyMajorCap()', () => {
    let warning

    beforeEach(() => {
      warning = jest.spyOn(core, 'warning').mockImplementation(() => undefined)
    })

    afterEach(() => {
      warning.mockRestore()
    })

    it('should downgrade major to minor when over the cap', () => {
      const bump = utils.applyMajorCap({ previousVersion: '1.4.2', bump: 'major', maxMajor: 1 })
      expect(bump).toBe('minor')
      expect(warning).toHaveBeenCalledTimes(1)
    })

    it('should keep major when within the cap', () => {
      expect(utils.applyMajorCap({ previousVersion: '1.4.2', bump: 'major', maxMajor: 2 })).toBe('major')
      expect(warning).not.toHaveBeenCalled()
    })

    it('should cap at 0 for a 0.x version', () => {
      expect(utils.applyMajorCap({ previousVersion: '0.3.1', bump: 'major', maxMajor: 0 })).toBe('minor')
    })

    it('should downgrade when latest release is already above the cap', () => {
      expect(utils.applyMajorCap({ previousVersion: '3.1.0', bump: 'major', maxMajor: 1 })).toBe('minor')
    })

    it('should not change bump when cap is null or undefined', () => {
      expect(utils.applyMajorCap({ previousVersion: '1.0.0', bump: 'major', maxMajor: null })).toBe('major')
      expect(utils.applyMajorCap({ previousVersion: '1.0.0', bump: 'major' })).toBe('major')
      expect(warning).not.toHaveBeenCalled()
    })

    it.each(['minor', 'patch'])('should not affect %s bumps', (bump) => {
      expect(utils.applyMajorCap({ previousVersion: '1.0.0', bump, maxMajor: 0 })).toBe(bump)
      expect(warning).not.toHaveBeenCalled()
    })

    it('should name offending commit SHAs in the warning', () => {
      utils.applyMajorCap({
        previousVersion: '1.0.0',
        bump: 'major',
        maxMajor: 1,
        offenders: [{ sha: 'abcdef1234567' }, { sha: '9876543210' }, {}]
      })
      const message = warning.mock.calls[0][0]
      expect(message).toContain('abcdef1')
      expect(message).toContain('9876543')
      expect(message).toContain('unknown')
      expect(message).not.toContain('abcdef1234567')
    })

    it('should attribute to default-bump when there are no offenders', () => {
      utils.applyMajorCap({ previousVersion: '1.0.0', bump: 'major', maxMajor: 1 })
      expect(warning.mock.calls[0][0]).toContain('default-bump')
    })
  })
})
