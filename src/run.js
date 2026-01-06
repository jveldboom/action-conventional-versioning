const semver = require('semver')
const core = require('@actions/core')
const github = require('./github')
const utils = require('./utils')

module.exports = async () => {
  const octokit = github.getOctokit(core.getInput('github-token'))

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
  const sha = process.env.GITHUB_SHA

  let latestRelease
  try {
    latestRelease = await github.getLatestRelease({
      octokit,
      owner,
      repo,
      ignoreDrafts: core.getBooleanInput('ignore-drafts'),
      ignorePrereleases: core.getBooleanInput('ignore-prereleases')
    })
  } catch (err) {
    return core.setFailed(`unable to get latest release - error: ${err.message} ${err?.response?.status}`)
  }

  // return a default version if no previous github releases
  if (!latestRelease) {
    const previousVersion = '0.0.0'
    const bump = core.getInput('default-bump')
    const version = semver.inc(previousVersion, bump)
    return utils.setVersionOutputs({ version, bump, previousVersion })
  }

  if (!semver.valid(latestRelease.name)) {
    return core.setFailed(`latest tag name "${latestRelease.name}" is not valid semver. GitHub API response: ${JSON.stringify(latestRelease)}`)
  }

  // get commits from last tag and calculate version bump
  const commits = await github.compareCommits(octokit, owner, repo, latestRelease.tag_name, sha)
  const bump = await utils.getVersionBump(commits, core.getInput('default-bump'))

  const previousVersion = latestRelease.name
  const version = semver.inc(previousVersion, bump)
  utils.setVersionOutputs({ version, bump, previousVersion })
}
