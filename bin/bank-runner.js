require('dotenv').config()

const TransactionsParser = require('../src/transactions-parser')
const TransactionsFolder = require('../src/transactions-folder')
const BankSheet = require('../src/bank-sheet')

const run = async function () {
  const bankSheet = new BankSheet({ bankSheetId: process.env.BANK_SHEET_ID })
  await bankSheet.init()
  const mappings = await bankSheet.loadMappings()
  const parsedFiles = await bankSheet.loadFiles()

  const transactionsFolder = new TransactionsFolder({
    folderId: process.env.FOLDER_ID,
    parsedFiles,
  })

  await transactionsFolder.init()
  const files = await transactionsFolder.filesToImport()

  return await Promise.all(files.map(async (file) => {
    const parser = new TransactionsParser({
      mappings,
      fileId: file.id,
    })
    await parser.init()

    let transactions = await parser.parse()
    const month = transactions[transactions.length - 1].accountingDate.format('MM-YYYY')
    transactions = await bankSheet.storeTransactions({ transactions, sheet: month })
    const fileData = {
      fileName: file.name,
      fileId: file.id,
      month,
    }
    await bankSheet.storeFile(fileData)
    return fileData
  }))
}

if (!process.env.LAMBDA_TASK_ROOT) {
  run().then((files) => { console.log('parsedFiles', files) })
}

module.exports = run
