const moment = require('moment')
const HEADER_OFFSET = 2
const CATEGORY_COLUMN = 'B'
const CASHFLOW_SHEET = 'Cashflow'
const FILES_SHEET = 'files'

const Sheets = require('./sheets-client.js')

class BankSheet {
  constructor({bankSheetId} = {}) {
    this.bankSheetId = bankSheetId
  }

  async init() {
    this.sheet = new Sheets({docId: this.bankSheetId})
    await this.sheet.init()
  }

  async loadMappings() {
    this.mappings = await this.sheet.values({
      range: `${CASHFLOW_SHEET}!A${HEADER_OFFSET}:D${HEADER_OFFSET+2000}`
    })
    this.mappings = this.mappings.map((row, i) => {
      return {
        row: HEADER_OFFSET + i,
        titleRegEx: row[2],
        receiverRegEx: row[3],
      }
    })
    return this.mappings
  }

  async loadFiles() {
    this.files = await this.sheet.values({
      range: `${FILES_SHEET}!A${HEADER_OFFSET}:D${HEADER_OFFSET+2000}`
    }) || []
    this.files = this.files.map((f) => {return {
      name: f[0],
      id: f[1],
      data: f[2],
      month: f[3]
    }})
    return this.files
  }

  async storeFile({fileName, fileId, month}) {
    await this.sheet.append({
      range: `${FILES_SHEET}!A${HEADER_OFFSET}:D${HEADER_OFFSET}`,
      values: [[fileName, fileId, moment().format('YYYY.MM.DD - HH:mm'), month]]
    })
  }

  async storeTransactions({transactions, sheet}) {
    let offset = 2
    let values = transactions.map((item) => {
      let category = item.categoryRow ? `=${CASHFLOW_SHEET}!${CATEGORY_COLUMN}${item.categoryRow}` : ''
      return [
        item.accountingDate.format(),
        item.sender,
        item.receiver,
        item.title1,
        item.description,
        item.amount.format(),
        category,
      ]
    })

    await this.sheet.update({
      range: `${sheet}!A${offset}:G${values.length+offset}`,
      values: values
    })

    return transactions.map((item, i) => {
      item.row = i + offset
      return item
    })
  }
}

module.exports = BankSheet