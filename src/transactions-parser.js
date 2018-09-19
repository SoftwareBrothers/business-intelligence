const { google } = require('googleapis')
const { promisify } = require('util')
const AuthClient = require('./auth-client')
const CSV = require('csv')
const moment = require('moment')
const currency = require('currency.js')
const PLN = value => currency(value, {
  symbol: 'PLN',
  precision: 2,
  separator: '',
  decimal: ','
});

const MONTH_COLUMNS = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']
const AMOUNT_COLUMN = 'F'
const TRANSACTIONS_SHEET = 'Transactions'
const HEADER_OFFSET = 2

class TransactionsParser {
  constructor({fileId, mappings} = {}) {
    this.fileId = fileId
    this.mappings = mappings
  }

  async init() {
    let client = await AuthClient()
    this.drive = google.drive({version: 'v2', auth: client})
  }

  async parse(){
    let csvData = await this.loadData()
    let transactions = await promisify(CSV.parse)(csvData.data, {
      delimiter: ';',
      from: 2,
      cast: function(value, context) {
        if (context.lines == 0) {return value}
        switch(context.column) {
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
                'currency', 'left']
    })

    return transactions.map((d) => {
      let row = this.matchItem(d)
      d.categoryRow = row
      return d
    })
  }

  async loadData(){
    return await promisify(this.drive.files.get)({
      fileId: this.fileId,
      alt: 'media'
    })
  }

  matchItem(item) {
    for (var i = 0; i < this.mappings.length; i++) {
      if(this.mappings[i].titleRegEx) {
        let patterns = this.mappings[i].titleRegEx.split('|')
        let doesMatchOnePattern = patterns.reduce((m, e) => {
          return m || item.title1.match(e)
        }, false)
        if(doesMatchOnePattern) {
          return this.mappings[i].row
        }
      }
      if(this.mappings[i].receiverRegEx) {
        let patterns = this.mappings[i].receiverRegEx.split('|')
        let doesMatchOnePattern = patterns.reduce((m, e) => {
          return m || item.receiver.match(e)
        }, false)
        if(doesMatchOnePattern) {
          return this.mappings[i].row
        }
      }
    }
  }
}

module.exports = TransactionsParser