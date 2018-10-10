class UsersStore {
  constructor({ allJiraDevelopers, projectDevelopers, clients, worklogDeveloperKeys } = {}) {
    this.allJiraDevelopers = allJiraDevelopers
    this.projectDevelopers = projectDevelopers
    this.worklogDeveloperKeys = worklogDeveloperKeys
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
  }

  nonPermanentDevelopers() {
    return this.worklogDeveloperKeys.map((k) => {
      return !this.projectDevelopersMap[k] && this.allJiraDevelopersMap[k]
    }).filter(x => x)
  }

  forUsername(username) {
    return this.allJiraDevelopersMap[username] || this.projectDevelopersMap[username]
  }
}

module.exports = UsersStore
