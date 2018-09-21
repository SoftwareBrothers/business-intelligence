const moment = require('moment')
const momentDurationFormatSetup = require('moment-duration-format')

const Jira = require('./jira-client')
const Tempo = require('./tempo-client')

const DEVELOPERS_ROLE = 10001
const CLIENTS_ROLE = 10100
const HOLIDAY_ISSUE = 'INT-1'
const ISSUES_ORDER = ['Open', 'In Progress', 'Code Review', 'Testing', 'Completed', 'Merge']
const IN_HOUR = 3600

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
      issueStatuses: ISSUES_ORDER,
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

    let absenses = await this.getAbsenses({ developers })
    absenses = absenses.reduce((m, i) => {
      m = m.concat(i)
      return m
    }, [])
    // console.log(JSON.stringify(absenses))

    const ret = {
      id: project.id,
      key: project.key,
      lead: project.lead,
      name: project.name,
      roles: {
        developers,
        clients: await this.getRoles({ projectKey, role: CLIENTS_ROLE }),
      },
      absenses,
      board: {
        id: boards[0].id,
        sprints: await this.getSprints({ boardId: boards[0].id }),
      },
      worklogs,
    }
    return ret
  }

  async getAbsenses({ developers }) {
    return Promise.all(developers.map(async (member) => {
      const plans = await this.tempo.plans({
        username: member.name,
        from: this.fromDate.format('YYYY-MM-DD'),
        to: this.toDate.add(6, 'months').format('YYYY-MM-DD'),
      })
      return plans.filter((plan) => {
        return plan.planItem.type === 'ISSUE'
            && plan.planItem.self.match(HOLIDAY_ISSUE)
      }).map(plan => Object.assign(plan, { member }))
    }))
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
          order: ISSUES_ORDER.indexOf(issue.fields.status.name),
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
      }).sort((a, b) => b.order - a.order)

      return {
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        state: sprint.state,
        startDate: sprint.startDate && moment(sprint.startDate),
        completeDate: sprint.completeDate && moment(sprint.completeDate),
        endDate: sprint.endDate && moment(sprint.endDate),
        summary: this.buildSprintSummary({ issues }),
        issues,
      }
    }))
  }

  buildSprintSummary({ issues }) {
    let summary = issues.reduce((m, issue) => {
      m[issue.status.name] = m[issue.status.name] || {
        status: issue.status.name,
        tasks: 0,
        originalEstimateSeconds: 0,
        remainingEstimateSeconds: 0,
        timeSpentSeconds: 0
      }
      m[issue.status.name].tasks += 1
      m[issue.status.name].originalEstimateSeconds += issue.timetracking.originalEstimateSeconds || 0
      m[issue.status.name].remainingEstimateSeconds += issue.timetracking.remainingEstimateSeconds || 0
      m[issue.status.name].timeSpentSeconds += issue.timetracking.timeSpentSeconds || 0
      return m
    }, {})

    return Object.keys(summary).map((key) => {
      return {
        status: summary[key].status,
        tasks: summary[key].tasks,
        originalEstimate: moment.duration({ seconds: summary[key].originalEstimateSeconds }).format('h[h], m[m]'),
        remainingEstimate: moment.duration({ seconds: summary[key].remainingEstimateSeconds }).format('h[h], m[m]'),
        timeSpent: moment.duration({ seconds: summary[key].timeSpentSeconds }).format('h[h], m[m]'),
      }
    })
  }

  async getRoles({ projectKey, role }) {
    return this.jira.projectRoles({ projectKey, role })
  }
}

module.exports = Raport
