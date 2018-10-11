const WorklogsParser = require('./worklogs-parser')

class UsersStore {
  constructor({ allJiraDevelopers, projectDevelopers, clients, worklogDeveloperKeys, projectLead } = {}) {
    this.allJiraDevelopers = allJiraDevelopers
    this.projectDevelopers = projectDevelopers
    this.worklogDeveloperKeys = worklogDeveloperKeys
    this.projectLead = projectLead
    this.clients = clients

    this.prepareSets()
  }

  prepareSets() {
    this.projectDevelopers = this.projectDevelopers.filter(d => d.type === 'atlassian-user-role-actor')
    this.projectDevelopersMap = this.projectDevelopers.reduce((m, developer) => {
      m[developer.name] = developer
      return m
    }, {})
    this.allJiraDevelopersMap = this.allJiraDevelopers.reduce((m, developer) => {
      m[developer.name] = developer
      return m
    }, {})
    this.allJiraDevelopersMap[this.projectLead.name] = this.projectLead
  }

  nonPermanentDevelopers() {
    return this.worklogDeveloperKeys.map((k) => {
      return !this.projectDevelopersMap[k]
          && k !== this.projectLead.name
          && this.allJiraDevelopersMap[k]
    }).filter(x => x)
  }

  forWorklogAuthor({ username, displayName }) {
    if (username) {
      const worklogs = this.allJiraDevelopersMap[username]
                    || this.projectDevelopersMap[username]
      if (worklogs) {
        return worklogs
      }
    }
    displayName = displayName || username
    return this.allJiraDevelopers.find(d => d.displayName === displayName)
        || this.projectDevelopers.find(d => d.displayName === displayName)
  }
}

module.exports = UsersStore
