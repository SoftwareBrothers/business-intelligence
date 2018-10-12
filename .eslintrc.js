module.exports = {
    "extends": "airbnb-base",
    "env": {
      mocha: true
    },
    "plugins": [
        "import"
    ],
    "rules": {
        'semi': [2, 'never'],
        'no-param-reassign': 0,
        'no-use-before-define': 0
    }
};