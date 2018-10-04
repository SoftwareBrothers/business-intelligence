const AWS = require('aws-sdk')


class ReportUploader {
  constructor({ client, project, from, to, html }) {
    this.project = project
    this.client = client
    this.from = from
    this.to = to
    this.html = html
    this.s3 = new AWS.S3({apiVersion: '2006-03-01'})
  }

  async upload() {
    await this.s3.putObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: this.key(),
      Body: this.html,
      ContentType: 'text/html; charset=utf-8',
    }).promise()
    return this.key()
  }

  key() {
    return `${this.client}/${this.project}_${this.from}-${this.to}.html`
  }
}

module.exports = ReportUploader

// require('dotenv').config()
// const RU = require('./src/report-uploader')
// let ru = new RU({from: 1, to: 2, projectId: 'SJ', client: 'shopjam'})
