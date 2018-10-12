const moment = require('moment')

const REMOTE_ATTRIBUTE = '_Remote_'
const OVERTIME_ATTRIBUTE = '_Overtime_'

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
  static authorKey(author) {
    return author.username || author.name || author.displayName
  }

  constructor({ worklogs } = {}) {
    this.worklogs = worklogs || []

    this.worklogIssues = {}
    this.worklogDevelopers = {}

    this.mapWorklogs()
  }

  mapWorklogs() {
    this.worklogs.forEach((worklog) => {
      const authorKey = WorklogsParser.authorKey(worklog.author)
      this.worklogIssues = mapItem(this.worklogIssues, worklog, worklog.issue.key)
      this.worklogDevelopers = mapItem(this.worklogDevelopers, worklog, authorKey)
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
      const key = WorklogsParser.authorKey(w.author)
      m.timeSpentSeconds += w.timeSpentSeconds
      m.billableSeconds += w.billableSeconds
      m.developers[key] = m.developers[key] || {
        timeSpentSeconds: 0,
        billableSeconds: 0,
        username: key,
      }
      m.developers[key].timeSpentSeconds += w.timeSpentSeconds
      m.developers[key].billableSeconds += w.billableSeconds
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

  developers(reportedPeriod) {
    return Object.keys(this.worklogDevelopers).map((username) => {
      return this.forDeveloper({ username }, reportedPeriod)
    }).filter(u => u.timeSpentSeconds && u.timeSpentSeconds > 0)
  }

  stats(reportedPeriod) {
    let worklogs = this.worklogs
    if (reportedPeriod) {
      worklogs = worklogs.filter((w) => {
        return moment(w.startDate).isBetween(reportedPeriod.startDate, reportedPeriod.finishDate)
      })
    }
    return worklogStats(worklogs)
  }

  forDeveloper(author, reportedPeriod) {
    let username
    if (author.username && this.worklogDevelopers[author.username]) {
      username = author.username
    } else if (author.name && this.worklogDevelopers[author.name]) {
      username = author.name
    } else {
      username = author.displayName
    }

    if (!this.worklogDevelopers[username]) {
      return null
    }
    let { worklogs } = this.worklogDevelopers[username]
    if (reportedPeriod) {
      worklogs = worklogs.filter((w) => {
        return moment(w.startDate).isBetween(reportedPeriod.startDate, reportedPeriod.finishDate)
      })
    }

    const data = worklogStats(worklogs)

    return {
      username,
      worklogs,
      timeSpentSeconds: data.timeSpentSeconds,
      billableSeconds: data.billableSeconds,
      overtimeTimeSpentSeconds: data.overtimeTimeSpentSeconds,
      remoteTimeSpentSeconds: data.remoteTimeSpentSeconds,
    }
  }
}

const worklogStats = (worklogs) => {
  return worklogs.reduce((m, w) => {
    m.timeSpentSeconds += w.timeSpentSeconds
    m.billableSeconds += w.billableSeconds
    if (w.attributes.values.find(v => v.key === OVERTIME_ATTRIBUTE && v.value)) {
      m.remoteTimeSpentSeconds += w.timeSpentSeconds
    }

    if (w.attributes.values.find(v => v.key === OVERTIME_ATTRIBUTE && v.value)) {
      m.overtimeTimeSpentSeconds += w.timeSpentSeconds
    }
    return m
  }, {
    timeSpentSeconds: 0,
    billableSeconds: 0,
    overtimeTimeSpentSeconds: 0,
    remoteTimeSpentSeconds: 0,
  })
}

module.exports = WorklogsParser