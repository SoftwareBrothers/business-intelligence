/**
 * @description Simple script which check out if given page exists.
 *              It takes page from the spreadsheet provided in the env vars
 * 
 * Env vars:
 * PAGES_SHEET=1wnRkTGj2GPb14YFLe3Uh0HW7FaZc7hvMGJXNYxcpg5g
 * TIMEOUT=5000
 * START_ROW=3
 * ROW_MAX=26348
 * 
 */

require('dotenv').config()
const cheerio = require('cheerio')
const request = require('request')
const util = require('util')

const SHEET = process.env.PAGES_SHEET || '1wnRkTGj2GPb14YFLe3Uh0HW7FaZc7hvMGJXNYxcpg5g'
const Sheets = require('../src/sheets-client')

const timeout = process.env.TIMEOUT || 5000
const startRow = (process.env.START_ROW && parseInt(process.env.START_ROW)) || 3
const rowMax = (process.env.ROW_MAX && parseInt(process.env.ROW_MAX)) || 26348

const run = async () => {
  const sheet = new Sheets({ docId: SHEET })
  await sheet.init()
  const bathSize = 10
  let keywoards = await sheet.values({ range: 'C1:AP2', valueRenderOption: 'UNFORMATTED_VALUE' })
  keywoards = keywoards[1].reduce((memo, kw, index) => {
    if (keywoards[0][index]) {
      memo.push({ page: keywoards[0][index], keywoards: [keywoards[1][index]], index })
    } else {
      memo[memo.length - 1].keywoards.push(keywoards[1][index])
    }
    return memo
  }, [])

  for (let offset = startRow || 3; offset < rowMax; offset += bathSize) {
    const responses = []
    const pages = await sheet.values({ range: `A${offset}:A${offset + bathSize}` })
    for (let index = 0; index < pages.length; index++) {
      let uri = pages[index][0];
      if (!uri.match('http')) {
        uri = `http://${uri}`
      }
      console.log('parsing: ' + uri + ' ...')
      let resp = []
      let response
      try {
        response = await util.promisify(request)({ url: uri, timeout })
        resp[0] = response.statusCode
      } catch (error) {
        resp[0] = error.message
      }
      if (resp[0] === 200) {
        const $ = cheerio.load(response.body, { lowerCaseTags: true })
        for (let k = 0; k < keywoards.length; k++) {
          const kw = keywoards[k]
          if (kw.page === 'home') {
            let p = $('*').text().toLowerCase()
            let checks = keywoards[k].keywoards.map((keywoard) => {
              return p.match(keywoard) ? 'yes' : 'no'
            })
            resp = [...resp, ...checks]
          } else {
            const pages = kw.page.split(',').map(p => p.trim())
            const linkPage = pages.map((page) => {
              const links = $('a').filter(function () {
                return $(this).text().toLowerCase().match(page)
              })
              return links.length > 0 ? links[0] : 0
            }).find(a => a)

            if (linkPage && $(linkPage).attr('href')) {
              let href = $(linkPage).attr('href')
              if (!href.match('http')) {
                let url = new URL(uri)
                href = `${url.protocol}//${url.host}/${href.replace(/^\//, '')}`
              }
              try {
                let res = await util.promisify(request)({ url: href, timeout })
                let p = cheerio.load(res.body)('*').text().toLowerCase()
                let checks = kw.keywoards.map((keywoard) => {
                  return p.match(keywoard) ? 'yes' : 'no'
                })
                resp = [...resp, ...checks]
              } catch {
                resp = [...resp, ...kw.keywoards.map(k => 'error loading: ' + href)]
              }
            } else {
              resp = [...resp, ...kw.keywoards.map(k => 'not found')]
            }
          }
        }
      }
      responses.push(resp)
      
    }
    sheet.update({ range: `B${offset}:AP${offset + bathSize}`, values: responses })
    console.log(`processed: ${offset}:${offset+bathSize}`)
  }
}

run()