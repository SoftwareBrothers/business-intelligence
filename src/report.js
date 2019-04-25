const moment = require('moment')
const momentDurationFormatSetup = require('moment-duration-format')

const Jira = require('./jira-client')
const Tempo = require('./tempo-client')

const WorklogsParser = require('./report/worklogs-parser')
const UsersStore = require('./report/users-store')

const DEVELOPERS_ROLE = 10001
const DEVELOPERS_GROUP = 'developers'
const CLIENTS_ROLE = 10100
const HOLIDAY_ISSUE = 'INT-1'
const ISSUES_MAP = {
  Open: 'Open',
  'To Do': 'Open',
  'In Progress': 'In Progress',
  'Code Review': 'In Progress',
  Testing: 'Testing',
  Completed: 'Completed',
  Merge: 'Completed',
  Reopened: 'In Progress',
  'for staging': 'Completed',
  Tested: 'Completed',
  Backlog: 'Open',
  Done: 'Completed',
  'Blocked/Brief': 'Open',
}

const ISSUES_ORDER = ['Released', 'Completed', 'Testing', 'In Progress', 'Open']

class Raport {
  constructor({ projectIds, fromDate, toDate }) {
    this.projectIds = projectIds
    this.reportedPeriod = {
      startDate: fromDate.startOf('day'),
      finishDate: toDate.endOf('day'),
    }

    this.tempo = new Tempo({ token: process.env.TEMPO_TOKEN })
    this.jira = new Jira({
      host: process.env.JIRA_HOST,
      user: process.env.JIRA_USER,
      token: process.env.JIRA_TOKEN,
    })

    this.errorMessages = []
    this.allSprintsIssues = {}
  }

  async build() {
    const projects = await Promise.all(this.projectIds.map(projectKey => this.getProject({
      projectKey,
    })))
    return {
      jiraHost: `https://${process.env.JIRA_HOST}.atlassian.net`,
      projects,
      reportedPeriod: this.reportedPeriod,
      issueStatuses: ISSUES_MAP,
    }
  }

  async buildWorklogsParser({ projectKey }) {
    const worklogs = await this.tempo.projectWorklogs({
      projectKey,
      from: this.reportedPeriod.startDate.clone().subtract(5, 'months').format('YYYY-MM-DD'),
      to: this.reportedPeriod.finishDate.clone().add(1, 'month').format('YYYY-MM-DD'),
    })

    return new WorklogsParser({ worklogs })
  }

  async buildUsersStore({ projectKey, worklogDeveloperKeys, project }) {
    const allJiraDevelopers = await this.jira.usersByGroup({ groupname: DEVELOPERS_GROUP })
    const projectDevelopers = await this.getRoles({ projectKey, role: DEVELOPERS_ROLE })
    const clients = await this.getRoles({ projectKey, role: CLIENTS_ROLE })
    return new UsersStore({
      allJiraDevelopers,
      projectDevelopers,
      clients,
      worklogDeveloperKeys,
      projectLead: project.lead,
    })
  }

  async getProject({ projectKey }) {
    const project = await this.jira.project({ projectKey })
    const boards = await this.jira.boards({ projectKeyOrId: project.id })
    let sprints = []
    if (boards[0].type !== 'kanban') {
      sprints = await this.getSprints({ boardId: boards[0].id })
    }
    const worklogsParser = await this.buildWorklogsParser({ projectKey })
    const usersStore = await this.buildUsersStore({
      projectKey,
      project,
      worklogDeveloperKeys: worklogsParser.developers(this.reportedPeriod).map(u => u.username),
    })
    const absenses = await this.getAbsenses({ developers: usersStore.projectDevelopers })

    await this.fetchMissingIssues({
      issuesFromWorklogs: worklogsParser.issues(this.reportedPeriod),
    })

    const ret = {
      id: project.id,
      key: project.key,
      lead: project.lead,
      name: project.name,
      worklogsParser,
      usersStore,
      absenses,
      board: {
        id: boards[0].id,
        sprints,
      },
      issues: this.allSprintsIssues,
      errorMessages: this.errorMessages,
    }

    return ret
  }

