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
    if (!match) {
      // Non-conventional headers cannot be verified against an include
      // allowlist, so drop them when one is active. Otherwise let commit-
      // analyzer decide (e.g. reverts, BREAKING CHANGE footers).
      return !hasInclude
    }
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

/**
 * Get the commits (after scope filtering) that request a major bump.
 * Commits cancelled by a later revert are excluded, matching the revert
 * filtering analyzeCommits applies to the full list.
 * @param {Array.<object>} commits [{ message, sha }]
 * @param {object} [filterOpts] options passed to filterCommitsByScope
 * @returns {Promise<Array.<object>>} commits that remain major after revert filtering
 */
const getMajorCommits = async (commits = [], filterOpts = {}) => {
  const filtered = filterCommitsByScope(commits, filterOpts)
  const analyze = (list) => commit.analyzeCommits({ parserOpts }, { commits: list, logger: { log: () => undefined } })

  const alone = await Promise.all(filtered.map(async c => (await analyze([c])) === 'major'))
  const majors = filtered.filter((c, i) => alone[i])
  const others = filtered.filter((c, i) => !alone[i])

  // A major commit survives only if it is still major when analyzed alongside
  // the non-major commits (which include any reverts that could cancel it).
  const survivors = await Promise.all(majors.map(async c => (await analyze([...others, c])) === 'major'))
  return majors.filter((c, i) => survivors[i])
}

/**
 * Parse and validate the max-major-version input
 * @param {string} raw raw input value
 * @returns {number|null} the cap, or null when unset
 */
const parseMaxMajorVersion = (raw) => {
  const value = (raw || '').trim()
  if (value === '') return null
  if (!/^\d+$/.test(value)) {
    throw new Error(`max-major-version must be a non-negative integer, got "${raw}"`)
  }
  return parseInt(value, 10)
}

/**
 * Downgrade a major bump to minor when it would exceed the max major version.
 * Only warns; never fails.
 * @param {object} options
 * @param {string} options.previousVersion version the bump is applied to
 * @param {string} options.bump requested bump (major, minor, patch)
 * @param {number|null} options.maxMajor cap from parseMaxMajorVersion
 * @param {Array.<object>} [options.offenders] commits that requested the major bump
 * @returns {string} the bump to apply
 */
const applyMajorCap = ({ previousVersion, bump, maxMajor, offenders = [] }) => {
  if (maxMajor === null || maxMajor === undefined || bump !== 'major') return bump
  const nextMajor = semver.parse(semver.inc(previousVersion, 'major')).major
  if (nextMajor <= maxMajor) return bump

  const source = offenders.length > 0
    ? `requested by commit(s): ${offenders.map(c => (c.sha || '').slice(0, 7) || 'unknown').join(', ')}`
    : 'requested by default-bump'
  core.warning(`Major bump (${previousVersion} -> ${nextMajor}.0.0) exceeds max-major-version ${maxMajor}; downgrading to minor. Major bump ${source}`)
  return 'minor'
}

module.exports = {
  getMajorCommits,
  parseMaxMajorVersion,
  applyMajorCap,
  setVersionOutputs,
  parserOpts,
  filterCommitsByScope,
  getVersionBump
}
