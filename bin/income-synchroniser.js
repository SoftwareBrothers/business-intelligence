require('dotenv').config()

const Builder = require('../src/builder')
const BankSheet = require('../src/bank-sheet')

const run = async function ({ month }) {
  const builder = new Builder({ month })
  await builder.init()

  await builder.updateMembersColumn()
  await builder.updatePlannerHoursColumns()
}

if (!process.env.LAMBDA_TASK_ROOT) {
  run(process.env.MONTH).then((out) => { console.log('parsedFiles', out) })
}

module.exports = run
