const axios = require('axios')

const DEVELOPMENT_TEAM = 6

class Tempo {
  constructor({ token, version = 3 }) {
    this.version = version
    this.client = axios.create({
      baseURL: `https://api.tempo.io/core/${this.version}`,
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

  async accountLinks() {
    const response = await this.client.get('account-links')
    return response.data.results
  }

  async plans({ accountId, from, to }) {
    const response = await this.client.get(`plans/user/${encodeURI(accountId)}`, {
      params: { from, to },
    })
    return response.data.results
  }

  async userWorklogs({
    accountId, from, to, limit = 1000, offset = 0,
  }) {
    const response = await this.client.get(`worklogs/user/${accountId}`, {
      params: {
        from, to, limit, offset,
      },
    })
    let worklogs = response.data.results
    if (response.data.metadata.next) {
      worklogs = worklogs.concat(this.userWorklogs({
        accountId,
        from,
        to,
        limit,
        offset: offset + limit,
      }))
    }
    return worklogs
  }

  async updateWorklog(worklogId, params) {
    const response = await this.client.put(`worklogs/${worklogId}`, params)
    return response.data
  }

  async projectWorklogs({
    projectKey, from, to, limit = 100, offset = 0,
  }) {
    const response = await this.client.get(`worklogs/project/${projectKey}`, {
      params: {
        from, to, limit, offset,
      },
    })

    let worklogs = response.data.results
    if (response.data.metadata.next) {
      worklogs = worklogs.concat(await this.projectWorklogs({
        projectKey,
        from,
        to,
        limit,
        offset: offset + limit,
      }))
    }
    return worklogs
  }

  async accounts() {
    const response = await this.client.get('accounts', { params: { status: 'OPEN' } })
    return response.data.results
  }

  async schedule({ accountId, from, to }) {
    console.log(`/user-schedule/${accountId}`)
    const response = await this.client.get(`/user-schedule/${accountId}`, {
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
