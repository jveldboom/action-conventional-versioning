/* eslint-env jest */
const github = require('./github')

const mockOctokit = {
  request: jest.fn()
}

jest.spyOn(mockOctokit, 'request')

jest.mock('@actions/github', () => {
  return {
    getOctokit: jest.fn(() => mockOctokit)
  }
})

describe('github', () => {
  afterEach(() => { jest.clearAllMocks() })

  describe('getOctokit', () => {
    it('wraps @actions/github\'s getOctokit', () => {
      expect(github.getOctokit()).toBe(mockOctokit)
    })
  })

  describe('getLatestRelease()', () => {
    it('should return undefined when no releases', async () => {
      const rel = await github.getLatestRelease({ octokit: mockOctokit, owner: 'owner', repo: 'repo' })
      expect(rel).toBe(undefined)
    })

    it('should return a single release', async () => {
      mockOctokit.request.mockImplementation(() => {
        return {
          data: [
            { name: 'v1.0' },
            { name: 'v1.2' },
            { name: 'v1.3' }
          ]
        }
      })

      const rel = await github.getLatestRelease({ octokit: mockOctokit, owner: 'owner', repo: 'repo' })
      expect(rel).toStrictEqual({ name: 'v1.0' })
    })

    it('rethrows API errors with endpoint context and status', async () => {
      const apiErr = new Error('Not Found')
      apiErr.status = 404
      mockOctokit.request.mockImplementation(() => { throw apiErr })

      await expect(
        github.getLatestRelease({ octokit: mockOctokit, owner: 'owner', repo: 'repo' })
      ).rejects.toThrow('failed to list releases for owner/repo [404]: Not Found')
    })

    it('rethrows API errors without status when unavailable', async () => {
      mockOctokit.request.mockImplementation(() => { throw new Error('network down') })

      await expect(
        github.getLatestRelease({ octokit: mockOctokit, owner: 'owner', repo: 'repo' })
      ).rejects.toThrow('failed to list releases for owner/repo: network down')
    })
  })

  describe('filterAndSortReleases()', () => {
    it('should return undefined when no releases', () => {
      const res = github.filterAndSortReleases({})
      expect(res).toBe(undefined)
    })

    it('should filter out draft releases and return single release', () => {
      const releases = [
        { name: 'v1.0.0', draft: true, prerelease: false },
        { name: 'v1.1.0', draft: false, prerelease: false },
        { name: 'v1.2.0', draft: false, prerelease: false }
      ]
      const res = github.filterAndSortReleases({ releases, ignoreDrafts: true })
      expect(res).toStrictEqual(releases[1])
    })

    it('should filter out prereleases and return single release', () => {
      const releases = [
        { name: 'v1.0.0', draft: false, prerelease: true },
        { name: 'v1.1.0', draft: false, prerelease: true },
        { name: 'v1.2.0', draft: false, prerelease: false }
      ]
      const res = github.filterAndSortReleases({ releases, ignorePrereleases: true })
      expect(res).toStrictEqual(releases[2])
    })

    it('should filter out draft & prereleases and return single release', () => {
      const releases = [
        { name: 'v1.0.0', draft: true, prerelease: false },
        { name: 'v1.1.0', draft: false, prerelease: true },
        { name: 'v1.2.0', draft: false, prerelease: false },
        { name: 'v1.3.0', draft: true, prerelease: true }

      ]
      const res = github.filterAndSortReleases({ releases, ignoreDrafts: true, ignorePrereleases: true })
      expect(res).toStrictEqual(releases[2])
    })

    it('should filter out all releases and return undefined', () => {
      const releases = [
        { name: 'v1.0.0', draft: true, prerelease: false },
        { name: 'v1.1.0', draft: false, prerelease: true },
        { name: 'v1.3.0', draft: true, prerelease: true }
      ]
      const res = github.filterAndSortReleases({ releases, ignoreDrafts: true, ignorePrereleases: true })
      expect(res).toStrictEqual(undefined)
    })
  })

  describe('compareCommits', () => {
    let result

    beforeEach(async () => {
      mockOctokit.request.mockImplementation(() => {
        return {
          data: {
            commits: [{
              sha: 'commit-sha',
              commit: {
                message: 'commit-message'
              }
            }]
          }
        }
      })

      result = await github.compareCommits(mockOctokit, 'owner', 'repo', 'base', 'head')
    })

    it('fetches a comparison of the specified base and head commits via the GitHub API', () => {
      expect(mockOctokit.request).toHaveBeenCalledWith('GET /repos/{owner}/{repo}/compare/{basehead}', {
        owner: 'owner',
        repo: 'repo',
        basehead: 'base...head'
      })
    })

    it('returns a list of commits', () => {
      expect(result).toStrictEqual([{
        message: 'commit-message',
        sha: 'commit-sha'
      }])
    })

    it('rethrows API errors with endpoint context and status', async () => {
      const apiErr = new Error('Not Found')
      apiErr.response = { status: 404 }
      mockOctokit.request.mockImplementation(() => { throw apiErr })

      await expect(
        github.compareCommits(mockOctokit, 'owner', 'repo', 'v1.0.0', 'abc123')
      ).rejects.toThrow('failed to compare v1.0.0...abc123 for owner/repo [404]: Not Found')
    })
  })
})
