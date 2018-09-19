const { google } = require('googleapis')
const { promisify } = require('util')
const CSV = require('csv')
const moment = require('moment')
const currency = require('currency.js')
const AuthClient = require('./auth-client')

const PLN = value => currency(value, {
  symbol: 'PLN',
  precision: 2,
  separator: '',
  decimal: ',',
})

const MONTH_COLUMNS = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']
const AMOUNT_COLUMN = 'F'
const TRANSACTIONS_SHEET = 'Transactions'
const HEADER_OFFSET = 2

class TransactionsParser {
  constructor({ fileId, mappings } = {}) {
    this.fileId = fileId
    this.mappings = mappings
  }

  async init() {
    const client = await AuthClient()
    this.drive = google.drive({ version: 'v2', auth: client })
  }

  async parse() {
    const csvData = await this.loadData()
    const transactions = await promisify(CSV.parse)(csvData.data, {
      delimiter: ';',
      from: 2,
      cast(value, context) {
        if (context.lines == 0) { return value }
        switch (context.column) {
          case 'accountingDate':
          case 'transactionDate':
            return moment(value)
          case 'amount':
            return PLN(value)
          default:
            return value
        }
      },
      columns: ['accountingDate', 'transactionDate', 'sender', 'receiver',
        'title1', 'title2', 'title3', 'title4', 'description', 'amount',
        'currency', 'left'],
    })

    return transactions.map((d) => {
      const row = this.matchItem(d)
      d.categoryRow = row
      return d
    })
  }

  async loadData() {
    return await promisify(this.drive.files.get)({
      fileId: this.fileId,
      alt: 'media',
    })
  }

  matchItem(item) {
    for (let i = 0; i < this.mappings.length; i++) {
      if (this.mappings[i].titleRegEx) {
        const patterns = this.mappings[i].titleRegEx.split('|')
        const doesMatchOnePattern = patterns.reduce((m, e) => m || item.title1.match(e), false)
        if (doesMatchOnePattern) {
          return this.mappings[i].row
        }
      }
      if (this.mappings[i].receiverRegEx) {
        const patterns = this.mappings[i].receiverRegEx.split('|')
        const doesMatchOnePattern = patterns.reduce((m, e) => m || item.receiver.match(e), false)
        if (doesMatchOnePattern) {
          return this.mappings[i].row
        }
      }
    }
  }
}

module.exports = TransactionsParser
