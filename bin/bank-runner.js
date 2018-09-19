require('dotenv').config()

const TransactionsParser = require('../src/transactions-parser')
const TransactionsFolder = require('../src/transactions-folder')
const BankSheet = require('../src/bank-sheet')

const run = async function() {
  let bankSheet = new BankSheet({bankSheetId: process.env.BANK_SHEET_ID})
  await bankSheet.init()
  let mappings = await bankSheet.loadMappings()
  let parsedFiles = await bankSheet.loadFiles()

  let transactionsFolder = new TransactionsFolder({
    folderId: process.env.FOLDER_ID,
    parsedFiles
  })

  await transactionsFolder.init()
  let files = await transactionsFolder.filesToImport()

  return await Promise.all(files.map(async (file) => {
    let parser = new TransactionsParser({
      mappings,
      fileId: file.id
    })
    await parser.init()

    let transactions = await parser.parse()
    let month = transactions[transactions.length-1].accountingDate.format('MM-YYYY')
    transactions = await bankSheet.storeTransactions({transactions, sheet: month})
    let fileData = {
      fileName: file.name,
      fileId: file.id,
      month: month
    }
    await bankSheet.storeFile(fileData)
    return fileData
  }))
}

module.exports = run