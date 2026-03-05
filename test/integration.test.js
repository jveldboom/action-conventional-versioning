/* eslint-env jest */
const core = require('@actions/core')
const github = require('../src/github')
const run = require('../src/run')

jest.mock('../src/github')

describe('Integration Tests', () => {
  beforeEach(() => {
    process.env.GITHUB_REPOSITORY = 'test-owner/test-repo'
    process.env.GITHUB_SHA = 'abc123def456'
    process.env['INPUT_GITHUB-TOKEN'] = 'test-token'
    process.env['INPUT_DEFAULT-BUMP'] = 'patch'
    process.env['INPUT_IGNORE-DRAFTS'] = 'false'
    process.env['INPUT_IGNORE-PRERELEASES'] = 'false'
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('No Previous Releases', () => {
    test('returns default version 0.0.1 when no releases exist', async () => {
      github.getLatestRelease.mockResolvedValueOnce(undefined)

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '0.0.1')
      expect(core.setOutput).toHaveBeenCalledWith('version-with-prefix', 'v0.0.1')
      expect(core.setOutput).toHaveBeenCalledWith('previous-version', '0.0.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'patch')
    })

    test('returns 0.1.0 when no releases exist and default-bump is minor', async () => {
      process.env['INPUT_DEFAULT-BUMP'] = 'minor'
      github.getLatestRelease.mockResolvedValueOnce(undefined)

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '0.1.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'minor')
    })

    test('returns 1.0.0 when no releases exist and default-bump is major', async () => {
      process.env['INPUT_DEFAULT-BUMP'] = 'major'
      github.getLatestRelease.mockResolvedValueOnce(undefined)

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '1.0.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'major')
    })
  })

  describe('Conventional Commit Patterns', () => {
    test('feat: triggers minor version bump', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '1.2.3',
        tag_name: 'v1.2.3'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'feat: add new feature', sha: 'abc123' },
        { message: 'chore: update dependencies', sha: 'def456' }
      ])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '1.3.0')
      expect(core.setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'minor')
      expect(core.setOutput).toHaveBeenCalledWith('major', 1)
      expect(core.setOutput).toHaveBeenCalledWith('minor', 3)
      expect(core.setOutput).toHaveBeenCalledWith('patch', 0)
    })

    test('fix: triggers patch version bump', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '2.5.8',
        tag_name: 'v2.5.8'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'fix: resolve bug in validation', sha: 'abc123' },
        { message: 'docs: update README', sha: 'def456' }
      ])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '2.5.9')
      expect(core.setOutput).toHaveBeenCalledWith('previous-version', '2.5.8')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'patch')
    })

    test('breaking change (!) triggers major version bump', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '1.9.5',
        tag_name: 'v1.9.5'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'feat!: breaking API change', sha: 'abc123' },
        { message: 'fix: bug fix', sha: 'def456' }
      ])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '2.0.0')
      expect(core.setOutput).toHaveBeenCalledWith('previous-version', '1.9.5')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'major')
      expect(core.setOutput).toHaveBeenCalledWith('major', 2)
      expect(core.setOutput).toHaveBeenCalledWith('minor', 0)
      expect(core.setOutput).toHaveBeenCalledWith('patch', 0)
    })

    test('BREAKING CHANGE in commit body triggers major bump', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '3.2.1',
        tag_name: 'v3.2.1'
      })
      github.compareCommits.mockResolvedValueOnce([
        {
          message: 'feat: new feature\n\nBREAKING CHANGE: removed old API',
          sha: 'abc123'
        }
      ])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '4.0.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'major')
    })
  })

  describe('Non-Conventional Commits', () => {
    test('uses default-bump when no conventional commits found', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '1.0.0',
        tag_name: 'v1.0.0'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'update stuff', sha: 'abc123' },
        { message: 'refactor code', sha: 'def456' }
      ])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '1.0.1')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'patch')
    })

    test('respects default-bump=minor for non-conventional commits', async () => {
      process.env['INPUT_DEFAULT-BUMP'] = 'minor'
      github.getLatestRelease.mockResolvedValueOnce({
        name: '2.3.4',
        tag_name: 'v2.3.4'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'regular commit', sha: 'abc123' }
      ])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '2.4.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'minor')
    })
  })

  describe('Mixed Commit Types', () => {
    test('highest priority bump wins (feat + fix = minor)', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '1.0.0',
        tag_name: 'v1.0.0'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'fix: bug fix', sha: 'abc123' },
        { message: 'feat: new feature', sha: 'def456' },
        { message: 'chore: maintenance', sha: 'ghi789' }
      ])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '1.1.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'minor')
    })

    test('highest priority bump wins (breaking + feat + fix = major)', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '2.5.3',
        tag_name: 'v2.5.3'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'fix: bug fix', sha: 'abc123' },
        { message: 'feat: new feature', sha: 'def456' },
        { message: 'feat!: breaking change', sha: 'ghi789' }
      ])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '3.0.0')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'major')
    })
  })

  describe('Error Handling', () => {
    test('fails gracefully when unable to fetch releases', async () => {
      const error = new Error('API Error')
      error.response = { status: 404 }
      github.getLatestRelease.mockRejectedValueOnce(error)

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'unable to get latest release - error: API Error 404'
      )
    })

    test('fails when latest release has invalid semver', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: 'invalid-version',
        tag_name: 'invalid-version'
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'latest tag name "invalid-version" is not valid semver. GitHub API response: {"name":"invalid-version","tag_name":"invalid-version"}'
      )
    })

    test('handles releases with v prefix in tag name', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: 'v1.2.3',
        tag_name: 'v1.2.3'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'fix: bug', sha: 'abc123' }
      ])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '1.2.4')
      expect(core.setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
    })
  })

  describe('Draft and Prerelease Handling', () => {
    test('processes draft releases by default', async () => {
      // Note: The actual filtering happens in github.getLatestRelease
      // This test verifies the correct parameters are passed
      github.getLatestRelease.mockResolvedValueOnce({
        name: '2.0.0',
        tag_name: 'v2.0.0',
        draft: true
      })
      github.compareCommits.mockResolvedValueOnce([])

      await run()

      expect(github.getLatestRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          ignoreDrafts: false,
          ignorePrereleases: false
        })
      )
    })

    test('ignores drafts when ignore-drafts is true', async () => {
      process.env['INPUT_IGNORE-DRAFTS'] = 'true'
      github.getLatestRelease.mockResolvedValueOnce({
        name: '1.5.0',
        tag_name: 'v1.5.0'
      })
      github.compareCommits.mockResolvedValueOnce([])

      await run()

      expect(github.getLatestRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          ignoreDrafts: true,
          ignorePrereleases: false
        })
      )
    })

    test('ignores prereleases when ignore-prereleases is true', async () => {
      process.env['INPUT_IGNORE-PRERELEASES'] = 'true'
      github.getLatestRelease.mockResolvedValueOnce({
        name: '1.5.0',
        tag_name: 'v1.5.0'
      })
      github.compareCommits.mockResolvedValueOnce([])

      await run()

      expect(github.getLatestRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          ignoreDrafts: false,
          ignorePrereleases: true
        })
      )
    })

    test('ignores both drafts and prereleases when both flags are true', async () => {
      process.env['INPUT_IGNORE-DRAFTS'] = 'true'
      process.env['INPUT_IGNORE-PRERELEASES'] = 'true'
      github.getLatestRelease.mockResolvedValueOnce({
        name: '1.0.0',
        tag_name: 'v1.0.0'
      })
      github.compareCommits.mockResolvedValueOnce([])

      await run()

      expect(github.getLatestRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          ignoreDrafts: true,
          ignorePrereleases: true
        })
      )
    })
  })

  describe('Version Output Format', () => {
    test('outputs all version formats correctly', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '3.7.9',
        tag_name: 'v3.7.9'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'feat: new feature', sha: 'abc123' }
      ])

      await run()

      // New version: 3.8.0
      expect(core.setOutput).toHaveBeenCalledWith('version', '3.8.0')
      expect(core.setOutput).toHaveBeenCalledWith('version-with-prefix', 'v3.8.0')
      expect(core.setOutput).toHaveBeenCalledWith('major', 3)
      expect(core.setOutput).toHaveBeenCalledWith('major-with-prefix', 'v3')
      expect(core.setOutput).toHaveBeenCalledWith('minor', 8)
      expect(core.setOutput).toHaveBeenCalledWith('patch', 0)

      // Previous version: 3.7.9
      expect(core.setOutput).toHaveBeenCalledWith('previous-version', '3.7.9')
      expect(core.setOutput).toHaveBeenCalledWith('previous-version-with-prefix', 'v3.7.9')

      // Bump type
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'minor')
    })

    test('handles major version bump output correctly', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '5.3.2',
        tag_name: 'v5.3.2'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'feat!: breaking change', sha: 'abc123' }
      ])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '6.0.0')
      expect(core.setOutput).toHaveBeenCalledWith('major', 6)
      expect(core.setOutput).toHaveBeenCalledWith('major-with-prefix', 'v6')
      expect(core.setOutput).toHaveBeenCalledWith('minor', 0)
      expect(core.setOutput).toHaveBeenCalledWith('patch', 0)
    })
  })

  describe('Edge Cases', () => {
    test('handles empty commit list', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '1.0.0',
        tag_name: 'v1.0.0'
      })
      github.compareCommits.mockResolvedValueOnce([])

      await run()

      // Should use default bump
      expect(core.setOutput).toHaveBeenCalledWith('version', '1.0.1')
      expect(core.setOutput).toHaveBeenCalledWith('bump', 'patch')
    })

    test('handles version with prerelease suffix', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '2.0.0-beta.1',
        tag_name: 'v2.0.0-beta.1'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'fix: bug fix', sha: 'abc123' }
      ])

      await run()

      // Note: semver.inc() on a prerelease version removes the prerelease tag
      // A patch bump on 2.0.0-beta.1 becomes 2.0.0, not 2.0.0-beta.2
      expect(core.setOutput).toHaveBeenCalledWith('version', '2.0.0')
      expect(core.setOutput).toHaveBeenCalledWith('previous-version', '2.0.0-beta.1')
    })

    test('handles large version numbers', async () => {
      github.getLatestRelease.mockResolvedValueOnce({
        name: '99.99.99',
        tag_name: 'v99.99.99'
      })
      github.compareCommits.mockResolvedValueOnce([
        { message: 'fix: bug', sha: 'abc123' }
      ])

      await run()

      expect(core.setOutput).toHaveBeenCalledWith('version', '99.99.100')
    })
  })
})
