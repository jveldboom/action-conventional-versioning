const github = require('@actions/github')

const getOctokit = () => {
  return github.getOctokit(process.env.GITHUB_TOKEN)
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

module.exports = {
  getOctokit,
  getLatestTag,
  compareCommits
}
