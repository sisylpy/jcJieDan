import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const appJson = JSON.parse(read('app.json'))
const homeWxml = read('subPackage/pages/management/homePage/homePage.wxml')
const homeJs = read('subPackage/pages/management/homePage/homePage.js')
const listJs = read('subPackage/pages/announcement/index/index.js')
const listWxml = read('subPackage/pages/announcement/index/index.wxml')
const detailJs = read('subPackage/pages/announcement/detail/detail.js')
const detailWxml = read('subPackage/pages/announcement/detail/detail.wxml')

const mainSubPackage = appJson.subPackages.find((item) => item.root === 'subPackage/')
assert.ok(mainSubPackage, '应存在 subPackage 主分包')
assert.ok(mainSubPackage.pages.includes('pages/announcement/index/index'))
assert.ok(mainSubPackage.pages.includes('pages/announcement/detail/detail'))

assert.match(homeWxml, /公司公告牌/)
assert.match(homeWxml, /bindtap="toAnnouncementBoard"/)
assert.match(homeJs, /toAnnouncementBoard\(\)/)
assert.match(homeJs, /\.\.\/\.\.\/announcement\/index\/index/)

assert.match(listJs, /getVisibleDistributerAnnouncements/)
assert.match(listJs, /activeTab: 'ALL'/)
assert.match(listJs, /AFTER_SALES/)
assert.match(listWxml, /搜索公告标题、内容/)
assert.match(listWxml, /暂无可见公告/)
assert.match(listWxml, /bindtap="openDetail"/)

assert.match(detailJs, /getAfterSalesAnnouncement/)
assert.match(detailJs, /publishAfterSalesAnnouncement/)
assert.match(detailJs, /withdrawAfterSalesAnnouncement/)
assert.match(detailJs, /roleCode === 0 \|\| roleCode === 1/)
assert.match(detailWxml, /发布人/)
assert.match(detailWxml, /接收范围/)
assert.match(detailWxml, /关联问题/)
assert.match(detailWxml, /公告内容/)
assert.match(detailWxml, /撤回/)
assert.match(detailWxml, /编辑公告/)

assert.doesNotMatch(listJs, /unread|isRead|importantLevel/)
assert.doesNotMatch(detailJs, /shareAnnouncement|attachmentList/)

console.log('PASS announcement board UI: 管理入口、可见列表、详情、关联售后与管理动作')
