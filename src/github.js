const github = require('@actions/github')

const getOctokit = (token) => {
  return github.getOctokit(token)
}

const getLatestRelease = async ({ octokit, owner, repo, ignoreDrafts = false, ignorePrereleases = false }) => {
  let res
  try {
    res = await octokit.request('GET /repos/{owner}/{repo}/releases', {
      owner,
      repo
    })
  } catch (err) {
    const status = err.status ?? err.response?.status
    throw new Error(`failed to list releases for ${owner}/${repo}${status ? ` [${status}]` : ''}: ${err.message}`, { cause: err })
  }

  if (!Array.isArray(res?.data) || res?.data?.length < 1) return
  return filterAndSortReleases({ releases: res.data, ignoreDrafts, ignorePrereleases })
}

const filterAndSortReleases = ({ releases = [], ignoreDrafts = false, ignorePrereleases = false }) => {
  // apply filters to releases
  if (ignoreDrafts) releases = releases.filter(r => r.draft !== true)
  if (ignorePrereleases) releases = releases.filter(r => r.prerelease !== true)

  // return early if all releases were filtered out
  if (releases.length === 0) return

  return releases[0]
}

const compareCommits = async (octokit, owner, repo, base, head) => {
  let res
  try {
    res = await octokit.request('GET /repos/{owner}/{repo}/compare/{basehead}', {
      owner,
      repo,
      basehead: `${base}...${head}`
    })
  } catch (err) {
    const status = err.status ?? err.response?.status
    throw new Error(`failed to compare ${base}...${head} for ${owner}/${repo}${status ? ` [${status}]` : ''}: ${err.message}`, { cause: err })
  }

  return res.data.commits.map(c => {
    return {
      message: c.commit.message,
      sha: c.sha
    }
  })
}

module.exports = {
  getOctokit,
  getLatestRelease,
  filterAndSortReleases,
  compareCommits
}
