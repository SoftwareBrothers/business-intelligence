require('dotenv').config()
const moment = require('moment')
const pluralize = require('pluralize')
const pug = require('pug')
const sass = require('node-sass')
const fs = require('fs')
const { promisify } = require('util')
const Report = require('../src/report')

async function run({ projects, from, to }) {
  const projectIds = projects.split(',')
  const fromDate = moment(from)
  const toDate = moment(to)
  let data
  if (false) {
    const report = new Report({ projectIds, fromDate, toDate })
    data = await report.build()
    fs.writeFileSync('report.json', JSON.stringify(data))
  } else {
    data = JSON.parse(fs.readFileSync('report.json'))
  }
  const style = await promisify(sass.render)({
    file: 'assets/styles/index.sass',
    includePaths: ['assets/styles'],
  })
  data.css = style.css.toString('utf-8')
  data.moment = moment
  data.pluralize = pluralize
  data.fonts = fs.readFileSync('assets/styles/fonts.css', 'utf-8')
  data.images = {
    logo: fs.readFileSync('assets/images/logo.svg', 'utf-8'),
    angleUp: fs.readFileSync('assets/images/angle-up.svg', 'utf-8'),
  }
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
