# GitHub Action for automated Versioning with Conventional Commits
GitHub Action to automatically generate version numbers based on [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/)

Design Descisions
- Easily generate automatic version numbers based on [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) spec.
- Should work with any language or repository structure
- Should be used a building block instead of handling the whole process. Such as tagging, release notes, or publising artifacts

## Usage
```yaml
# coming soon
```


## Contributing
More details coming soon...

## TODO
- Compete unit tests and strive for 100% test coverage
- GitHub workflow to run unit tests
- Workflow to check dist is built - [reference](https://github.com/jveldboom/action-aws-apigw-oidc-request/blob/main/.github/workflows/pull-request.yaml#L29-L34)
- Workflow to run integration testing with compiled action

## Notes
- Commit Analyzer https://github.com/semantic-release/commit-analyzer#releaserules
- Other Alternatives
  - https://github.com/mathieudutour/github-tag-action
  - https://github.com/absolute-version/commit-and-tag-version/issues