const AWS = require('aws-sdk')

class SQSTrigger {
  constructor({ client, projects, from, to }) {
    this.params = {
      projects, client, from, to,
    }
    this.sqs = new AWS.SQS({ apiVersion: '2012-11-05' })
  }

  async send() {
    await this.sqs.sendMessage({
      MessageBody: JSON.stringify(this.params),
      QueueUrl: process.env.AWS_QUEUE_URL,
    }).promise()
    return this.key()
  }

  key() {
    return `${this.client}/${this.project}_${this.from}-${this.to}.html`
  }
}

module.exports = SQSTrigger

// require('dotenv').config()
// const ST = require('./src/report/sqs-trigger')
// let ru = new ST({from: 1, to: 2, projectId: 'SJ', client: 'shopjam'}).send()
