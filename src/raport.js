const moment = require('moment')

const Jira = require('./jira-client')
const Tempo = require('./tempo-client')

const DEVELOPERS_ROLE = 10001
const CLIENTS_ROLE = 10100

class Raport {
  constructor({ projectIds, fromDate, toDate }) {
    this.projectIds = projectIds
    this.fromDate = fromDate.startOf('day')
    this.toDate = toDate.endOf('day')

    this.tempo = new Tempo({ token: process.env.TEMPO_TOKEN })
    this.jira = new Jira({
      host: process.env.JIRA_HOST,
      user: process.env.JIRA_USER,
      token: process.env.JIRA_TOKEN,
    })
  }

  async build() {
    const projects = await Promise.all(this.projectIds.map(projectKey => this.getProject({
      projectKey,
    })))
    return {
      projects,
      fromDate: this.fromDate,
      toDate: this.toDate,
    }
  }

  async getProject({ projectKey }) {
    const project = await this.jira.project({ projectKey })
    const worklogs = await this.tempo.projectWorklogs({
      projectKey,
      from: this.fromDate.format('YYYY-MM-DD'),
      to: this.toDate.format('YYYY-MM-DD'),
    })
    const boards = await this.jira.boards({ projectKeyOrId: project.id })
    let developers = await this.getRoles({ projectKey, role: DEVELOPERS_ROLE })
    developers = developers.filter(d => d.type === 'atlassian-user-role-actor')

    const ret = {
      id: project.id,
      key: project.key,
      lead: project.lead,
      name: project.name,
      roles: {
        developers,
        clients: await this.getRoles({ projectKey, role: CLIENTS_ROLE }),
      },
      board: {
        id: boards[0].id,
        sprints: await this.getSprints({ boardId: boards[0].id }),
      },
      worklogs,
    }
    return ret
  }

  async getSprints({ boardId }) {
    let sprints = await this.jira.sprints({ boardId })
    sprints = sprints.filter((s) => {
      return moment(s.startDate).isBetween(this.fromDate, this.toDate)
          || moment(s.endDate).isBetween(this.fromDate, this.toDate)
    })
    return Promise.all(sprints.map(async (sprint) => {
      let issues = await this.jira.sprintIssues({
        boardId, sprintId: sprint.id })
      issues = issues.map((issue) => {
        return {
          id: issue.id,
          key: issue.key,
          summary: issue.fields.summary,
          assignee: issue.fields.assignee,
          epic: issue.fields.epic,
          issuetype: issue.fields.issuetype,
          progress: issue.fields.progress,
          status: issue.fields.status,
          resolution: issue.fields.resolution,
          subtasks: issue.fields.subtasks,
          timetracking: issue.fields.timetracking,
        }
      })

      return {
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        state: sprint.state,
        startDate: sprint.startDate && moment(sprint.startDate),
        completeDate: sprint.completeDate && moment(sprint.completeDate),
        endDate: sprint.endDate && moment(sprint.endDate),
        issues,
      }
    }))
  }

  async getRoles({ projectKey, role }) {
    return this.jira.projectRoles({ projectKey, role })
  }
}

module.exports = Raport
