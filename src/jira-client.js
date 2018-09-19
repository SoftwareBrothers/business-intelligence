const axios = require('axios')

// ID of IN PROGRESS project catogory
const IN_PROGRESS = 10000

class Jira {
  constructor({
    host, user, token, version = 3,
  }) {
    this.version = version
    this.client = new axios.create({
      baseURL: `https://${host}.atlassian.net/rest/api/${this.version}`,
      auth: {
        username: user,
        password: token,
      },
    })
  }

  async projects() {
    const response = await this.client.get('project/search', {
      params: { categoryId: IN_PROGRESS },
    })
    return response.data.values
  }

  async categories() {
    return await this.client.get('projectCategory')
  }
}

module.exports = Jira
