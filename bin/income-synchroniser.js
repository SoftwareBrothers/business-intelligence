require('dotenv').config()

const Builder = require('../src/builder')
const BankSheet = require('../src/bank-sheet')

const run = async function() {
  let builder = new Builder({month: '2018-09'})
  await builder.init()

  await builder.updateMembersColumn()
  await builder.updatePlannerHoursColumns()
}

run()

if (!process.env.LAMBDA_TASK_ROOT) {
  run() //.then(files => {console.log('parsedFiles', files)})
}

module.exports = run