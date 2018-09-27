const moment = require('moment')
const momentDurationFormatSetup = require('moment-duration-format')

const Jira = require('./jira-client')
const Tempo = require('./tempo-client')

const DEVELOPERS_ROLE = 10001
const DEVELOPERS_GROUP = 'developers'
const CLIENTS_ROLE = 10100
const HOLIDAY_ISSUE = 'INT-1'
const ISSUES_ORDER = ['Open', 'In Progress', 'Code Review', 'Testing', 'Completed', 'Merge']

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

    this.errorMessages = []
    this.allSprintsIssues = {}
    this.allSprintMembers = {}
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
    this.allSprintDevelopers = developers.reduce((m, developer) => {
      m[developer.name] = developer
      return m
    }, {})
    // console.log(JSON.stringify(this.allSprintDevelopers))

    let absenses = await this.getAbsenses({ developers })
    absenses = absenses.reduce((m, i) => {
      m = m.concat(i)
      return m
    }, [])

    const clients = await this.getRoles({ projectKey, role: CLIENTS_ROLE })
    const sprints = await this.getSprints({ boardId: boards[0].id })
    const { worklogIssues, worklogDevelopers } = await this.parseWorklogs({ worklogs })

    const ret = {
      id: project.id,
      key: project.key,
      lead: project.lead,
      name: project.name,
      roles: {
        developers,
        clients,
      },
      absenses,
      board: {
        id: boards[0].id,
        sprints,
      },
      worklogs,
      issues: this.allSprintsIssues,
      worklogIssues,
      worklogDevelopers,
    }

    return ret
  }

  async parseWorklogs({ worklogs }) {
    const worklogIssues = {}
    const worklogDevelopers = {}
    let allDevelopers = await this.jira.usersByGroup({ groupname: DEVELOPERS_GROUP })
    allDevelopers = allDevelopers.reduce((m, d) => {
      m[d.name] = d
      return m
    }, {})
    worklogs.forEach((worklog) => {
      if (worklogIssues[worklog.issue.key]) {
        worklogIssues[worklog.issue.key].worklogs.push(worklog)
        worklogIssues[worklog.issue.key].billableSeconds += worklog.billableSeconds
        worklogIssues[worklog.issue.key].timeSpentSeconds += worklog.timeSpentSeconds
      } else {
        worklogIssues[worklog.issue.key] = {
          issueKey: worklog.issue.key,
          issue: this.allSprintsIssues[worklog.issue.key],
          worklogs: [worklog],
          billableSeconds: worklog.billableSeconds,
          timeSpentSeconds: worklog.timeSpentSeconds,
        }
      }
      if (worklogDevelopers[worklog.author.username]) {
        worklogDevelopers[worklog.author.username].worklogs.push(worklog)
        worklogDevelopers[worklog.author.username].billableSeconds += worklog.billableSeconds
        worklogDevelopers[worklog.author.username].timeSpentSeconds += worklog.timeSpentSeconds
      } else {
        if (!allDevelopers[worklog.author.username]
         && !this.allSprintDevelopers[worklog.author.username]) {
          // When user is not present in jira developers and in sprint developers
          throw new Error(`User ${worklog.author.username} is not marked as developer`)
        }
        worklogDevelopers[worklog.author.username] = {
          username: worklog.author,
          teamMember: this.allSprintDevelopers[worklog.author.username] || null,
          developer: allDevelopers[worklog.author.username],
          worklogs: [worklog],
          billableSeconds: worklog.billableSeconds,
          timeSpentSeconds: worklog.timeSpentSeconds,
        }
      }
    })

    const missingIssueKeys = Object.keys(worklogIssues).filter((wiKey) => {
      return !worklogIssues[wiKey].issue
    })

    const issues = await this.jira.search({ jql: `issueKey in (${missingIssueKeys.join(',')})` })
    this.addIssues({ issues: issues.map(issueMapper) })

    Object.keys(worklogIssues).forEach((issueKey) => {
      worklogIssues[issueKey].issue = this.allSprintsIssues[issueKey]
    })

    return { worklogIssues, worklogDevelopers }
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
      return (s.startDate && s.endDate)
          && (moment(s.startDate).isBetween(this.fromDate, this.toDate)
              || moment(s.endDate).isBetween(this.fromDate, this.toDate))
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
}

function buildSprintSummary({ issues }) {
  const summary = issues.reduce((m, issue) => {
    m[issue.status.name] = m[issue.status.name] || {
      status: issue.status.name,
      originalEstimateSeconds: 0,
      remainingEstimateSeconds: 0,
      timeSpentSeconds: 0,
      issues: [],
    }
    m[issue.status.name].issues.push(issue)
    m[issue.status.name].originalEstimateSeconds
      += issue.timetracking.originalEstimateSeconds || 0
    m[issue.status.name].remainingEstimateSeconds
      += issue.timetracking.remainingEstimateSeconds || 0
    m[issue.status.name].timeSpentSeconds
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
