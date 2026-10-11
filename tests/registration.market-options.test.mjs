import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, 'utils/registrationMarketView.js'), 'utf8')
const loginSource = fs.readFileSync(path.join(root, 'subPackage-auth/pages/login/login.js'), 'utf8')
const view = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

const options = view.buildRegistrationMarketOptions([
  { sysCityMarketId: 9, sysCmMarketName: '不在批发市场' },
  { sysCityMarketId: 0, sysCmMarketName: '不在市场' },
  { sysCityMarketId: 21, sysCmMarketName: '京贸物联批发市场' },
  { sysCityMarketId: 21, sysCmMarketName: '京贸物联批发市场' },
  { sysCityMarketId: 22, sysCmMarketName: '大洋路批发市场' }
])

assert.deepEqual(options, [
  { sysCityMarketId: 0, sysCmMarketName: '不在市场' },
  { sysCityMarketId: 21, sysCmMarketName: '京贸物联批发市场' },
  { sysCityMarketId: 22, sysCmMarketName: '大洋路批发市场' }
])
assert.deepEqual(view.buildRegistrationMarketOptions(null), [
  { sysCityMarketId: 0, sysCmMarketName: '不在市场' }
])
assert.match(loginSource, /itemsMarket:\s*buildRegistrationMarketOptions\(\[\]\)/)
assert.match(loginSource, /itemsMarket:\s*buildRegistrationMarketOptions\(markets\)/)

console.log('registration market options tests passed')
