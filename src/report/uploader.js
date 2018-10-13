const AWS = require('aws-sdk')

class Uploader {
  static key({ client, project, from, to }) {
    const clientURI = client.toLowerCase().replace(' ', '-')
    const projectURI = project.toLowerCase().replace(' ', '-')
    return `${clientURI}/${projectURI}_${from}-${to}.html`
  }

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
      Key: Uploader.key({
        client: this.client,
        project: this.project,
        from: this.from,
        to: this.to,
      }),
      Body: this.html,
      ContentType: 'text/html; charset=utf-8',
      CacheControl: 'no-cache',
    }).promise()
    return this.key()
  }
}

module.exports = Uploader
