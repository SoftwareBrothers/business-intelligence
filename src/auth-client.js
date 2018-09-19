/**
 * @fileOverview In this file we create auth client used by google services
 * to authenticate. Client requires following env variables to be set:
 * - GCLOUD_PROJECT and
 * - GOOGLE_APPLICATION_CREDENTIALS
 */


const { google } = require('googleapis')

module.exports = () => {
  return new Promise((resolve) => {
    google.auth.getApplicationDefault((error, authClient) => {
      if (authClient.createScopedRequired && authClient.createScopedRequired()) {
        authClient.createScoped([
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/drive',
        ])
      }
      resolve(authClient)
    })
  })
}
