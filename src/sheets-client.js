const { google } = require('googleapis')
const { promisify } = require('util')
const AuthClient = require('./auth-client')

class Sheets {
  constructor({ docId }) {
    this.docId = docId
  }

  async init() {
    const client = await AuthClient()
    this.sheets = google.sheets({ version: 'v4', auth: client })
  }

  async values({ range, valueRenderOption = 'FORMATTED_VALUE' }) {
    const get = promisify(this.sheets.spreadsheets.values.get)
    const values = await get({
      spreadsheetId: this.docId,
      range,
      valueRenderOption,
    })
    return values.data.values
  }

  async append({ range, values }) {
    const append = promisify(this.sheets.spreadsheets.values.append)
    await append({
      spreadsheetId: this.docId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values,
      },
    })
  }

  async update({ range, values }) {
    const batchUpdate = promisify(this.sheets.spreadsheets.values.batchUpdate)
    const response = await batchUpdate({
      spreadsheetId: this.docId,
      resource: {
        data: {
          range,
          values,
        },
        valueInputOption: 'USER_ENTERED',
      },
    })
    return response.data
  }
}

module.exports = Sheets
