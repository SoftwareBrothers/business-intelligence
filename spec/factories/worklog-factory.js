factory.define('worklog', Object, {
  self: 'https://api.tempo.io/2/worklogs/79773',
  tempoWorklogId: factory.seq('Worklog.tempoWorklogId', n => n),
  jiraWorklogId: factory.seq('Worklog.jiraWorklogId', n => n),
  issue: {
    self: factory.seq('Worklog.issueKey', n => `https://somecompany.atlassian.net/rest/api/2/issue/PRO-${n}`),
    key: factory.seq('Worklog.issueKey', n => `PRO-${n}`),
  },
  timeSpentSeconds: 900,
  billableSeconds: 900,
  startDate: '2018-08-14',
  startTime: '00:00:00',
  description: 'Standup',
  createdAt: '2018-08-14T08:41:30Z',
  updatedAt: '2018-08-14T08:41:30Z',
  author: {
    self: 'https://somecompany.atlassian.net/rest/api/2/user?username=Loro.bajoro',
    username: 'loro.bajoro',
    displayName: 'Loro Bajoro',
  },
  attributes: {
    self: 'https://api.tempo.io/2/worklogs/79773/work-attribute-values',
    values: [],
  },
})
