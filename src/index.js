const semver = require('semver')
const core = require('@actions/core')
const github = require('./github')
const utils = require('./utils')

const run = async () => {
  const octokit = github.getOctokit(core.getInput('github-token'))

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
  const sha = process.env.GITHUB_SHA

  let latestTag
  try {
    latestTag = await github.getLatestTag(octokit, owner, repo)
  } catch (err) {
    return core.setFailed(`unable to get latest tag - error: ${err.message} ${err?.response?.status}`)
  }

  // return a default version if no previous github tags
  if (!latestTag) {
    const incrementedVersion = semver.inc('0.0.0', core.getInput('default-bump'))
    return utils.setVersionOutputs(incrementedVersion, core.getInput('prefix'))
  }

  if (!semver.valid(latestTag.name)) {
    return core.setFailed(`latest tag name is not valid semver: ${JSON.stringify(latestTag)}`)
  }

  // get commits from last tag and calculate version bump
  const commits = await github.compareCommits(octokit, owner, repo, latestTag?.commit?.sha, sha)
  const bump = await utils.getVersionBump(commits, core.getInput('default-bump'))

  const incrementedVersion = semver.inc(latestTag.name, bump)
  utils.setVersionOutputs(incrementedVersion, core.getInput('prefix'))
}

if (process.env.NODE_ENV !== 'test') run()

module.exports = { run }
