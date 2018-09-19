const moment = require('moment')
const currency = require('currency.js')

const Tempo = require('./tempo-client')
const Jira = require('./jira-client')
const Sheets = require('./sheets-client')


const inHour = 3600
const offset = 4
const projectSheet = 'Projects'

class Builder {
  constructor({ month }) {
    this.month = month
    this.tempo = new Tempo({ token: process.env.TEMPO_TOKEN })
    this.jira = new Jira({
      host: process.env.JIRA_HOST,
      user: process.env.JIRA_USER,
      token: process.env.JIRA_TOKEN,
    })
    this.sheet = new Sheets({ docId: process.env.JIRA_SHEET_ID })

    this.prices = {}
    this.countedHours = []
  }

  async init() {
    await this.fetchPrices()
    await this.fetchMembers()

    await Promise.all(this.members.map(async (member, i) => {
      const hoursAvailable = await this.countWorkingHours(member)
      const hours = {
        hoursAvailable,
        planned: await this.countPlannedHours(member),
        worked: await this.countWorkedHours(member),
      }

      this.countedHours[i] = hours
      console.log(member.displayName)
    }))
  }

  async updateColumn({ column = 'A', data }) {
    await this.sheet.update({
      // 2018-09!A2:A30
      range: `${this.month}!${column}${offset}:${column}${this.members.length + offset}`,
      values: data.map(m => [m]),
    })
  }

  async updateMembersColumn() {
    await this.updateColumn({
      column: 'A',
      data: this.members.map(m => m.displayName),
    })
  }

  async updatePlannerHoursColumns() {
    await this.updateColumn({
      column: 'B',
      data: this.countedHours.map(m => m.hoursAvailable),
    })

    await this.updateColumn({
      column: 'C',
      data: this.countedHours.map(m => m.planned.hoursTotal),
    })

    await this.updateColumn({
      column: 'D',
      data: this.countedHours.map(m => m.planned.hoursBillable),
    })

    await this.updateColumn({
      column: 'E',
      data: this.countedHours.map(m => m.planned.billableAmount),
    })

    await this.updateColumn({
      column: 'F',
      data: this.countedHours.map(m => JSON.stringify(m.planned.projects)),
    })

    await this.updateColumn({
      column: 'G',
      data: this.countedHours.map(m => m.worked.hoursTotal),
    })

    await this.updateColumn({
      column: 'H',
      data: this.countedHours.map(m => m.worked.hoursBillable),
    })

    await this.updateColumn({
      column: 'I',
      data: this.countedHours.map(m => m.worked.billableAmount),
    })
    await this.updateColumn({
      column: 'J',
      data: this.countedHours.map(m => JSON.stringify(m.worked.projects)),
    })
  }

  async fetchPrices() {
    await this.sheet.init()
    const prices = await this.sheet.values({ range: `${projectSheet}!A${offset}:C${offset + 100}` })
    this.prices = prices.reduce((m, e, i) => {
      m[e[0]] = {
        priceCell: `${projectSheet}!C${offset + i}`,
        price: currency(e[2]),
      }
      return m
    }, {})
  }

  async fetchMembers() {
    this.members = await this.tempo.members()
  }

  async countWorkingHours(member) {
    const schedules = await this.tempo.schedule({
      username: member.username,
      from: moment(this.month).format('YYYY-MM-DD'),
      to: moment(this.month).endOf('month').format('YYYY-MM-DD'),
    })
    return schedules.reduce((m, day) => {
      if (day.type === 'WORKING_DAY') {
        m += day.requiredSeconds / inHour
      }
      return m
    }, 0)
  }

  async countWorkedHours(member) {
    const worklogs = await this.tempo.worklogs({
      username: member.username,
      from: moment(this.month).format('YYYY-MM-DD'),
      to: moment(this.month).endOf('month').format('YYYY-MM-DD'),
    })

    const hours = worklogs.reduce((m, worklog) => {
      const h = worklog.billableSeconds / inHour
      // changes 'ST-172' to 'ST'
      const issueKey = worklog.issue.key
      const projectKey = issueKey.split('-')[0]
      if (!this.prices[projectKey]) {
        throw new Error(`${projectKey} is not present in the spreadsheed: ${projectSheet}!`)
      }
      if (this.prices[projectKey].price.value > 0) {
        const ammountFormula = `${m.billableAmount} + ${this.prices[projectKey].priceCell}*${h}`
        m.billableAmount = ammountFormula
        m.hoursBillable += h
      }

      m.projects[projectKey] = (m.projects[projectKey] || 0) + h
      m.hoursTotal += h

      return m
    }, {
      hoursTotal: 0, billableAmount: '= 0', hoursBillable: 0, projects: {},
    })
    return hours
  }

  async countPlannedHours(member) {
    const plans = await this.tempo.plans({
      username: member.username,
      from: moment(this.month).format('YYYY-MM-DD'),
      to: moment(this.month).endOf('month').format('YYYY-MM-DD'),
    })

    const hours = plans.reduce((m, plan) => {
      const h = plan.dates.values[0].timePlannedSeconds / inHour

      if (plan.planItem.type === 'PROJECT') {
        const projectKey = plan.planItem.self.split('/').pop()
        if (this.prices[projectKey].price.value > 0) {
          const ammountFormula = `${m.billableAmount} + ${this.prices[projectKey].priceCell}*${h}`
          m.billableAmount = ammountFormula
          m.hoursBillable += h
        }

        m.projects[projectKey] = (m.projects[projectKey] || 0) + h
      }

      m.hoursTotal += h

      return m
    }, {
      hoursTotal: 0, billableAmount: '= 0', hoursBillable: 0, projects: {},
    })
    return hours
  }
}

module.exports = Builder
