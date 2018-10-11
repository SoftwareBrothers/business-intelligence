const AWS = require('aws-sdk')

class SQSTrigger {
  constructor({ client, projects, from, to }) {
    this.params = {
      projects, client, from, to,
    }
    this.sqs = new AWS.SQS({ apiVersion: '2006-03-01' })
  }

  async send() {
    await this.sqs.sendMessage({
      MessageBody: JSON.stringify(this.params),
      QueueUrl: process.env.QUEUE_URL,
    }).promise()
    return this.key()
  }

  key() {
    return `${this.client}/${this.project}_${this.from}-${this.to}.html`
  }
}

module.exports = SQSTrigger

// require('dotenv').config()
// const RU = require('./src/report-uploader')
// let ru = new RU({from: 1, to: 2, projectId: 'SJ', client: 'shopjam'})
