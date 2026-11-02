/* eslint-env jest */
const core = require('@actions/core')
const github = require('./github')
const run = require('./run')

jest.mock('./github')

describe('run', () => {
  let warning

  beforeEach(() => {
    process.env.GITHUB_REPOSITORY = 'foo/bar'
    process.env['INPUT_GITHUB-TOKEN'] = 'test-token'
    process.env['INPUT_DEFAULT-BUMP'] = 'patch'
    process.env['INPUT_IGNORE-DRAFTS'] = false
    process.env['INPUT_IGNORE-PRERELEASES'] = false
    process.env['INPUT_INCLUDE-SCOPES'] = ''
    process.env['INPUT_EXCLUDE-SCOPES'] = ''
    process.env['INPUT_EXCLUDE-UNSCOPED-COMMITS'] = false
    delete process.env['INPUT_MAX-MAJOR-VERSION']
    warning = jest.spyOn(core, 'warning').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.clearAllMocks()
    warning.mockRestore()
    delete process.env['INPUT_MAX-MAJOR-VERSION']
  })

  it('should propagate errors from getLatestRelease', async () => {
    github.getLatestRelease.mockRejectedValueOnce(new Error('test error'))

    await expect(run()).rejects.toThrow('test error')
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should output default version bump (0.0.1) if no previous tags', async () => {
    github.getLatestRelease.mockResolvedValueOnce()

    await run()

    // check all outputs are returning expected values
    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'version', '0.0.1')
    expect(core.setOutput).toHaveBeenNthCalledWith(2, 'version-with-prefix', 'v0.0.1')
    expect(core.setOutput).toHaveBeenNthCalledWith(3, 'previous-version', '0.0.0')
    expect(core.setOutput).toHaveBeenNthCalledWith(4, 'previous-version-with-prefix', 'v0.0.0')
    expect(core.setOutput).toHaveBeenNthCalledWith(5, 'major', 0)
    expect(core.setOutput).toHaveBeenNthCalledWith(6, 'major-with-prefix', 'v0')
    expect(core.setOutput).toHaveBeenNthCalledWith(7, 'minor', 0)
    expect(core.setOutput).toHaveBeenNthCalledWith(8, 'patch', 1)
    expect(core.setOutput).toHaveBeenNthCalledWith(9, 'bump', 'patch')
  })

  it('should fail when latest tag is no valid semver', async () => {
    github.getLatestRelease.mockResolvedValueOnce({ tag_name: 'invalid-semver' })

    await run()
    expect(core.setFailed).toHaveBeenCalledTimes(1)
    expect(core.setFailed).toHaveBeenNthCalledWith(1, 'latest tag name "invalid-semver" is not valid semver. GitHub API response: {"tag_name":"invalid-semver"}')
  })

  it('should output versions', async () => {
    const latestTag = {
      tag_name: 'v1.2.3',
      commit: { sha: '123456789' }
    }
    github.getLatestRelease.mockResolvedValueOnce(latestTag)
    github.compareCommits.mockResolvedValueOnce([])

    await run()

    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'version', '1.2.4')
    expect(core.setOutput).toHaveBeenNthCalledWith(2, 'version-with-prefix', 'v1.2.4')
    expect(core.setOutput).toHaveBeenNthCalledWith(3, 'previous-version', '1.2.3')
    expect(core.setOutput).toHaveBeenNthCalledWith(4, 'previous-version-with-prefix', 'v1.2.3')
    expect(core.setOutput).toHaveBeenNthCalledWith(5, 'major', 1)
    expect(core.setOutput).toHaveBeenNthCalledWith(6, 'major-with-prefix', 'v1')
    expect(core.setOutput).toHaveBeenNthCalledWith(7, 'minor', 2)
    expect(core.setOutput).toHaveBeenNthCalledWith(8, 'patch', 4)
    expect(core.setOutput).toHaveBeenNthCalledWith(9, 'bump', 'patch')
  })

  describe('max-major-version', () => {
    const breaking = [{ message: 'feat!: remove old api', sha: 'abcdef1234567' }]

    it('should downgrade a breaking change to minor when over the cap', async () => {
      process.env['INPUT_MAX-MAJOR-VERSION'] = '1'
      github.getLatestRelease.mockResolvedValueOnce({ tag_name: 'v1.4.2', commit: { sha: '123' } })
      github.compareCommits.mockResolvedValueOnce(breaking)

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '1.5.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'minor')
      expect(core.setFailed).not.toHaveBeenCalled()
      expect(warning).toHaveBeenCalledTimes(1)
      expect(warning.mock.calls[0][0]).toContain('abcdef1')
    })

    it('should allow a major bump when the cap is high enough', async () => {
      process.env['INPUT_MAX-MAJOR-VERSION'] = '2'
      github.getLatestRelease.mockResolvedValueOnce({ tag_name: 'v1.4.2', commit: { sha: '123' } })
      github.compareCommits.mockResolvedValueOnce(breaking)
      const utils = require('./utils')
      const getMajorCommits = jest.spyOn(utils, 'getMajorCommits')
      let majorCommitsCalls

      try {
        await run()
        majorCommitsCalls = getMajorCommits.mock.calls.length
      } finally {
        getMajorCommits.mockRestore()
      }

      expect(core.setOutput).toHaveBeenCalledWith('version', '2.0.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'major')
      expect(warning).not.toHaveBeenCalled()
      // offenders are only looked up when the cap actually downgrades the bump
      expect(majorCommitsCalls).toBe(0)
    })

    it('should cap default-bump major when analyzing commits', async () => {
      process.env['INPUT_MAX-MAJOR-VERSION'] = '1'
      process.env['INPUT_DEFAULT-BUMP'] = 'major'
      github.getLatestRelease.mockResolvedValueOnce({ tag_name: 'v1.4.2', commit: { sha: '123' } })
      github.compareCommits.mockResolvedValueOnce([])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '1.5.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'minor')
      expect(warning.mock.calls[0][0]).toContain('default-bump')
    })

    it('should attribute the cap to default-bump when no major commits remain', async () => {
      process.env['INPUT_MAX-MAJOR-VERSION'] = '1'
      const utils = require('./utils')
      jest.spyOn(utils, 'getVersionBump').mockResolvedValueOnce('major')
      jest.spyOn(utils, 'getMajorCommits').mockResolvedValueOnce([])
      github.getLatestRelease.mockResolvedValueOnce({ tag_name: '1.2.0', commit: { sha: '123' } })
      github.compareCommits.mockResolvedValueOnce(breaking)

      try {
        await run()
      } finally {
        utils.getVersionBump.mockRestore()
        utils.getMajorCommits.mockRestore()
      }

      expect(warning).toHaveBeenCalledWith('Major bump (1.2.0 -> 2.0.0) exceeds max-major-version 1; downgrading to minor. Major bump requested by default-bump')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'minor')
    })

    it('should use 0.1.0 with no previous release, default-bump major and cap 0', async () => {
      process.env['INPUT_MAX-MAJOR-VERSION'] = '0'
      process.env['INPUT_DEFAULT-BUMP'] = 'major'
      github.getLatestRelease.mockResolvedValueOnce()

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '0.1.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'minor')
      expect(warning).toHaveBeenCalledTimes(1)
    })

    it('should downgrade and stay on the major line when latest release is above the cap', async () => {
      process.env['INPUT_MAX-MAJOR-VERSION'] = '1'
      github.getLatestRelease.mockResolvedValueOnce({ tag_name: 'v3.1.0', commit: { sha: '123' } })
      github.compareCommits.mockResolvedValueOnce(breaking)

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '3.2.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'minor')
      expect(warning).toHaveBeenCalledTimes(1)
    })

    it.each(['abc', '-1', '1.5'])('should fail on invalid value %p without calling the API', async (value) => {
      process.env['INPUT_MAX-MAJOR-VERSION'] = value

      await run()

      expect(core.setFailed).toHaveBeenCalledTimes(1)
      expect(core.setFailed.mock.calls[0][0]).toContain('max-major-version must be a non-negative integer')
      expect(github.getLatestRelease).not.toHaveBeenCalled()
      expect(github.compareCommits).not.toHaveBeenCalled()
      expect(core.setOutput).not.toHaveBeenCalled()
    })

    it('should leave behavior unchanged when the cap is unset', async () => {
      github.getLatestRelease.mockResolvedValueOnce({ tag_name: 'v1.4.2', commit: { sha: '123' } })
      github.compareCommits.mockResolvedValueOnce(breaking)

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '2.0.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'major')
      expect(warning).not.toHaveBeenCalled()
    })
  })
})
