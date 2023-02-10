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
  describe('getOctokit', () => {
    it('wraps @actions/github\'s getOctokit', () => {
      expect(github.getOctokit()).toBe(mockOctokit)
    })
  })

  describe('getLatestTag', () => {
    let tag

    afterEach(() => {
      tag = undefined
    })

    describe('when the targeted repo has existing tags', () => {
      beforeEach(async () => {
        mockOctokit.request.mockImplementation(() => {
          return {
            data: ['1.0.0']
          }
        })

        tag = await github.getLatestTag(mockOctokit, 'owner', 'repo')
      })

      it('fetches the repo\'s tags via the GitHub API', () => {
        expect(mockOctokit.request).toHaveBeenCalledWith('GET /repos/{owner}/{repo}/tags?per_page=1', {
          owner: 'owner',
          repo: 'repo'
        })
      })

      it('returns the latest tag returned by the GitHub API', () => {
        expect(tag).toBe('1.0.0')
      })
    })

    describe('when the targeted repo has no existing tags', () => {
      beforeEach(async () => {
        mockOctokit.request.mockImplementation(() => {
          return {
            data: []
          }
        })

        tag = await github.getLatestTag(mockOctokit, 'owner', 'repo')
      })

      it('fetches the repo\'s tags via the GitHub API', () => {
        expect(mockOctokit.request).toHaveBeenCalledWith('GET /repos/{owner}/{repo}/tags?per_page=1', {
          owner: 'owner',
          repo: 'repo'
        })
      })

      it('returns undefined', () => {
        expect(tag).toBe(undefined)
      })
    })

    describe('when the underlying octokit API request fails', () => {
      it('throws an error', async () => {
        const result = 'error'

        mockOctokit.request.mockRejectedValueOnce(result)

        await expect(github.getLatestTag(mockOctokit, 'owner', 'repo')).rejects.toMatch(result)
      })
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
  })

  describe('createRelease', () => {
    let result

    beforeEach(async () => {
      mockOctokit.request.mockImplementation(() => 'success')

      result = await github.createRelease(mockOctokit, 'owner', 'repo', '1.0.0')
    })

    it('creates a release via the GitHub API', () => {
      expect(mockOctokit.request).toHaveBeenCalledWith('POST /repos/{owner}/{repo}/releases', {
        owner: 'owner',
        repo: 'repo',
        tag_name: '1.0.0',
        generate_release_notes: true
      })
    })

    it('returns the result of the underlying octokit GitHub API request', () => {
      expect(result).toBe('success')
    })
  })

})
