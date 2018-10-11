const axios = require('axios')

// ID of IN PROGRESS project catogory
const IN_PROGRESS = 10000

class Jira {
  constructor({
    host, user, token, version = 3,
  }) {
    this.version = version
    this.baseClient = new axios.create({
      baseURL: `https://${host}.atlassian.net/rest/api/${this.version}`,
      auth: {
        username: user,
        password: token,
      },
    })
    this.agileClient = new axios.create({
      baseURL: `https://${host}.atlassian.net/rest/agile/1.0`,
      auth: {
        username: user,
        password: token,
      },
    })
  }

  async projects() {
    const maxResults = 200
    const response = await this.baseClient.get('project/search', {
      params: { categoryId: IN_PROGRESS, maxResults },
    })
    return response.data.values
  }

  async boards({ projectKeyOrId }) {
    const response = await this.agileClient.get('board', {
      params: { projectKeyOrId },
    })
    return response.data.values
  }

  async sprints({ boardId }) {
    const response = await this.agileClient.get(`board/${boardId}/sprint`, {
      params: { },
    })
    return response.data.values
  }

  async sprintIssues({ boardId, sprintId, startAt = 0 }) {
    const maxResults = 200
    const url = `board/${boardId}/sprint/${sprintId}/issue`

    const response = await this.agileClient.get(url, {
      params: { maxResults, startAt },
    })
    const { data } = response
    let { issues } = data
    if (data.total > (data.startAt + data.maxResults)) {
      issues = issues.concat(await this.sprintIssues({
        boardId,
        sprintId,
        startAt: startAt + maxResults,
      }))
    }
    return issues
  }

  async project({ projectKey }) {
    const response = await this.baseClient.get(`project/${projectKey}`, {
      expand: 'issueTypes,lead,description',
    })
    return response.data
  }

  async search({ jql, fields = ['summary', 'status', 'assignee', 'timetracking'] }) {
    this.a = 1
    const response = await this.baseClient.post('search', {
      jql,
      maxResults: 100,
      fields,
    })
    return response.data.issues
  }

  async projectRoles({ projectKey, role }) {
    const response = await this.baseClient.get(`project/${projectKey}/role/${role}`)
    return response.data.actors
  }

  async usersByGroup({ groupname }) {
    const response = await this.baseClient.get('group/member', {
      params: { groupname, maxResults: 200, includeInactiveUsers: true },
    })
    return response.data.values
  }

  async categories() {
    await this.baseClient.get('projectCategory')
  }
}

module.exports = Jira
