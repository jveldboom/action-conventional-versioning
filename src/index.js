const core = require('@actions/core')
const run = require('./run'); // semicolon is intentional for standardjs

(async () => {
  try {
    await run()
  } catch (err) {
    core.setFailed(err.message)
  }
})()
