const Worklog = require('../../src/models/worklog')


describe.only('Worklog', function () {
  describe('#wasInvoiced', function () {
    context('invoiced worklog', function () {
      beforeEach(async function () {
        const params = await factory.build('invoicedWorklog')
        this.worklog = new Worklog(params)
      })

      it('returns true for invoiced worklog', function () {
        expect(this.worklog.wasInvoiced()).to.equal(true)
      })
    })

    context('regular worklog', function () {
      beforeEach(async function () {
        const params = await factory.build('worklog')
        this.worklog = new Worklog(params)
      })

      it('returns true for invoiced worklog', function () {
        expect(this.worklog.wasInvoiced()).to.equal(false)
      })
    })
  })

  describe('#billableHour', function () {
    it('returns billable time in hours', async function () {
      const params = await factory.build('worklog', {
        billableSeconds: 36000,
      })
      expect(new Worklog(params).billableHour()).to.equal(10)
    })
  })

  describe('#issueKey', function () {
    it('returns issue.key', async function () {
      const params = await factory.build('worklog')
      expect(new Worklog(params).issueKey()).to.equal(params.issue.key)
    })
  })

  describe('#projectKey', function () {
    it('returns project key', async function () {
      this.projectKey = 'PRO'
      const params = await factory.build('worklog', {
        issue: { key: `${this.projectKey}-123` },
      })
      expect(new Worklog(params).projectKey()).to.equal(this.projectKey)
    })
  })
})
