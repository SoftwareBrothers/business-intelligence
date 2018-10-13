require('dotenv').config()
const moment = require('moment')
require('moment-duration-format')
const pluralize = require('pluralize')
const pug = require('pug')
const sass = require('node-sass')
const fs = require('fs')
const { promisify } = require('util')
const Report = require('../src/report')
const ReportUploader = require('../src/report/uploader')
const Invoicer = require('../src/report/invoicer')

const DURATION_FORMAT = 'h[h] m[m]'

async function run({ projects, from, to }) {
  const projectIds = projects.split(',')
  const fromDate = moment(from)
  const toDate = moment(to)
  let data
  const report = new Report({ projectIds, fromDate, toDate })
  data = await report.build()
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
      const ru = new ReportUploader({
        client: process.env.CLIENT,
        project: process.env.PROJECTS,
        from: process.env.FROM,
        to: process.env.TO,
        html: report,
      })
      ru.upload().then(f => {
        console.log('filename', f)
      })
    } else if (process.env.INVOICE) {
      const invoicer = new Invoicer({
        project: process.env.PROJECTS,
        from: process.env.FROM,
        to: process.env.TO,
        invoice: process.env.INVOICE,
      })
      invoicer.run().then(f => {
        console.log('invoice set for:', invoicer.worklogs.length, 'worklogs')
      })
    } else {
      console.log(report)
    }
  })
}

module.exports = run
