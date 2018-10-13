const AWS = require('aws-sdk')

class SQSTrigger {
  constructor({ client, projects, from, to }) {
    this.params = {
      projects, client, from, to,
    }
    this.sqs = new AWS.SQS({
      apiVersion: '2012-11-05',
      region: process.env.AWS_DEFAULT_REGION,
    })
  }

  async send() {
    return this.sqs.sendMessage({
      MessageBody: JSON.stringify(this.params),
      QueueUrl: process.env.AWS_QUEUE_URL,
    }).promise()
  }
}

module.exports = SQSTrigger