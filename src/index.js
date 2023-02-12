const core = require('@actions/core')
const run = require('./run')

try {
  run()
} catch (err) {
  core.setFailed(err.message)
}
