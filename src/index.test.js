/* eslint-env jest */
const core = require('@actions/core')
const github = require('./github')

jest.mock('./github')
jest.spyOn(core, 'getInput')
jest.spyOn(core, 'setFailed')
jest.spyOn(core, 'setOutput')

const index = require('./index')

describe.skip('index', () => {
  beforeEach(() => {
    process.env.GITHUB_REPOSITORY = 'foo/bar'
    process.env['INPUT_GITHUB-TOKEN'] = 'test-token'
    process.env['INPUT_DEFAULT-BUMP'] = 'patch'
    process.env.INPUT_PREFIX = 'v'
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should fail when unable to get latest tag', async () => {
    github.getLatestTag.mockRejectedValueOnce(new Error('test error'))

    await index.run()
    expect(core.setFailed).toBeCalledTimes(1)
  })

  it('should output default version bump (0.0.1) if no previous tags', async () => {
    github.getLatestTag.mockResolvedValueOnce()

    await index.run()
    expect(core.getInput).toHaveBeenNthCalledWith(2, 'default-bump')
    expect(core.getInput).toHaveNthReturnedWith(2, 'patch')

    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'version', '0.0.1')
    expect(core.setOutput).toHaveBeenNthCalledWith(2, 'version-with-prefix', 'v0.0.1')
    expect(core.setOutput).toHaveBeenNthCalledWith(3, 'major', 0)
    expect(core.setOutput).toHaveBeenNthCalledWith(4, 'major-with-prefix', 'v0')
    expect(core.setOutput).toHaveBeenNthCalledWith(5, 'minor', 0)
    expect(core.setOutput).toHaveBeenNthCalledWith(6, 'patch', 1)
  })

  it('should fail when latest tag is no valid semver', async () => {
    github.getLatestTag.mockResolvedValueOnce('invalid-semver')

    await index.run()
    expect(core.setFailed).toBeCalledTimes(1)
    expect(core.setFailed).toHaveBeenNthCalledWith(1, 'latest tag name is not valid semver: "invalid-semver"')
  })

  it('should output versions', async () => {
    const latestTag = {
      name: 'v1.2.3',
      commit: { sha: '123456789' }
    }
    github.getLatestTag.mockResolvedValueOnce(latestTag)
    github.compareCommits.mockResolvedValueOnce([])

    await index.run()

    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'version', '1.2.4')
    expect(core.setOutput).toHaveBeenNthCalledWith(2, 'version-with-prefix', 'v1.2.4')
    expect(core.setOutput).toHaveBeenNthCalledWith(3, 'major', 1)
    expect(core.setOutput).toHaveBeenNthCalledWith(4, 'major-with-prefix', 'v1')
    expect(core.setOutput).toHaveBeenNthCalledWith(5, 'minor', 2)
    expect(core.setOutput).toHaveBeenNthCalledWith(6, 'patch', 4)
  })
})
