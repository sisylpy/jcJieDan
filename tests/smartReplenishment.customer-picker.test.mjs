import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(
  path.join(root, 'subPackage-charts/pages/smartReplenishment/customerPicker/customerPicker.js'),
  'utf8'
).replace(/import[^\n]+\n/, '')

let pageConfig
let committed
const departments = [
  { departmentId: 20, departmentName: '餐厅', historicalLineCount: 10 },
  { departmentId: 21, departmentName: '酒店', historicalLineCount: 8 },
  { departmentId: 22, departmentName: '食堂', historicalLineCount: 6 }
]
const previous = { applyCustomerSelection(value) { committed = value } }
const context = vm.createContext({
  console,
  Number,
  String,
  Object,
  Array,
  Set,
  Error,
  Page: config => { pageConfig = config },
  getApp: () => ({ globalData: {} }),
  getCurrentPages: () => [previous, {}],
  getSmartReplenishmentCatalog: async () => null,
  wx: {
    getStorageSync(key) {
      if (key === 'userInfo') return { nxDiuDistributerId: 13 }
      if (key === 'smartReplenishmentCustomerCatalog') {
        return { distributerId: 13, departments }
      }
      return null
    },
    navigateBack() {}
  }
})

new vm.Script(source, { filename: 'smartReplenishment/customerPicker.js' }).runInContext(context)
const page = {
  ...pageConfig,
  data: JSON.parse(JSON.stringify(pageConfig.data)),
  setData(update) { Object.assign(this.data, update) }
}

page.onLoad({ selectedIds: '20,21' })
assert.deepEqual(JSON.parse(JSON.stringify(page.data.selectedIds)), [20, 21])
assert.deepEqual(page.data.customers.filter(item => item.selected)
  .map(item => item.departmentId), [20, 21])

page.selectCustomer({ currentTarget: { dataset: { id: 22 } } })
page.confirmSelection()
assert.deepEqual(JSON.parse(JSON.stringify(committed)), { departmentIds: [20, 21, 22] })

page.selectAll()
page.confirmSelection()
assert.deepEqual(JSON.parse(JSON.stringify(committed)), { departmentIds: [] })

console.log('smart replenishment customer picker tests passed')
