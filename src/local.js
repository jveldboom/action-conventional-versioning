process.env['INPUT_GITHUB-TOKEN'] = process.env.GITHUB_TOKEN
process.env.GITHUB_REPOSITORY = 'jveldboom/action-conventional-versioning'
process.env.GITHUB_SHA = '9979f8482f38936b74c942a7210dd1caf771eafe'
process.env['INPUT_DEFAULT-BUMP'] = 'minor'
process.env['INPUT_IGNORE-DRAFTS'] = false
process.env['INPUT_IGNORE-PRERELEASES'] = false
require('./index')
