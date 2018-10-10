module.exports = {
    "extends": "airbnb-base",
    "env": {
      mocha: true
    },
    "plugins": [
        "import",
        "mocha"
    ],
    "rules": {
        'semi': [2, 'never'],
        'prefer-arrow-callback': 0,
        'func-names': 0,
        'mocha/no-exclusive-tests': 'error',
        'mocha/no-mocha-arrows': 'error',
    },
    "globals": {
      "expect": true,
      "factory": true
    }
};