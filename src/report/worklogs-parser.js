const moment = require('moment')

const mapItem = (mem, worklog, key) => {
  if (mem[key]) {
    mem[key].worklogs.push(worklog)
  } else {
    mem[key] = {
      key,
      worklogs: [worklog],
    }
  }
  return mem
}

class WorklogsParser {
  constructor({ worklogs } = {}) {
    this.worklogs = worklogs || []

    this.worklogIssues = {}
    this.worklogDevelopers = {}

    this.mapWorklogs()
  }

  mapWorklogs() {
    this.worklogs.forEach((worklog) => {
      this.worklogIssues = mapItem(this.worklogIssues, worklog, worklog.issue.key)
      this.worklogDevelopers = mapItem(this.worklogDevelopers, worklog, worklog.author.username)
    })
  }

  issues(reportedPeriod) {
    let { worklogs } = this
    if (reportedPeriod) {
      worklogs = worklogs.filter((w) => {
        return moment(w.startDate).isBetween(reportedPeriod.startDate, reportedPeriod.finishDate)
      })
    }
    return worklogs.reduce((m, worklog) => mapItem(m, worklog, worklog.issue.key), {})
  }

  forIssue(issueKey, reportedPeriod) {
    if (!this.worklogIssues[issueKey]) {
      return null
    }
    let { worklogs } = this.worklogIssues[issueKey]
    if (reportedPeriod) {
      worklogs = worklogs.filter((w) => {
        return moment(w.startDate).isBetween(reportedPeriod.startDate, reportedPeriod.finishDate)
      })
    }

    const data = worklogs.reduce((m, w) => {
      m.timeSpentSeconds += w.timeSpentSeconds
      m.billableSeconds += w.billableSeconds
      m.developers[w.author.username] = m.developers[w.author.username] || {
        timeSpentSeconds: 0,
        billableSeconds: 0,
        username: w.author.username,
      }
      m.developers[w.author.username].timeSpentSeconds += w.timeSpentSeconds
      m.developers[w.author.username].billableSeconds += w.billableSeconds
      return m
    }, {
      timeSpentSeconds: 0,
      billableSeconds: 0,
      developers: {},
    })

    return {
      issueKey,
      worklogs,
      timeSpentSeconds: data.timeSpentSeconds,
      billableSeconds: data.billableSeconds,
      developers: data.developers,
    }
  }

  forDeveloper(username, reportedPeriod) {
    if (!this.worklogDevelopers[username]) {
      return null
    }
    let { worklogs } = this.worklogDevelopers[username]
    if (reportedPeriod) {
      worklogs = worklogs.filter((w) => {
        return moment(w.startDate).isBetween(reportedPeriod.startDate, reportedPeriod.finishDate)
      })
    }

    const data = worklogs.reduce((m, w) => {
      m.timeSpentSeconds += w.timeSpentSeconds
      m.billableSeconds += w.billableSeconds
      return m
    }, {
      timeSpentSeconds: 0,
      billableSeconds: 0,
    })

    return {
      username,
      worklogs,
      timeSpentSeconds: data.timeSpentSeconds,
      billableSeconds: data.billableSeconds,
    }
  }
}

module.exports = WorklogsParser