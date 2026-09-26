import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
import {
  getDisLinshiGoods,
  disGetGoodsDetail,
  disSaveStandard,
  disUpdateStandard,
  disDeleteStandard,
  saveDisAlias,
  updateDisAlias,
  disDeleteAlias,
  disSaveLinshiToNxGoods,
} from '../../../../lib/apiDistributer.js'
import { downDisGoods } from '../../../lib/apiibook.js'
import { disGetLinshiGoodsList, searchLinshiGoods } from '../../../../lib/apiDepOrder.js'

Page({
  onShow() {
    // 从子页返回时刷新；首次进入时 onLoad 回调已加载
    if (this.data.disId) this._loadAllTabs()
  },

  data: {
    goodsId: null,
    showImageModal: false,
    currentImage: '',
    currentGoods: null,
    tabs: [
      { id: 0, name: '未处理', count: 0 },
      { id: 1, name: '推荐', count: 0 },
      { id: 2, name: '申请添加', count: 0 },
      { id: 3, name: '已处理', count: 0 },
    ],
    tabIndex: 0,
    goodsList: [],
    recommendList: [],
    applyList: [],
    doneList: [],
    // 已处理分页
    donePage: 1,
    doneTotalPage: 1,
    doneLimit: 10,
    doneHasMore: true,
    doneLoading: false,
    // 推荐 tab：已下载的 nxGoodsId 列表，下载后才可点击「等于这个」
    downloadedNxGoodsIds: [],
    // 已处理 tab：规格/别名 弹窗相关
    showAdd: false,
    showAddAlias: false,
    showChoice: false,
    showOperation: false,
    depGoodsName: '',
    standardName: '',
    itemStandard: null,
    editStandard: false,
    itemAlias: null,
    editAlias: false,
    indexStandand: 0,
    indexAlias: 0,
    choiceType: '',
    currentEditIndex: -1,
    currentEditListKey: '', // ''=doneList, 'searchListMinus1'=search
    modalContentHeight: 0,
    scrollViewTop: 0,
    maskHeight: 0,
    // 搜索
    searchKeyword: '',
    isSearchMode: false,
    searchList0: [],
    searchList1: [],
    searchList2: [],
    searchListMinus1: [],
    searchPage: 1,
    searchTotalPage: 1,
    searchHasMore: true,
    searchLoading: false,
    searchLimit: 10,
  },

  onLoad(options) {
    const app = getApp();
    const globalData = app.globalData;
    const navBarHeight = globalData.navBarHeight * globalData.rpxR;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      maskHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight,
      disId: options.disId,
      goodsId: options.goodsId,
      url: apiUrl.server,
    }, () => {
      // setData 回调中加载，确保 disId 已写入
      if (options.disId) this._loadAllTabs()
    })
  },

  onTabTap(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10)
    this.setData({ tabIndex: index })
    // 切换 tab 时刷新该 tab 数据
    if (index === 0) this._loadTab0()
    else if (index === 1) this._loadTab1()
    else if (index === 2) this._loadTab2()
    else if (index === 3) this._loadTab3()
  },

  onSwiperChange(e) {
    const index = e.detail.current
    this.setData({ tabIndex: index })
  },

  _loadAllTabs() {
    this._loadTab0()
    this._loadTab1()
    this._loadTab2()
    this._loadTab3()
  },

  _loadTab0() {
    load.showLoading("查询商品中");
    getDisLinshiGoods(this.data.disId, 0).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        const list = res.result.data || []
        this.setData({
          goodsList: list,
          'tabs[0].count': list.length,
        })
      }
    }).catch(() => {})
  },

  _loadTab1() {
    getDisLinshiGoods(this.data.disId, 1).then(res => {
      if (res.result.code == 0) {
        const list = res.result.data || []
        this.setData({
          recommendList: list,
          'tabs[1].count': list.length,
        })
      }
    }).catch(() => {})
  },

  _loadTab2() {
    getDisLinshiGoods(this.data.disId, 2).then(res => {
      if (res.result.code == 0) {
        const list = res.result.data || []
        this.setData({
          applyList: list,
          'tabs[2].count': list.length,
        })
      }
    }).catch(() => {})
  },

  _loadTab3() {
    this.setData({
      donePage: 1,
      doneList: [],
      doneHasMore: true,
      doneLoading: false,
    })
    this._fetchDoneList(1)
  },

  _fetchDoneList(page) {
    if (!this.data.doneHasMore && page > 1) return
    if (page > 1 && this.data.doneLoading) return
    if (page === 1) load.showLoading('获取中')
    this.setData({ doneLoading: true })
    disGetLinshiGoodsList({
      disId: this.data.disId,
      page,
      limit: this.data.doneLimit,
    }).then(res => {
      if (page === 1) load.hideLoading()
      this.setData({ doneLoading: false })
      if (res.result.code == 0) {
        const pageData = res.result.page || {}
        const list = pageData.list || []
        const totalPage = pageData.totalPage || 1
        const currPage = pageData.currPage || page
        const totalCount = pageData.totalCount || 0
        const prevList = page === 1 ? [] : this.data.doneList
        this.setData({
          doneList: [...prevList, ...list],
          donePage: currPage,
          doneTotalPage: totalPage,
          doneHasMore: currPage < totalPage,
          'tabs[3].count': totalCount,
        })
      }
    }).catch(() => {
      if (page === 1) load.hideLoading()
      this.setData({ doneLoading: false })
    })
  },

  toAlias(e) {
    wx.setStorageSync('linshiGoods', e.currentTarget.dataset.item)
    wx.navigateTo({
      url: '../ailasGoodsList/ailasGoodsList?name=' + e.currentTarget.dataset.name
        + '&id=' + e.currentTarget.dataset.id + '&type=' + (e.currentTarget.dataset.type || '')
        + '&standard=' + (e.currentTarget.dataset.standard || ''),
    })
  },

  toCustomerServicePages() {
    try {
      wx.openCustomerServiceChat({
        extInfo: { url: 'https://work.weixin.qq.com/kfid/kfc016b04fed31d2375' },
        corpId: 'ww9778dea409045fe6',
        success() {}
      })
    } catch (e) {
      wx.showToast({ title: '请更新至微信最新版本', icon: 'none' })
    }
  },

  // 推荐 tab：下载 nxGoods
  downLoadNxGoods(e) {
    const nxGoods = e.currentTarget.dataset.item
    const nxGoodsId = nxGoods.nxGoodsId || nxGoods.nxDistributerGoodsId
    if (!nxGoodsId) {
      wx.showToast({ title: '商品信息异常', icon: 'none' })
      return
    }
    const dg = {
      nxDgDistributerId: this.data.disId,
      nxDgNxGoodsId: nxGoodsId,
    }
    load.showLoading('保存商品')
    downDisGoods(dg).then(res => {
      load.hideLoading()
      if (res.result.code == 0) {
        wx.showToast({ title: '下载成功', icon: 'success' })
        const ids = [...(this.data.downloadedNxGoodsIds || []), nxGoodsId]
        this.setData({ downloadedNxGoodsIds: ids })
        this._loadTab1()
      } else {
        wx.showToast({ title: res.result.msg || '下载失败', icon: 'none' })
      }
    }).catch(() => {
      load.hideLoading()
      wx.showToast({ title: '下载失败', icon: 'none' })
    })
  },

  // 推荐 tab：等于这个（完成转换）
  // data-id: 已下载时传 nxDistributerGoodsId，未下载时传 nxGoodsId（需先下载）
  toExchange(e) {
    const id = e.currentTarget.dataset.id
    const lsGoodsId = e.currentTarget.dataset.lsId
    const isDownloaded = e.currentTarget.dataset.isDownloaded === true || e.currentTarget.dataset.isDownloaded === 'true'
    if (!isDownloaded) {
      const downloaded = this.data.downloadedNxGoodsIds || []
      if (!downloaded.includes(id)) {
        wx.showToast({ title: '请先下载该商品', icon: 'none' })
        return
      }
    }
    if (!id || !lsGoodsId) return
    const data = {
      nxGoodsId: id,
      lsGoodsId,
      disId: this.data.disId,
    }
    load.showLoading('保存中')
    disSaveLinshiToNxGoods(data).then(res => {
      load.hideLoading()
      if (res.result.code == 0) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        this._loadAllTabs()
      } else {
        wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' })
      }
    }).catch(() => {
      load.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  // 申请添加新商品：跳转到 disUpdateGoodsLinshi 页面
  toApplyAddPage(e) {
    const parent = e.currentTarget.dataset.parent
    if (!parent || !parent.nxDistributerGoodsId) return
    wx.setStorageSync('linshiGoods', parent)
    wx.navigateTo({
      url: '../disUpdateGoodsLinshi/disUpdateGoodsLinshi',
    })
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  shwoIImage(e) {
    const goods = e.currentTarget.dataset.goods
    if (!goods) return
    let imageUrl = ''
    if (goods.nxDgGoodsFileLarge && goods.nxDgGoodsFileLarge !== 'null') {
      imageUrl = this.data.url + goods.nxDgGoodsFileLarge
    } else if (goods.nxGoodsFileBig && goods.nxGoodsFileBig !== 'null') {
      imageUrl = this.data.url + goods.nxGoodsFileBig
    } else if (goods.nxGoodsFile && goods.nxGoodsFile !== 'null') {
      imageUrl = this.data.url + goods.nxGoodsFile
    } else if (goods.nxGoodsFileLarge && goods.nxGoodsFileLarge !== 'null') {
      imageUrl = this.data.url + goods.nxGoodsFileLarge
    } else if (goods.nxDgGoodsLsFileLarge) {
      imageUrl = this.data.url + goods.nxDgGoodsLsFileLarge
    } else if (goods.nxDgGoodsFile && goods.nxDgGoodsFile !== 'null') {
      imageUrl = this.data.url + goods.nxDgGoodsFile
    }
    if (!imageUrl) {
      wx.showToast({ title: '暂无图片', icon: 'none' })
      return
    }
    this.setData({
      showImageModal: true,
      currentImage: imageUrl,
      currentGoods: goods,
    })
  },

  hideImageModal() {
    this.setData({
      showImageModal: false,
      currentImage: '',
      currentGoods: null,
    })
  },

  stopPropagation() {},

  onImageLoad() {},
  onImageError() {
    wx.showToast({ title: '图片加载失败', icon: 'none' })
  },

  // ========== 已处理 tab：规格/别名 业务 ==========
  _getGoodsFromItem(item) {
    return item && item.nxDistributerGoodsEntity ? item.nxDistributerGoodsEntity : null
  },
  _ensureGoodsDetail(item, goodsIndex) {
    const goods = this._getGoodsFromItem(item)
    if (!goods || !goods.nxDistributerGoodsId) return Promise.resolve(goods)
    const hasStandard = Array.isArray(goods.nxDistributerStandardEntities)
    const hasAlias = Array.isArray(goods.nxDistributerAliasEntities)
    if (hasStandard && hasAlias) return Promise.resolve(goods)
    const listKey = this.data.currentEditListKey || 'doneList'
    const list = this.data[listKey] || []
    return new Promise((resolve) => {
      load.showLoading('获取详情')
      disGetGoodsDetail(goods.nxDistributerGoodsId).then(res => {
        load.hideLoading()
        if (res.result.code === 0 && res.result.data && res.result.data.goodsInfo) {
          const fullGoods = res.result.data.goodsInfo
          const next = [...list]
          if (next[goodsIndex] && next[goodsIndex].nxDistributerGoodsEntity) {
            next[goodsIndex] = { ...next[goodsIndex], nxDistributerGoodsEntity: fullGoods }
            this.setData({ [listKey]: next })
          }
          resolve(fullGoods)
        } else {
          resolve(goods)
        }
      }).catch(() => {
        load.hideLoading()
        resolve(goods)
      })
    })
  },
  _updateDoneListGoods(goodsIndex, updater) {
    const listKey = this.data.currentEditListKey || 'doneList'
    const list = this.data[listKey] || []
    const next = list.map((it, i) => {
      if (i !== goodsIndex || !it.nxDistributerGoodsEntity) return it
      const goods = { ...it.nxDistributerGoodsEntity }
      updater(goods)
      return { ...it, nxDistributerGoodsEntity: goods }
    })
    this.setData({ [listKey]: next })
  },
  getFocus(e) {
    const app = getApp()
    const globalData = app.globalData
    const modalContentHeight = (globalData.windowHeight - (e.detail.keyboardHeight || 0)) * globalData.rpxR
    this.setData({ modalContentHeight })
  },
  hideMask() {
    this.setData({
      showChoice: false,
      showOperation: false,
    })
  },
  addStandard(e) {
    const goodsIndex = parseInt(e.currentTarget.dataset.goodsindex, 10)
    const listKey = e.currentTarget.dataset.listkey || 'doneList'
    const list = this.data[listKey] || []
    const item = list[goodsIndex]
    const goods = this._getGoodsFromItem(item)
    if (!goods) return
    this._ensureGoodsDetail(item, goodsIndex).then((g) => {
      if (!g) return
      const entities = g.nxDistributerStandardEntities || []
      if (!g.nxDistributerStandardEntities) {
        this._updateDoneListGoods(goodsIndex, (gg) => { gg.nxDistributerStandardEntities = [] })
      }
      this.setData({
        showAdd: true,
        depGoodsName: g.nxDgGoodsName,
        standardName: '',
        editStandard: false,
        itemStandard: null,
        currentEditIndex: goodsIndex,
        currentEditListKey: listKey,
      })
    })
  },
  addDisAlias(e) {
    const goodsIndex = parseInt(e.currentTarget.dataset.goodsindex, 10)
    const listKey = e.currentTarget.dataset.listkey || 'doneList'
    const list = this.data[listKey] || []
    const item = list[goodsIndex]
    const goods = this._getGoodsFromItem(item)
    if (!goods) return
    this._ensureGoodsDetail(item, goodsIndex).then((g) => {
      if (!g) return
      if (!g.nxDistributerAliasEntities) {
        this._updateDoneListGoods(goodsIndex, (gg) => { gg.nxDistributerAliasEntities = [] })
      }
      this.setData({
        showAddAlias: true,
        depGoodsName: g.nxDgGoodsName,
        editAlias: false,
        itemAlias: null,
        currentEditIndex: goodsIndex,
        currentEditListKey: listKey,
      })
    })
  },

  
  clickItem(e) {
    const type = e.currentTarget.dataset.type
    const goodsIndex = parseInt(e.currentTarget.dataset.goodsindex, 10)
    const listKey = e.currentTarget.dataset.listkey || 'doneList'
    const list = this.data[listKey] || []
    const item = list[goodsIndex]
    const goods = this._getGoodsFromItem(item)
    if (!goods) return
    const depGoodsName = goods.nxDgGoodsName
    if (type === 'standard') {
      this.setData({
        depGoodsName,
        choiceType: 'standard',
        showChoice: true,
        showOperation: true,
        indexStandand: parseInt(e.currentTarget.dataset.index, 10),
        itemStandard: e.currentTarget.dataset.itemstandard,
        currentEditIndex: goodsIndex,
        currentEditListKey: listKey,
      })
    } else if (type === 'alias') {
      this.setData({
        depGoodsName,
        choiceType: 'alias',
        showChoice: true,
        showOperation: true,
        indexAlias: parseInt(e.currentTarget.dataset.index, 10),
        itemAlias: e.currentTarget.dataset.itemalias,
        currentEditIndex: goodsIndex,
        currentEditListKey: listKey,
      })
    }
  },
  edit() {
    if (this.data.choiceType === 'standard') {
      this.setData({
        showAdd: true,
        editStandard: true,
        showChoice: false,
        showOperation: false,
      })
    } else if (this.data.choiceType === 'alias') {
      this.setData({
        showAddAlias: true,
        editAlias: true,
        showChoice: false,
        showOperation: false,
      })
    }
  },
  delete() {
    const that = this
    const idx = this.data.currentEditIndex
    this.setData({ showChoice: false, showOperation: false })
    if (this.data.choiceType === 'standard') {
      const disStandardId = this.data.itemStandard.nxDistributerStandardId
      disDeleteStandard(disStandardId).then(res => {
        if (res.result.code === 0) {
          that._updateDoneListGoods(idx, (g) => {
            const arr = [...(g.nxDistributerStandardEntities || [])]
            arr.splice(that.data.indexStandand, 1)
            g.nxDistributerStandardEntities = arr
          })
          wx.showToast({ title: '删除成功', icon: 'success' })
        } else {
          wx.showToast({ title: res.result.msg || '删除失败', icon: 'none' })
        }
      }).catch(() => wx.showToast({ title: '删除失败', icon: 'none' }))
    } else if (this.data.choiceType === 'alias') {
      const disAliasId = this.data.itemAlias.nxDistributerAliasId
      disDeleteAlias(disAliasId).then(res => {
        if (res.result.code === 0) {
          that._updateDoneListGoods(idx, (g) => {
            const arr = [...(g.nxDistributerAliasEntities || [])]
            arr.splice(that.data.indexAlias, 1)
            g.nxDistributerAliasEntities = arr
          })
          wx.showToast({ title: '删除成功', icon: 'success' })
        } else {
          wx.showToast({ title: res.result.msg || '删除失败', icon: 'none' })
        }
      }).catch(() => wx.showToast({ title: '删除失败', icon: 'none' }))
    }
    this.setData({ itemStandard: null, itemAlias: null })
  },
  cancle() {
    this.setData({
      showAdd: false,
      showAddAlias: false,
      standardName: '',
      depGoodsName: '',
      itemStandard: null,
      itemAlias: null,
      editStandard: false,
      editAlias: false,
      currentEditListKey: '',
    })
  },
  confirmStandard(e) {
    if (this.data.editStandard) {
      this._updateStandard(e)
    } else {
      this._saveStandard(e)
    }
    this.setData({
      showAdd: false,
      standardName: '',
      itemStandard: null,
      editStandard: false,
    })
  },
  _saveStandard(e) {
    const idx = this.data.currentEditIndex
    const listKey = this.data.currentEditListKey || 'doneList'
    const item = (this.data[listKey] || [])[idx]
    const goods = this._getGoodsFromItem(item)
    if (!goods) return
    const data = {
      nxDsDisGoodsId: goods.nxDistributerGoodsId,
      nxDsStandardName: e.detail.standardName,
    }
    disSaveStandard(data).then(res => {
      if (res.result.code === 0) {
        this._updateDoneListGoods(idx, (g) => {
          const arr = [...(g.nxDistributerStandardEntities || []), res.result.data]
          g.nxDistributerStandardEntities = arr
        })
        wx.showToast({ title: '添加成功', icon: 'success' })
      } else {
        wx.showToast({ title: res.result.msg || '添加失败', icon: 'none' })
      }
    }).catch(() => wx.showToast({ title: '添加失败', icon: 'none' }))
  },
  _updateStandard(e) {
    const idx = this.data.currentEditIndex
    const data = {
      nxDistributerStandardId: this.data.itemStandard.nxDistributerStandardId,
      nxDsStandardName: e.detail.standardName,
    }
    disUpdateStandard(data).then(res => {
      if (res.result.code === 0) {
        this._updateDoneListGoods(idx, (g) => {
          const arr = [...(g.nxDistributerStandardEntities || [])]
          arr[this.data.indexStandand] = { ...arr[this.data.indexStandand], ...data }
          g.nxDistributerStandardEntities = arr
        })
        wx.showToast({ title: '修改成功', icon: 'success' })
      } else {
        wx.showToast({ title: res.result.msg || '修改失败', icon: 'none' })
      }
    }).catch(() => wx.showToast({ title: '修改失败', icon: 'none' }))
  },
  confirmAlias(e) {
    if (this.data.editAlias) {
      this._updateAlias(e)
    } else {
      this._saveAlias(e)
    }
    this.setData({
      showAddAlias: false,
      itemAlias: null,
      editAlias: false,
    })
  },
  _saveAlias(e) {
    const idx = this.data.currentEditIndex
    const listKey = this.data.currentEditListKey || 'doneList'
    const item = (this.data[listKey] || [])[idx]
    const goods = this._getGoodsFromItem(item)
    if (!goods) return
    const data = {
      nxDaDisGoodsId: goods.nxDistributerGoodsId,
      nxDaAliasName: e.detail.aliasName,
    }
    saveDisAlias(data).then(res => {
      if (res.result.code === 0) {
        const ret = res.result.data
        if (ret && ret.nxDistributerGoodsId) {
          const list = this.data[listKey] || []
          const next = list.map((it, i) => {
            if (i !== idx || !it.nxDistributerGoodsEntity) return it
            return { ...it, nxDistributerGoodsEntity: ret }
          })
          this.setData({ [listKey]: next })
        } else {
          this._updateDoneListGoods(idx, (g) => {
            const newAlias = ret && ret.nxDaAliasName ? ret : { nxDaAliasName: data.nxDaAliasName }
            const arr = [...(g.nxDistributerAliasEntities || []), newAlias]
            g.nxDistributerAliasEntities = arr
          })
        }
        wx.showToast({ title: '添加成功', icon: 'success' })
      } else {
        wx.showToast({ title: res.result.msg || '添加失败', icon: 'none' })
      }
    }).catch(() => wx.showToast({ title: '添加失败', icon: 'none' }))
  },
  _updateAlias(e) {
    const idx = this.data.currentEditIndex
    const data = {
      nxDistributerAliasId: this.data.itemAlias.nxDistributerAliasId,
      nxDaAliasName: e.detail.aliasName,
    }
    updateDisAlias(data).then(res => {
      if (res.result.code === 0) {
        this._updateDoneListGoods(idx, (g) => {
          const arr = [...(g.nxDistributerAliasEntities || [])]
          arr[this.data.indexAlias] = { ...arr[this.data.indexAlias], ...data }
          g.nxDistributerAliasEntities = arr
        })
        wx.showToast({ title: '修改成功', icon: 'success' })
      } else {
        wx.showToast({ title: res.result.msg || '修改失败', icon: 'none' })
      }
    }).catch(() => wx.showToast({ title: '修改失败', icon: 'none' }))
  },

  // 已处理 tab 的 scroll-view 触底加载（scroll-view 内部滚动不会触发 onReachBottom）
  onDoneListScrollToLower() {
    if (this.data.tabIndex === 3 && this.data.doneHasMore) {
      this._fetchDoneList(this.data.donePage + 1)
    }
  },

  // ========== 搜索 ==========
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },
  onSearch() {
    const kw = (this.data.searchKeyword || '').trim()
    if (!kw) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' })
      return
    }
    this.setData({
      isSearchMode: true,
      searchPage: 1,
      searchList0: [],
      searchList1: [],
      searchList2: [],
      searchListMinus1: [],
      searchHasMore: true,
      searchLoading: false,
    })
    this._fetchSearchResults(1)
  },
  onClearSearch() {
    this.setData({
      isSearchMode: false,
      searchKeyword: '',
      searchList0: [],
      searchList1: [],
      searchList2: [],
      searchListMinus1: [],
    })
  },
  onSearchScrollToLower() {
    if (this.data.isSearchMode && this.data.searchHasMore && !this.data.searchLoading) {
      this._fetchSearchResults(this.data.searchPage + 1)
    }
  },
  _partitionSearchList(list) {
    const s0 = [], s1 = [], s2 = [], sm1 = []
    for (const it of list || []) {
      const status = it.nxDgGoodsLsStatus
      if (status === 0) s0.push(it)
      else if (status === 1) s1.push(it)
      else if (status === 2) s2.push(it)
      else if (status === -1) sm1.push(it)
    }
    return { s0, s1, s2, sm1 }
  },
  _fetchSearchResults(page) {
    if (this.data.searchLoading) return
    if (!this.data.searchHasMore && page > 1) return
    const kw = (this.data.searchKeyword || '').trim()
    if (!kw) return
    this.setData({ searchLoading: true })
    if (page === 1) load.showLoading('搜索中')
    searchLinshiGoods({
      disId: this.data.disId,
      searchGoodsName: kw,
      page,
      limit: this.data.searchLimit,
    }).then(res => {
      if (page === 1) load.hideLoading()
      this.setData({ searchLoading: false })
      if (res.result.code == 0) {
        const pageData = res.result.page || {}
        const list = pageData.list || []
        const totalPage = pageData.totalPage || 1
        const currPage = pageData.currPage || page
        const { s0, s1, s2, sm1 } = this._partitionSearchList(list)
        const prev = page === 1 ? { s0: [], s1: [], s2: [], sm1: [] } : {
          s0: this.data.searchList0,
          s1: this.data.searchList1,
          s2: this.data.searchList2,
          sm1: this.data.searchListMinus1,
        }
        this.setData({
          searchList0: [...prev.s0, ...s0],
          searchList1: [...prev.s1, ...s1],
          searchList2: [...prev.s2, ...s2],
          searchListMinus1: [...prev.sm1, ...sm1],
          searchPage: currPage,
          searchTotalPage: totalPage,
          searchHasMore: currPage < totalPage,
        })
      }
    }).catch(() => {
      if (page === 1) load.hideLoading()
      this.setData({ searchLoading: false })
    })
  },
})
