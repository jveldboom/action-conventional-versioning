/* eslint-env jest */
const core = require('@actions/core')
const github = require('./github')

jest.mock('./github')
jest.spyOn(core, 'getInput')
jest.spyOn(core, 'getBooleanInput')
jest.spyOn(core, 'setFailed')
jest.spyOn(core, 'setOutput')

const run = require('./run')

describe('run', () => {
  beforeEach(() => {
    process.env.GITHUB_REPOSITORY = 'foo/bar'
    process.env['INPUT_GITHUB-TOKEN'] = 'test-token'
    process.env['INPUT_DEFAULT-BUMP'] = 'patch'
    process.env['INPUT_IGNORE-DRAFTS'] = false
    process.env['INPUT_IGNORE-PRERELEASES'] = false
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should fail when unable to get latest tag', async () => {
    github.getLatestRelease.mockRejectedValueOnce(new Error('test error'))

    await run()
    expect(core.setFailed).toBeCalledTimes(1)
  })

  it('should output default version bump (0.0.1) if no previous tags', async () => {
    github.getLatestRelease.mockResolvedValueOnce()

    await run()
    // check core.input are called with expected values
    expect(core.getBooleanInput).toHaveBeenNthCalledWith(1, 'ignore-drafts')
    expect(core.getBooleanInput).toHaveBeenNthCalledWith(2, 'ignore-prereleases')
    expect(core.getInput).toHaveBeenNthCalledWith(2, 'default-bump')
    expect(core.getInput).toHaveNthReturnedWith(2, 'patch')

    // check all outputs are returning expected values
    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'version', '0.0.1')
    expect(core.setOutput).toHaveBeenNthCalledWith(2, 'version-with-prefix', 'v0.0.1')
    expect(core.setOutput).toHaveBeenNthCalledWith(3, 'major', 0)
    expect(core.setOutput).toHaveBeenNthCalledWith(4, 'major-with-prefix', 'v0')
    expect(core.setOutput).toHaveBeenNthCalledWith(5, 'minor', 0)
    expect(core.setOutput).toHaveBeenNthCalledWith(6, 'patch', 1)
    expect(core.setOutput).toHaveBeenNthCalledWith(7, 'bump', 'patch')
  })

  it('should fail when latest tag is no valid semver', async () => {
    github.getLatestRelease.mockResolvedValueOnce('invalid-semver')

    await run()
    expect(core.setFailed).toBeCalledTimes(1)
    expect(core.setFailed).toHaveBeenNthCalledWith(1, 'latest tag name is not valid semver: "invalid-semver"')
  })

  it('should output versions', async () => {
    const latestTag = {
      name: 'v1.2.3',
      commit: { sha: '123456789' }
    }
    github.getLatestRelease.mockResolvedValueOnce(latestTag)
    github.compareCommits.mockResolvedValueOnce([])

    await run()

    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'version', '1.2.4')
    expect(core.setOutput).toHaveBeenNthCalledWith(2, 'version-with-prefix', 'v1.2.4')
    expect(core.setOutput).toHaveBeenNthCalledWith(3, 'major', 1)
    expect(core.setOutput).toHaveBeenNthCalledWith(4, 'major-with-prefix', 'v1')
    expect(core.setOutput).toHaveBeenNthCalledWith(5, 'minor', 2)
    expect(core.setOutput).toHaveBeenNthCalledWith(6, 'patch', 4)
    expect(core.setOutput).toHaveBeenNthCalledWith(7, 'bump', 'patch')
  })
})
