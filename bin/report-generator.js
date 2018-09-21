require('dotenv').config()
const moment = require('moment')
const pug = require('pug')
const Report = require('../src/report')

async function run({ projects, from, to }) {
  const projectIds = projects.split(',')
  const fromDate = moment(from)
  const toDate = moment(to)
  const report = new Report({ projectIds, fromDate, toDate })
  const data = await report.build()
  const template = pug.compileFile('templates/report/index.pug')
  return template(data)
}

if (!process.env.LAMBDA_TASK_ROOT) {
  run({
    projects: process.env.PROJECTS,
    from: process.env.FROM,
    to: process.env.TO,
  }).then((report) => {
    console.log(report)
  })
}

module.exports = run
