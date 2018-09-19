process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT']

// const Builder = require('./src/builder')
// const TransactionsParser = require('./src/transactions-parser')
// const BankSheet = require('./src/bank-sheet')

// const run = async function() {
//   // let builder = new Builder({month: '2018-06'})
//   // await builder.init()

//   // await builder.updateMembersColumn()
//   // await builder.updatePlannerHoursColumns()
//   let bankSheet = new BankSheet()
//   await bankSheet.init()
//   let mappings = await bankSheet.loadMappings()


//   let parser = new TransactionsParser({mappings})
//   await parser.init()

//   // filename

//   let transactions = await parser.parse()
//   let month = transactions[transactions.length-1].accountingDate.format('MM-YYYY')
//   transactions = await bankSheet.storeTransactions({transactions, sheet: month})

//   await bankSheet.storeFile({
//     fileName: 'sasda.csv',
//     fileId: '1jXnqp_MtNOnznYEpdDnTz-FSoqT9HnEu',
//     month: month
//   })

//   // projects = Object.keys(projects)
//   // await sheet.update({
//   //   // 2018-09!A1:A30
//   //   range: `Projects!A${offset}:B${projects.length + offset}`,
//   //   values: projects.map(p => [p])
//   // })

// }

// run()

exports.bankRunner = async (event) => {
  const files = await require('./bin/bank-runner')

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      parsedFiles: files
    })
  }

  return response
}