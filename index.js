process.env.PATH = `${process.env.PATH}:${process.env.LAMBDA_TASK_ROOT}`

const bankRunner = require('./bin/bank-runner')
const incomeSynchroniser = require('./bin/income-synchroniser')

exports.bankRunner = async () => {
  const files = await bankRunner()

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      parsedFiles: files,
    }),
  }

  return response
}

exports.incomeSynchroniser = async (event) => {
  const income = await incomeSynchroniser({
    month: event.params.querystring.month,
  })

  const response = {
    statusCode: 200,
    body: {
      income,
      month: event.params.querystring.month,
    },
  }

  return response
}
