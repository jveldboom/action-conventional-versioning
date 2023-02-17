const github = require('@actions/github')

const getOctokit = (token) => {
  return github.getOctokit(token)
}

const getLatestRelease = async ({ octokit, owner, repo, ignoreDrafts = false, ignorePrereleases = false }) => {
  const res = await octokit.request('GET /repos/{owner}/{repo}/releases', {
    owner,
    repo
  })

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
