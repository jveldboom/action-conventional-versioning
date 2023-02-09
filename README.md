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
    # Default: minor
    default-bump: ''

    # Version prefix
    # Default: v
    prefix: ''

    # Set the versioning mode to run (future use-case)
    # Default: default
    mode: ''
```

## Outputs
| Name | Description |
|------|-------------|
`version` | full semantic version number without prefix (`1.2.3`)
`version-with-prefix` | version number with prefix (`v1.2.3`)
`major` | major version number
`major-with-prefix` | major version number with prefix (`v1`)
`minor` | minor version number
`patch` | patch version number

## Example Use-Cases
### Auto version on any push to the `main` branch
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

## TODO
- [ ] Compete unit tests and strive for 100% test coverage
- [x] GitHub workflow to run unit tests
- [x] Workflow to check dist is built
- [ ] Workflow to run regresssion tests with compiled action
- [ ] list action in marketplace

## Notes
- Commit Analyzer https://github.com/semantic-release/commit-analyzer#releaserules
- Other Alternatives
  - https://github.com/mathieudutour/github-tag-action
  - https://github.com/absolute-version/commit-and-tag-version/issues

## License
This action is licensed under the MIT License. See the [LICENSE](./LICENSE) file for more information.