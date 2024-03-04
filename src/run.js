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
    const incrementedVersion = semver.inc('0.0.0', core.getInput('default-bump'))
    return utils.setVersionOutputs(incrementedVersion, core.getInput('default-bump'))
  }

  if (!semver.valid(latestRelease.name)) {
    return core.setFailed(`latest tag name "${latestRelease.name}" is not valid semver. GitHub API response: ${JSON.stringify(latestRelease)}`)
  }

  // get commits from last tag and calculate version bump
  const commits = await github.compareCommits(octokit, owner, repo, latestRelease.target_commitish, sha)
  const bump = await utils.getVersionBump(commits, core.getInput('default-bump'))

  const incrementedVersion = semver.inc(latestRelease.name, bump)
  utils.setVersionOutputs(incrementedVersion, bump)
}
