const { google } = require('googleapis')
const { promisify } = require('util')
const AuthClient = require('./auth-client')

class TransactionsFolder {
  constructor({ folderId, parsedFiles } = {}) {
    this.folderId = folderId
    this.parsedFiles = parsedFiles || []
  }

  async init() {
    const client = await AuthClient()
    this.drive = google.drive({ version: 'v2', auth: client })
  }

  async filesToImport() {
    const response = await promisify(this.drive.children.list)({
      folderId: this.folderId,
    })

    const parsedFilesIds = this.parsedFiles.map(a => a.id)

    let files = response.data.items.filter(f => !parsedFilesIds.includes(f.id))
    files = await Promise.all(files.map(async (f) => {
      const response = await promisify(this.drive.files.get)({ fileId: f.id })
      return {
        ...f,
        name: response.data.title,
      }
    }))
    return files
  }
}

module.exports = TransactionsFolder
