const github = require('@actions/github')

const getOctokit = (token) => {
  return github.getOctokit(token)
}

const getLatestTag = async (octokit, owner, repo) => {
  const res = await octokit.request('GET /repos/{owner}/{repo}/tags?per_page=1', {
    owner,
    repo
  })

  if (res.data.length >= 1) return res.data[0]
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
  getLatestTag,
  compareCommits,
  createRelease
}
