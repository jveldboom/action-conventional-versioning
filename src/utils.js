const core = require('@actions/core')
const semver = require('semver')

const setVersionOutputs = (version, prefix) => {
  const output = semver.parse(`${prefix}${version}`)

  core.setOutput('version', output.version)
  core.setOutput('version-with-prefix', output.raw)
  core.setOutput('major', output.major)
  core.setOutput('minor', output.minor)
  core.setOutput('patch', output.patch)
}

module.exports = {
  setVersionOutputs
}
