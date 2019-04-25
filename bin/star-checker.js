const Octokit = require('@octokit/rest')

const octokit = new Octokit()

const run = async () => {
  const ret = await octokit.repos.listForOrg({
    org: 'softwarebrothers',
    type: 'public',
  })
  const languages = ['TypeScript', 'JavaScript', 'Dockerfile', 'Vue', 'CoffeeScript']
  const repos = ret.data.filter(a => languages.includes(a.language))
  console.log(repos.reduce((m, d) => m + d.stargazers_count, 0))

  const popular = repos.map(r => ({
    name: r.name,
    language: r.language,
    stars: r.stargazers_count,
  })).sort((a, b) => b.stars < a.stars ? -1 : 1).slice(0, 10)
  console.log(popular)
}

run()
