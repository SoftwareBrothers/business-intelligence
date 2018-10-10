const chai = require('chai')

global.expect = chai.expect

global.factory = require('factory-girl').factory

require('require.all')('./factories')
require('require.all')('./report')
