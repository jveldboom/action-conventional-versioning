# GitHub Action for Automated Versioning with Conventional Commits
GitHub Action to automatically generate version numbers based on [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/)

## Design Decisions
- Easily generate automatic version numbers based on [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) spec.
- Should work with any language or repository structure
- Should be used as a building block and not try to manage the whole versioning process.

## Usage
```yaml
- uses: jveldboom/action-conventional-versioning@v1
  with:
    # GitHub token with read access to repo
    # Default: github.token
    github-token: ''

    # Default version bump (major, minor or patch)
    # Used when no conventional commits are found or when commit messages
    # don't match the conventional commits format
    # Default: patch
    default-bump: ''

    # Ignore draft releases when calculating the next version (true or false)
    # Default: false
    ignore-drafts: ''

    # Ignore prereleases when calculating the next version (true or false)
    # Default: false
    ignore-prereleases: ''

    # Newline-separated list of commit scopes to include. When set, only commits
    # with a matching scope influence the version bump.
    # Default: ''
    include-scopes: ''

    # Newline-separated list of commit scopes to exclude. Commits with a matching
    # scope are ignored (useful for suppressing noisy scopes like `deps`).
    # Default: ''
    exclude-scopes: ''

    # Ignore conventional commits that have no scope (true or false)
    # Default: false
    exclude-unscoped-commits: ''

    # Highest major version the action may release (non-negative integer).
    # A bump that would exceed it is downgraded to minor and a warning is logged.
    # Default: '' (no limit)
    max-major-version: ''
```

### Filtering by commit scope
Restrict which commits influence the version bump using conventional-commit scopes.

```yaml
- uses: jveldboom/action-conventional-versioning@v1
  with:
    # Only commits scoped to `api` or `core` count toward the bump.
    # Omit to consider every commit.
    include-scopes: |
      api
      core

    # Drop commits with these scopes (e.g. Dependabot noise).
    # Applied after include-scopes, so you can allow a broad set and still
    # remove specific scopes from within it.
    exclude-scopes: |
      deps
      docs
```

### Limiting the major version
Make a major release a deliberate act by setting a ceiling on the major version.

```yaml
- uses: jveldboom/action-conventional-versioning@v1
  with:
    max-major-version: 1
```

With latest release `1.4.2` and a cap of `1`, a breaking change produces `1.5.0` instead of `2.0.0`. Raise the cap in your workflow to release `2.0.0`.

- The cap also applies to `default-bump: major` and to the first release when no previous release exists (a cap of `0` keeps versions on `0.x`).
- When a bump is capped, the action logs a warning naming the commit(s) that requested the major bump. It does not fail.
- The `bump` output reflects the capped value (`minor`).
- Non-integer or negative values fail the step.
- If the latest release is already above the cap, the bump is still downgraded to minor on that major line. Releasing from maintenance branches is not supported.

## Outputs
| Name | Description |
|------|-------------|
| `version` | full semantic version number (`1.2.3`) |
| `version-with-prefix` | version number with `v` prefix (`v1.2.3`) |
| `previous-version` | previous version used for the bump (`1.2.2`) |
| `previous-version-with-prefix` | previous version with `v` prefix (`v1.2.2`) |
| `major` | major version number |
| `major-with-prefix` | major version number with `v` prefix (`v1`) |
| `minor` | minor version number |
| `patch` | patch version number |
| `bump` | version bump type (major, minor, or patch) |

## Example Use-Cases
### Auto version on any push to the `main` branch
This example will create a new GitHub release on any push to the `main` branch as well as update the floating major version (eg `v1`).

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
      - uses: actions/checkout@v4

      - uses: jveldboom/action-conventional-versioning@v1
        id: version

      - name: Create GitHub Release
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release create "${{ steps.version.outputs.version-with-prefix }}" \
            --generate-notes \
            --notes-start-tag "${{ steps.version.outputs.previous-version-with-prefix }}"

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
I'll take all the help I can get so please feel free to contribute in any way! Spelling & grammar errors, improve testing.

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

## Notes
- Commit Analyzer https://github.com/semantic-release/commit-analyzer#releaserules
- Other Alternatives
  - https://github.com/mathieudutour/github-tag-action
  - https://github.com/absolute-version/commit-and-tag-version/issues

## License
This action is licensed under the MIT License. See the [LICENSE](./LICENSE) file for more information.
