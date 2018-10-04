require('dotenv').config()
const moment = require('moment')
require('moment-duration-format')
const pluralize = require('pluralize')
const pug = require('pug')
const sass = require('node-sass')
const fs = require('fs')
const { promisify } = require('util')
const Report = require('../src/report')
const DURATION_FORMAT = 'h[h] m[m]'

async function run({ projects, from, to }) {
  const projectIds = projects.split(',')
  const fromDate = moment(from)
  const toDate = moment(to)
  let data
  if (true) {
    const report = new Report({ projectIds, fromDate, toDate })
    data = await report.build()
    // fs.writeFileSync('report.json', JSON.stringify(data))
  } else {
    data = JSON.parse(fs.readFileSync('report.json'))
  }
  const style = await promisify(sass.render)({
    file: 'assets/styles/index.sass',
    includePaths: ['assets/styles'],
  })
  data.css = style.css.toString('utf-8')
  data.moment = moment
  data.duration = (seconds) => {
    if (!seconds) {
      return ' - '
    }
    return moment.duration({ seconds }).format(DURATION_FORMAT, {
      trim: 'both',
    })
  }
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
    if (process.env.STORE === 'true') {
      const ReportUploader = require('../src/report-uploader')
      let ru = new ReportUploader({
        client: process.env.CLIENT,
        project: process.env.PROJECTS,
        from: process.env.FROM,
        to: process.env.TO,
        html: report,
      })
      ru.upload().then(f => {
        console.log('filename', f)
      })
    }
    console.log(report)
  })
}

module.exports = run