  async getAbsenses({ developers }) {
    const absenses = await Promise.all(developers.map(async (member) => {
      const plans = await this.tempo.plans({
        accountId: member.accountId || member.actorUser.accountId,
        from: this.reportedPeriod.startDate.format('YYYY-MM-DD'),
        to: this.reportedPeriod.finishDate.clone().add(6, 'months').format('YYYY-MM-DD'),
      })
      return plans.filter((plan) => {
        return plan.planItem.type === 'ISSUE'
            && plan.planItem.self.match(HOLIDAY_ISSUE)
      }).map(plan => Object.assign(plan, { member }))
    }))

    return absenses.reduce((m, i) => {
      m = m.concat(i)
      return m
    }, [])
  }

  async getSprints({ boardId }) {
    let sprints = await this.jira.sprints({ boardId })
    sprints = sprints.filter((s) => {
      return (s.startDate && s.endDate)
          && (moment(s.startDate).isBetween(this.reportedPeriod.startDate, this.reportedPeriod.finishDate))
    }).sort((a, b) => moment(b.startDate).valueOf() - moment(a.startDate).valueOf())
    return Promise.all(sprints.map(async (sprint) => {
      let issues = await this.jira.sprintIssues({
        boardId, sprintId: sprint.id })
      issues = issues.map(issueMapper).sort((a, b) => b.order - a.order)
      this.addIssues({ issues })

      return {
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        state: sprint.state,
        startDate: sprint.startDate && moment(sprint.startDate),
        completeDate: sprint.completeDate && moment(sprint.completeDate),
        endDate: sprint.endDate && moment(sprint.endDate),
        summary: buildSprintSummary({ issues }),
        issues,
      }
    }))
  }

  async fetchMissingIssues({ issuesFromWorklogs }) {
    const missingIssueKeys = Object.keys(issuesFromWorklogs).filter((wiKey) => {
      return !this.allSprintsIssues[wiKey]
    })
    if (missingIssueKeys.length === 0) {
      return
    }
    const issues = await this.jira.search({ jql: `issueKey in (${missingIssueKeys.join(',')})` })
    this.addIssues({ issues: issues.map(issueMapper) })
  }

  async getRoles({ projectKey, role }) {
    return this.jira.projectRoles({ projectKey, role })
  }

  addIssues({ issues }) {
    const issuesMap = issues.reduce((m, issue) => {
      m[issue.key] = issue
      return m
    }, {})
    this.allSprintsIssues = Object.assign({}, issuesMap, this.allSprintsIssues)
  }
}

function issueMapper(issue) {
  return {
    order: ISSUES_ORDER.indexOf(ISSUES_MAP[issue.fields.status.name] || issue.fields.status.name),
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
}

function buildSprintSummary({ issues }) {
  const summary = issues.reduce((m, issue) => {
    const status = ISSUES_MAP[issue.status.name] || issue.status.name
    m[status] = m[status] || {
      status,
      originalEstimateSeconds: 0,
      remainingEstimateSeconds: 0,
      timeSpentSeconds: 0,
      issues: [],
    }
    m[status].issues.push(issue)
    m[status].originalEstimateSeconds
      += issue.timetracking.originalEstimateSeconds || 0
    m[status].remainingEstimateSeconds
      += issue.timetracking.remainingEstimateSeconds || 0
    m[status].timeSpentSeconds
      += issue.timetracking.timeSpentSeconds || 0
    return m
  }, {})

  return Object.keys(summary).map((key) => {
    return {
      status: summary[key].status,
      issues: summary[key].issues,
      originalEstimateSeconds: summary[key].originalEstimateSeconds,
      remainingEstimateSeconds: summary[key].remainingEstimateSeconds,
      timeSpentSeconds: summary[key].timeSpentSeconds,
    }
  })
}

module.exports = Raport
