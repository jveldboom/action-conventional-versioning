# GitHub Action for Automated Versioning with Conventional Commits
GitHub Action to automatically generate version numbers based on [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/)

Design Descisions
- Easily generate automatic version numbers based on [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) spec.
- Should work with any language or repository structure
- Should be used a building block and not try to manage the whole versioning process. (although may handle optional tagging in the future with the `mode` input)

## Usage
```yaml
- uses: jveldboom/action-conventional-versioning@v1
  with:
    # GitHub token with read access to repo
    # Default: github.token
    github-token: ''

    # Default version bump (major, minor or patch)
    # Used when unable to calculate the bump from the commit messages
    # For example when not using conventional commits
    # Default: patch
    default-bump: ''

    # Ignore prereleases when calculating the next version (true or false)
    # Default: false
    ignore-drafts: ''

    # Ignore draft releases when calculating the next version (true or false)
    # Default: false
    ignore-prereleases: ''

    # Set the versioning mode to run (future use-case)
    # Default: default
    mode: ''
```

## Outputs
| Name | Description |
|------|-------------|
`version` | full semantic version number (`1.2.3`)
`version-with-prefix` | version number with `v` prefix (`v1.2.3`)
`previous-version` | previous version used for the bump (`1.2.2`)
`previous-version-with-prefix` | previous version with `v` prefix (`v1.2.2`)
`major` | major version number
`major-with-prefix` | major version number with `v` prefix (`v1`)
`minor` | minor version number
`patch` | patch version number
`bump` | version bump type (major, minor, or patch)

## Example Use-Cases
### Auto version on any push to the `main` branch
This example will create a new GitHub release on any push to the `main` branch as well as update the floating major version (eg `v1`)

```yaml
---
name: release

on:
  push:
    branches:
      - main

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: jveldboom/action-conventional-versioning@v1
        id: version

      - name: Create GitHub Release
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release create "${{ steps.version.outputs.version-with-prefix }}" \
            --generate-notes \
            --target "${{ github.sha }}"

      - name: Update Major Tag
        env:
          MAJOR: ${{ steps.version.outputs.major }}
        run: |
          git tag -d ${MAJOR} || true
          git push origin :refs/tags/${MAJOR}
          git tag ${MAJOR} ${GITHUB_SHA}
          git push origin ${MAJOR}
```

## Contribute
I'll take all the help I can get so please feel free to contribute in anyway! Spelling & grammar errors, improve testing. Please check out the TODO list below for known items I'd like to resolve.

```shell
# install dependencies
yarn install

# unit tests
yarn test:watch

# lint code via standardjs
yarn lint

# build distribution bundle
yarn build
```

## TODO
- [x] Release v1 of action
- [x] Workflow to run regresssion tests with compiled action
- [x] List action in marketplace
- [x] Improve index.js file
  - Should it be simplified and wrapped in a try/catch?
  - How can we get 100% test coverage on it?
- [x] Output version bump (major, minor, patch) No specific use case but I believe it will be useful
- [ ] Add version suffix that are semver
- [ ] Improve integration testing to cover all use-case. May require the ability to pass in a list of commits
- [ ] Better error messaging for all GH API calls.
  - [This call](https://github.com/jveldboom/action-conventional-versioning/blob/main/src/run.js#L36) is currently only caught by outside try/catch

## Notes
- Commit Analyzer https://github.com/semantic-release/commit-analyzer#releaserules
- Other Alternatives
  - https://github.com/mathieudutour/github-tag-action
  - https://github.com/absolute-version/commit-and-tag-version/issues

## License
This action is licensed under the MIT License. See the [LICENSE](./LICENSE) file for more information.
