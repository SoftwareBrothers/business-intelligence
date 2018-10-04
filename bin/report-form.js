require('dotenv').config()
const ReportForm = require('../src/report-form')

async function run() {
  const form = new ReportForm()
  return await form.render()
}

if (!process.env.LAMBDA_TASK_ROOT) {
  run().then((reportForm) => {
    console.log(reportForm)
  })
}

module.exports = run
