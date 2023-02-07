process.env['INPUT_GITHUB-TOKEN'] = process.env.GITHUB_TOKEN
process.env.GITHUB_REPOSITORY = 'jveldboom/version-testing'
process.env.GITHUB_SHA = '5f2b80818f3ec006216a7dd4311168c3f1020071'
process.env['INPUT_VERSION-PREFIX'] = 'v'
require('./index')
