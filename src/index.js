const commit = require('@semantic-release/commit-analyzer')
const semver = require('semver')
const core = require('@actions/core')
const { context } = require('@actions/github')
const github = require('./github')
const utils = require('./utils')

const run = async () => {
  const octokit = github.getOctokit(core.getInput('github-token'))

  const { owner, repo } = context.repo

  let latestTag = ''
  try {
    latestTag = await github.getLatestTag(octokit, owner, repo)
  } catch (err) {
    return core.setFailed(`unable to get latest tag - error: ${err.message} ${err?.response?.status}`)
  }

  console.log('latestTag',latestTag)

  // return a default version if no previous github tags
  if (!latestTag) {
    const incrementedVersion = semver.inc('0.0.0', core.getInput('default-bump'))
    return utils.setVersionOutputs(incrementedVersion, core.getInput('version-prefix'))
  }

  if (!semver.valid(latestTag.name)) {
    return core.setFailed(`latest tag name is not valid semver: ${JSON.stringify(latestTag)}`)
  }

  const commits = await github.compareCommits(octokit, owner, repo, latestTag.commit.sha, context.sha)
  console.log(commits)

  let bump = await commit.analyzeCommits({ preset: 'conventionalcommits' }, { commits, logger: { log: console.info.bind(console) } })
  if (!bump) bump = core.getInput('default-bump')

  const incrementedVersion = semver.inc(latestTag.name, bump)
  utils.setVersionOutputs(incrementedVersion, core.getInput('version-prefix'))
}

run()
