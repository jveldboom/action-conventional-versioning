const core = require('@actions/core')
const semver = require('semver')
const commit = require('@semantic-release/commit-analyzer')

/**
 * Output version spec
 * @param {string} version version number
 * @param {string} prefix version prefix
 */
const setVersionOutputs = (version, prefix) => {
  const output = semver.parse(`${prefix}${version}`)

  core.setOutput('version', output.version)
  core.setOutput('version-with-prefix', `${prefix}${output.version}`)
  core.setOutput('major', output.major)
  core.setOutput('minor', output.minor)
  core.setOutput('patch', output.patch)
}

/**
 * Version analyze conventional commit parser options
 * https://github.com/conventional-changelog/conventional-changelog/blob/master/packages/conventional-changelog-conventionalcommits/parser-opts.js
 */
const parserOpts = {
  headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
  breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/,
  headerCorrespondence: [
    'type',
    'scope',
    'subject'
  ],
  noteKeywords: ['BREAKING CHANGE', 'BREAKING-CHANGE'],
  revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w*)\./i,
  revertCorrespondence: ['header', 'hash']
}

/**
 * Get version bump/increment type based on commit messages
 * @param {Array.<object>} commits [{ message, sha }]
 * @param {string} defaultBump bump type (major, minor, patch)
 * @returns
 */
const getVersionBump = async (commits = [], defaultBump = 'patch') => {
  let bump = await commit.analyzeCommits({ parserOpts }, { commits, logger: { log: () => undefined } })
  if (!bump) bump = defaultBump

  return bump
}

module.exports = {
  setVersionOutputs,
  parserOpts,
  getVersionBump
}
