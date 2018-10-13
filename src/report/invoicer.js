const moment = require('moment')
const Tempo = require('../tempo-client')

const INVOICE_KEY = '_Invoice_'

class Invoicer {
  constructor({ project, from, to, invoice }) {
    this.projectKey = project
    this.reportedPeriod = {
      startDate: moment(from).startOf('day'),
      finishDate: moment(to).endOf('day'),
    }
    this.invoice = invoice

    this.tempo = new Tempo({ token: process.env.TEMPO_TOKEN })
  }

  async run() {
    this.worklogs = await this.tempo.projectWorklogs({
      projectKey: this.projectKey,
      from: this.reportedPeriod.startDate.format('YYYY-MM-DD'),
      to: this.reportedPeriod.finishDate.format('YYYY-MM-DD'),
    })

    return Promise.all(this.worklogs.map(async w => this.setInvoice(w)))
  }

  async setInvoice(worklog) {
    const { attributes } = worklog
    if (attributes.values.find(v => v.key === INVOICE_KEY && v.value)) {
      attributes.values = attributes.values.map((v) => {
        if (v.key === INVOICE_KEY) {
          v.value = this.invoice
        }
        return v
      })
    } else {
      attributes.values.push({
        key: INVOICE_KEY,
        value: this.invoice,
      })
    }
    return this.tempo.updateWorklog(worklog.tempoWorklogId, {
      attributes: attributes.values,
      issueKey: worklog.issue.key,
      timeSpentSeconds: worklog.timeSpentSeconds,
      billableSeconds: worklog.billableSeconds,
      startDate: worklog.startDate,
      startTime: worklog.startTime,
      description: worklog.description,
      authorUsername: worklog.author.username,
      remainingEstimateSeconds: worklog.remainingEstimateSeconds,
    })
  }
}

module.exports = Invoicer
