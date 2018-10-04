const axios = require('axios')

const DEVELOPMENT_TEAM = 6

class Tempo {
  constructor({ token, version = 2 }) {
    this.version = version
    this.client = new axios.create({
      baseURL: `https://api.tempo.io/${this.version}`,
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  /**
   * Returns members of development team
   * @return {Object} {self, username, displayName}
   */
  async members() {
    const response = await this.client.get(`teams/${DEVELOPMENT_TEAM}/members`)
    return response.data.results.map(m => m.member)
  }

  async accounts() {
    const response = await this.client.get('accounts')
    return response.data.results
  }

  async accountLinks() {
    const response = await this.client.get('account-links')
    return response.data.results
  }

  async plans({ username, from, to }) {
    const response = await this.client.get(`plans/user/${username}`, {
      params: { from, to },
    })
    return response.data.results
  }

  async userWorklogs({ username, from, to, limit = 500, offset = 0 }) {
    const response = await this.client.get(`worklogs/user/${username}`, {
      params: {
        from, to, limit, offset,
      },
    })
    let worklogs = response.data.results
    if (response.data.metadata.next) {
      worklogs = worklogs.concat(this.userWorklogs({
        username, from, to, limit,
        offset: offset + limit,
      }))
    }
    return worklogs
  }

  async projectWorklogs({ projectKey, from, to, limit = 100, offset = 0 }) {
    const response = await this.client.get(`worklogs/project/${projectKey}`, {
      params: {
        from, to, limit, offset,
      },
    })

    let worklogs = response.data.results
    if (response.data.metadata.next) {
      worklogs = worklogs.concat(await this.projectWorklogs({
        projectKey, from, to, limit,
        offset: offset + limit,
      }))
    }
    return worklogs
  }

  async accounts() {
    const response = await this.client.get('accounts', { params: { status: 'OPEN' } })
    return response.data.results
  }

  async schedule({ username, from, to }) {
    const response = await this.client.get(`/user-schedule/${username}`, {
      params: { from, to },
    })
    return response.data.results
  }

  async accountProjectIds(key) {
    const response = await this.client.get(['accounts', key, 'links'].join('/'))
    return response.data.results.filter(r => r.scope.type === 'PROJECT').map(r => r.scope.id)
  }
}

module.exports = Tempo
