/**
 * @fileOverview In this file we create auth client used by google services
 * to authenticate. Client requires following env variables to be set:
 * - GCLOUD_PROJECT and
 * - GOOGLE_APPLICATION_CREDENTIALS
 */

'use strict';

const {google} = require('googleapis');

module.exports = function() {
  return new Promise((resolve, reject) => {
    let authClient = google.auth.getApplicationDefault(function(error, authClient) {
      if (authClient.createScopedRequired && authClient.createScopedRequired()) {
        authClient = authClient.createScoped([
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/drive',
        ]);
      }
      resolve(authClient)
    });
  })
};