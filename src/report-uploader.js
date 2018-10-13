const AWS = require('aws-sdk')


class ReportUploader {
  constructor({ client, project, from, to, html }) {
    this.project = project
    this.client = client
    this.from = from
    this.to = to
    this.html = html
    this.s3 = new AWS.S3({ apiVersion: '2006-03-01' })
  }

  async upload() {
    await this.s3.putObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: this.key(),
      Body: this.html,
      ContentType: 'text/html; charset=utf-8',
      CacheControl: 'no-cache',
    }).promise()
    return this.key()
  }

  key() {
    const clientURI = this.client.toLowerCase().replace(' ', '-')
    const projectURI = this.project.toLowerCase().replace(' ', '-')
    return `${clientURI}/${projectURI}_${this.from}-${this.to}.html`
  }
}

module.exports = ReportUploader