const moment = require('moment')
const WorklogParser = require('../../src/report/worklogs-parser')

describe('WorklogParser', function () {
  describe('#mapWorklogIssue', function () {
    beforeEach(async function () {
      this.service = new WorklogParser()
      this.issueKey = 'PRO-123'
      this.worklog = await factory.build('worklog', {
        issue: { key: this.issueKey },
      })
    })

    context('adding worklog to empty object', function () {
      beforeEach(function () {
        this.service.mapWorklogIssue(this.worklog)
      })

      it('creates new key with worklog in an array inside', function () {
        expect(this.service.worklogIssues[this.issueKey].worklogs.length).to.equal(1)
      })
    })

    context('adding two worklogs for the same issue', function () {
      beforeEach(function () {
        this.service.mapWorklogIssue(this.worklog)
        this.service.mapWorklogIssue(this.worklog)
      })

      it('creates only one key with worklogs in an array inside', function () {
        expect(Object.keys(this.service.worklogIssues).length).to.equal(1)
        expect(this.service.worklogIssues[this.issueKey].worklogs.length).to.equal(2)
      })
    })
  })
  context('2 worklogs for the same issue, 2 in the past, 2 today', function () {
    beforeEach(async function () {
      this.username = 'wojtek.k'
      this.issueKey = 'PRO-123'
      this.timeSpentSeconds = 900
      this.billableSeconds = 900
      this.worklogs = await factory.buildMany('worklog', 2, {
        issue: { key: this.issueKey },
        author: { username: this.username },
        timeSpentSeconds: this.timeSpentSeconds,
        billableSeconds: this.billableSeconds,
        startDate: moment().format('YYYY-MM-DD'),
      })
      this.worklogs = this.worklogs.concat(await factory.buildMany('worklog', 2, {
        issue: { key: this.issueKey },
        author: { username: this.username },
        timeSpentSeconds: this.timeSpentSeconds,
        billableSeconds: this.billableSeconds,
        startDate: moment().subtract(10, 'days').format('YYYY-MM-DD'),
      }))
    })

    describe('#forIssue', function () {
      describe('without reported period', function () {
        beforeEach(function () {
          this.service = new WorklogParser({ worklogs: this.worklogs })
          this.ret = this.service.forIssue(this.issueKey)
        })

        it('saves global time spent and billable', function () {
          expect(this.ret.timeSpentSeconds).to.equal(this.timeSpentSeconds * 4)
          expect(this.ret.billableSeconds).to.equal(this.billableSeconds * 4)
        })

        it('saves time spent for all users', function () {
          expect(Object.keys(this.ret.developers).length).to.equal(1)
          const userKey = Object.keys(this.ret.developers)[0]
          expect(this.ret.developers[userKey].timeSpentSeconds).to.equal(this.timeSpentSeconds * 4)
          expect(this.ret.developers[userKey].billableSeconds).to.equal(this.billableSeconds * 4)
        })
      })

      describe('with reported period just for today', function () {
        beforeEach(function () {
          this.service = new WorklogParser({ worklogs: this.worklogs })
          this.ret = this.service.forIssue(this.issueKey, {
            startDate: moment().subtract(1, 'day').startOf('day'),
            finishDate: moment().add(1, 'day'),
          })
        })

        it('saves global time spent and billable only for given period', function () {
          expect(this.ret.timeSpentSeconds).to.equal(this.timeSpentSeconds * 2)
          expect(this.ret.billableSeconds).to.equal(this.billableSeconds * 2)
        })
      })
    })

    describe('#forDeveloper', function () {
      describe('with reported period just for today', function () {
        beforeEach(function () {
          this.service = new WorklogParser({ worklogs: this.worklogs })
          this.ret = this.service.forDeveloper(this.username, {
            startDate: moment().subtract(1, 'day').startOf('day'),
            finishDate: moment().add(1, 'day'),
          })
        })

        it('saves global time spent and billable only for given period', function () {
          expect(this.ret.timeSpentSeconds).to.equal(this.timeSpentSeconds * 2)
          expect(this.ret.billableSeconds).to.equal(this.billableSeconds * 2)
        })
      })
    })
  })
})
