const core = require('@actions/core')
const semver = require('semver')
const commit = require('@semantic-release/commit-analyzer')

/**
 * Output version details
 * @param {object} options
 * @param {string} options.version version number
 * @param {string} options.bump version bump name (major, minor, patch)
 * @param {string} options.previousVersion previous version used for the bump
 */
const setVersionOutputs = ({ version, bump, previousVersion }) => {
  const output = semver.parse(version)
  const prevOutput = semver.parse(previousVersion)

  core.setOutput('version', output.version)
  core.setOutput('version-with-prefix', `v${output.version}`)
  core.setOutput('previous-version', prevOutput.version)
  core.setOutput('previous-version-with-prefix', `v${prevOutput.version}`)
  core.setOutput('major', output.major)
  core.setOutput('major-with-prefix', `v${output.major}`)
  core.setOutput('minor', output.minor)
  core.setOutput('patch', output.patch)
  core.setOutput('bump', bump)
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
 * Filter commits by their conventional-commit scope.
 * @param {Array.<object>} commits [{ message, sha }]
 * @param {object} [options]
 * @param {Array.<string>} [options.includeScopes] only keep commits whose scope is in this list
 * @param {Array.<string>} [options.excludeScopes] drop commits whose scope is in this list
 * @param {boolean} [options.excludeUnscoped] drop commits with no scope
 * @returns {Array.<object>} filtered commits
 */
const filterCommitsByScope = (commits = [], { includeScopes = [], excludeScopes = [], excludeUnscoped = false } = {}) => {
  const hasInclude = includeScopes.length > 0
  const hasExclude = excludeScopes.length > 0
  if (!hasInclude && !hasExclude && !excludeUnscoped) return commits

  return commits.filter(({ message }) => {
    const header = (message || '').split('\n', 1)[0]
    const match = header.match(parserOpts.headerPattern)
    // Non-conventional messages fall through: commit-analyzer may still assign
    // a release (e.g. reverts, BREAKING CHANGE footers), so scope filters do
    // not apply.
    if (!match) return true
    const scope = match[2]

    if (excludeUnscoped && !scope) return false
    if (hasInclude && !includeScopes.includes(scope)) return false
    if (hasExclude && excludeScopes.includes(scope)) return false
    return true
  })
}

/**
 * Get version bump/increment type based on commit messages
 * @param {Array.<object>} commits [{ message, sha }]
 * @param {string} defaultBump bump type (major, minor, patch)
 * @param {object} [filterOpts] options passed to filterCommitsByScope
 * @returns
 */
const getVersionBump = async (commits = [], defaultBump = 'patch', filterOpts = {}) => {
  const filtered = filterCommitsByScope(commits, filterOpts)
  let bump = await commit.analyzeCommits({ parserOpts }, { commits: filtered, logger: { log: () => undefined } })
  if (!bump) bump = defaultBump

  return bump
}

module.exports = {
  setVersionOutputs,
  parserOpts,
  filterCommitsByScope,
  getVersionBump
}
