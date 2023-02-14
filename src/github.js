const github = require('@actions/github')

const getOctokit = (token) => {
  return github.getOctokit(token)
}

const getLatestRelease = async (octokit, owner, repo, ignoreDraft = false, ignorePrerelease = false) => {
  const res = await octokit.request('GET /repos/{owner}/{repo}/releases', {
    owner,
    repo
  })

  if (res?.data?.length < 1) return
  return filterAndSortReleases(res.data)
}

const filterAndSortReleases = ({ releases = [], ignoreDraft = false, ignorePrerelease = false }) => {
  // apply filters to releases
  if (ignoreDraft) releases = releases.filter(res => res.draft === false)
  if (ignorePrerelease) releases = releases.filter(res => res.prerelease === false)

  // return early if all releases were filtered out
  if (releases.length === 0) return

  // GH API should return sorted by 'created_at' (https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#get-the-latest-release)
  // but double checking since we are doing filtering above
  releases.sort((a, b) => a.created_at < b.created_at ? 1 : -1)
  return releases[0]
}

const compareCommits = async (octokit, owner, repo, base, head) => {
  const res = await octokit.request('GET /repos/{owner}/{repo}/compare/{basehead}', {
    owner,
    repo,
    basehead: `${base}...${head}`
  })

  return res.data.commits.map(c => {
    return {
      message: c.commit.message,
      sha: c.sha
    }
  })
}

const createRelease = async (octokit, owner, repo, tag) => {
  return await octokit.request('POST /repos/{owner}/{repo}/releases', {
    owner,
    repo,
    tag_name: tag,
    generate_release_notes: true
  })
}

module.exports = {
  getOctokit,
  getLatestRelease,
  filterAndSortReleases,
  compareCommits,
  createRelease
}
