const { google } = require('googleapis')
const { promisify } = require('util')
const AuthClient = require('./auth-client')

class Sheets {
  constructor({docId}) {
    this.docId = docId
  }

  async init(){
    let client = await AuthClient()
    this.sheets = google.sheets({version: 'v4', auth: client})
  }

  async values({range, valueRenderOption='FORMATTED_VALUE'}){
    let get = promisify(this.sheets.spreadsheets.values.get)
    let values = await get({
      spreadsheetId: this.docId,
      range: range,
      valueRenderOption: valueRenderOption
    })
    return values.data.values
  }

  async append({range, values}) {
    let append = promisify(this.sheets.spreadsheets.values.append)
    await append({
      spreadsheetId: this.docId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: values
      }
    })
  }

  async update({range, values}){
    let batchUpdate = promisify(this.sheets.spreadsheets.values.batchUpdate)
    let response = await batchUpdate({
      spreadsheetId: this.docId,
      resource: {
        data: {
          range: range,
          values: values
        },
        valueInputOption: 'USER_ENTERED'
      }
    })
    return response.data
  }
}

module.exports = Sheets