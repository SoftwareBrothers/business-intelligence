class Worklog {
  constructor(params) {
    this.params = params
  }

  billableHour() {
    return this.params.billableSeconds / 3600
  }

  issueKey() {
    return this.params.issue.key
  }

  projectKey() {
    return this.issueKey().split('-')[0]
  }

  wasInvoiced() {
    return this.params.attributes
      && this.params.attributes.values
      && !!this.params.attributes.values.find(v => v.key === '_Invoice_' && !!v.value)
  }
}

module.exports = Worklog
