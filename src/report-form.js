const { promisify } = require('util')
const fs = require('fs')
const pug = require('pug')
const sass = require('node-sass')
const Tempo = require('./tempo-client')
const Jira = require('./jira-client')

class RaportForm {
  constructor() {
    this.tempo = new Tempo({ token: process.env.TEMPO_TOKEN })
    this.jira = new Jira({
      host: process.env.JIRA_HOST,
      user: process.env.JIRA_USER,
      token: process.env.JIRA_TOKEN,
    })
  }

  async render() {
    const data = await this.data()
    const style = await promisify(sass.render)({
      file: 'assets/styles/index.sass',
      includePaths: ['assets/styles'],
    })
    data.css = style.css.toString('utf-8')
    data.fonts = fs.readFileSync('assets/styles/fonts.css', 'utf-8')
    data.images = {
      logo: fs.readFileSync('assets/images/logo.svg', 'utf-8'),
      angleUp: fs.readFileSync('assets/images/angle-up.svg', 'utf-8'),
    }
    data.rootReportUrl = `https://${process.env.AWS_S3_BUCKET}/`
    const template = pug.compileFile('templates/report/form.pug')
    return template(data)
  }

  async data() {
    let projects = await this.jira.projects()
    projects = projects.reduce((m, p) => {
      m[`${p.name} (${p.key})`] = p.avatarUrls['16x16']
      return m
    }, {})
    return {projects}
  }
}

module.exports = RaportForm
