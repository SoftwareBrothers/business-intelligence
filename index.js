process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT']

const bankRunner = require('./bin/bank-runner')
const incomeSynchroniser = require('./bin/income-synchroniser')

exports.bankRunner = async (event) => {
  const files = await bankRunner()

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      parsedFiles: files
    })
  }

  return response
}

exports.incomeSynchroniser = async (event, context) => {
  const income = await incomeSynchroniser({
    month: '2018-09'
  })

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      income: income,
      month: event
    })
  }

  return response
}