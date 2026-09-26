import apiUrl from '../../../../config.js'
import * as echarts from '../../../ec-canvas/echarts'
var load = require('../../../../lib/load.js')

import {
  disGetDepGoodsHistoryPrice,
  getDepartmentGoodsCurrentStandard
} from '../../../../lib/apiDistributer'

Page({
  data: {
    navBarHeight: 0,
    windowHeight: 0,
    url: apiUrl.server,
    departmentDisGoodsId: null,
    depFatherId: null,
    goodsId: null,
    distributerId: null,
    operatorUserId: null,
    customerName: '',
    customerGoodsName: '',
    productInitial: '商',
    customerStandard: '',
    disGoods: {},
    productImageUrl: '',
    startDate: '',
    stopDate: '',
    dateType: 'month',
    dateName: 'thisMonth',
    dateLabel: '本月',
    ecPrice: {
      lazyLoad: true
    },
    loading: true,
    allRecords: [],
    filteredRecords: [],
    validPriceCount: 0,
    summary: {
      currentPrice: '—',
      currentDate: '—',
      averagePrice: '—',
      highestPrice: '—',
      highestDate: '—',
      lowestPrice: '—',
      lowestDate: '—',
      priceUnit: ''
    },
    trend: {
      text: '暂无足够价格记录',
      tone: 'stable'
    },
    requirementLoading: false,
    requirementLoadFailed: false,
    requirementItems: [],
    requirementSummary: '暂无客户要求',
    requirementCount: 0,
    standardImageCount: 0,
    hasCustomerStandard: false
  },

  onLoad(options) {
    const app = getApp()
    const globalData = app.globalData || {}
    const disGoods = wx.getStorageSync('disGoods') || {}
    const userInfo = wx.getStorageSync('userInfo') || {}
    const distributerEntity = userInfo.nxDistributerEntity || {}
    const departmentDisGoodsId = Number(options.departmentDisGoodsId || options.depDisGoodsId || 0) || null
    const today = new Date()

    this.setData({
      navBarHeight: (globalData.navBarHeight || 0) * (globalData.rpxR || 1),
      windowHeight: (globalData.windowHeight || 0) * (globalData.rpxR || 1),
      departmentDisGoodsId,
      depFatherId: options.depFatherId,
      goodsId: options.goodsId,
      distributerId: distributerEntity.nxDistributerId || null,
      operatorUserId: userInfo.nxDistributerUserId || null,
      customerName: decodeURIComponent(options.customerName || ''),
      customerGoodsName: decodeURIComponent(options.customerGoodsName || '') || disGoods.nxDgGoodsName || '',
      productInitial: (decodeURIComponent(options.customerGoodsName || '') || disGoods.nxDgGoodsName || '商').slice(0, 1),
      customerStandard: decodeURIComponent(options.customerStandard || ''),
      disGoods,
      productImageUrl: this._goodsImageUrl(disGoods),
      startDate: this._dateKey(new Date(today.getFullYear(), today.getMonth(), 1)),
      stopDate: this._dateKey(today)
    })

    this._loadHistory()
    this._skipNextRequirementRefresh = true
    this._loadCustomerStandard()
  },

  onShow() {
    if (this._skipNextRequirementRefresh) {
      this._skipNextRequirementRefresh = false
      return
    }
    this._loadCustomerStandard()
  },

  onUnload() {
    if (this.priceChart) {
      this.priceChart.dispose()
      this.priceChart = null
    }
  },

  _standardScopeData() {
    return {
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId
    }
  },

  _loadCustomerStandard() {
    if (!this.data.departmentDisGoodsId || !this.data.distributerId || !this.data.operatorUserId) {
      return Promise.resolve()
    }

    this.setData({
      requirementLoading: true,
      requirementLoadFailed: false
    })

    return getDepartmentGoodsCurrentStandard(
      this.data.departmentDisGoodsId,
      this._standardScopeData()
    ).then((res) => {
      const result = res && res.result ? res.result : {}
      if (result.code !== 0) {
        throw new Error(result.msg || '客户要求读取失败')
      }

      const current = result.data || {}
      const rawItems = Array.isArray(current.items) ? current.items : []
      const rawImages = Array.isArray(current.images) ? current.images : []
      const requirementItems = rawItems
        .map((item) => ({
          text: this._text(item.nxDdgsiRequirementText),
          importance: Number(item.nxDdgsiImportanceLevel || 0),
          sort: Number(item.nxDdgsiSort || 0)
        }))
        .filter((item) => item.text)
        .sort((a, b) => b.importance - a.importance || a.sort - b.sort)
      const visibleRequirements = requirementItems.slice(0, 3).map((item) => item.text)
      const remainingCount = requirementItems.length - visibleRequirements.length
      const requirementSummary = visibleRequirements.length
        ? visibleRequirements.join('；') + (remainingCount > 0 ? '；另有' + remainingCount + '项' : '')
        : '暂无客户要求'

      this.setData({
        requirementLoading: false,
        requirementLoadFailed: false,
        requirementItems,
        requirementSummary,
        requirementCount: requirementItems.length,
        standardImageCount: rawImages.length,
        hasCustomerStandard: requirementItems.length > 0 || rawImages.length > 0
      })
    }).catch(() => {
      this.setData({
        requirementLoading: false,
        requirementLoadFailed: true,
        requirementSummary: '客户要求暂时无法读取'
      })
    })
  },

  toCustomerGoodsStandard() {
    if (!this.data.departmentDisGoodsId) return
    const query = [
      'departmentDisGoodsId=' + this.data.departmentDisGoodsId,
      'goodsName=' + encodeURIComponent(this.data.disGoods.nxDgGoodsName || this.data.customerGoodsName || ''),
      'customerGoodsName=' + encodeURIComponent(this.data.customerGoodsName || ''),
      'departmentName=' + encodeURIComponent(this.data.customerName || '')
    ]
    wx.navigateTo({
      url: '/subPackage/pages/customer/customerGoodsStandard/customerGoodsStandard?' + query.join('&')
    })
  },

  toAddRequirement() {
    if (!this.data.departmentDisGoodsId) return
    const query = [
      'departmentDisGoodsId=' + this.data.departmentDisGoodsId,
      'mode=item',
      'goodsName=' + encodeURIComponent(this.data.disGoods.nxDgGoodsName || this.data.customerGoodsName || ''),
      'customerGoodsName=' + encodeURIComponent(this.data.customerGoodsName || ''),
      'departmentName=' + encodeURIComponent(this.data.customerName || '')
    ]
    wx.navigateTo({
      url: '/subPackage/pages/customer/customerGoodsStandardEdit/customerGoodsStandardEdit?' + query.join('&')
    })
  },

  _loadHistory() {
    if (!this.data.depFatherId || !this.data.goodsId) {
      this.setData({ loading: false })
      return
    }

    load.showLoading('获取数据')
    disGetDepGoodsHistoryPrice({
      depFatherId: this.data.depFatherId,
      goodsId: this.data.goodsId
    })
      .then(res => {
        const result = res && res.result ? res.result : {}
        if (result.code !== 0) {
          wx.showToast({
            title: result.msg || '读取失败',
            icon: 'none'
          })
          this.setData({ loading: false })
          return
        }

        const normalizedRecords = this._normalizeRecords(result.data || [])
        const primaryPriceUnit = normalizedRecords.length ? normalizedRecords[0].priceUnit : ''
        const allRecords = normalizedRecords.filter(item => item.priceUnit === primaryPriceUnit)
        this.setData({
          loading: false,
          allRecords,
          validPriceCount: allRecords.length
        }, () => {
          this._applyRange()
        })
      })
      .catch(() => {
        wx.showToast({
          title: '读取失败，请稍后重试',
          icon: 'none'
        })
        this.setData({ loading: false })
      })
      .finally(() => load.hideLoading())
  },

  toDatePage() {
    wx.navigateTo({ url: '/subPackage-charts/pages/sel/date/date?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType + '&dateName=' + this.data.dateName })
  },

  onReportDateSelected(selection) {
    this.setData({ startDate: selection.startDate, stopDate: selection.stopDate, dateType: selection.dateType, dateName: selection.dateName, dateLabel: selection.hanzi || '自定义' }, () => this._applyRange())
  },

  _applyRange() {
    const allRecords = this.data.allRecords || []
    const filteredRecords = this._recordsWithinRange(allRecords, this.data.startDate, this.data.stopDate)
    const summary = this._buildSummary(allRecords, filteredRecords)
    const dailyPoints = this._dailyPricePoints(filteredRecords)
    const trend = this._buildTrend(dailyPoints, this.data.dateLabel)

    this.setData({
      filteredRecords,
      summary,
      trend
    }, () => {
      this._renderChart(dailyPoints, summary)
    })
  },

  _normalizeRecords(records) {
    return records
      .map((item, index) => {
        const price = this._positiveNumber(item.nxDoPrice)
        const date = this._parseDate(item.orderDate)
        if (price === null || !date) return null

        const priceUnit = this._text(item.printStandard) || this._text(item.nxDoStandard)
        return {
          id: [item.orderDate, item.departName, index].join('-'),
          orderDate: this._dateKey(date),
          orderDateText: this._formatDate(date),
          timestamp: date.getTime(),
          price,
          priceText: this._money(price),
          priceUnit,
          demandText: this._quantityText(item.nxDoQuantity, item.nxDoStandard),
          fulfillmentText: this._quantityText(item.nxDoWeight, item.printStandard),
          remark: this._text(item.nxDoRemark),
          orderCode: this._text(item.departName),
          orderUserName: this._text(item.orderUserName)
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp)
  },

  _buildSummary(allRecords, periodRecords) {
    if (!allRecords.length) {
      return {
        currentPrice: '—',
        currentDate: '—',
        averagePrice: '—',
        highestPrice: '—',
        highestDate: '—',
        lowestPrice: '—',
        lowestDate: '—',
        priceUnit: ''
      }
    }

    const latest = allRecords[0]
    if (!periodRecords.length) {
      return {
        currentPrice: this._money(latest.price),
        currentDate: latest.orderDateText,
        averagePrice: '—',
        highestPrice: '—',
        highestDate: '—',
        lowestPrice: '—',
        lowestDate: '—',
        priceUnit: latest.priceUnit
      }
    }

    const total = periodRecords.reduce((sum, item) => sum + item.price, 0)
    const highest = periodRecords.reduce((result, item) => item.price > result.price ? item : result, periodRecords[0])
    const lowest = periodRecords.reduce((result, item) => item.price < result.price ? item : result, periodRecords[0])

    return {
      currentPrice: this._money(latest.price),
      currentDate: latest.orderDateText,
      averagePrice: this._money(total / periodRecords.length),
      highestPrice: this._money(highest.price),
      highestDate: highest.orderDateText,
      lowestPrice: this._money(lowest.price),
      lowestDate: lowest.orderDateText,
      priceUnit: latest.priceUnit
    }
  },

  _dailyPricePoints(records) {
    const grouped = {}
    records.forEach(item => {
      if (!grouped[item.orderDate]) grouped[item.orderDate] = []
      grouped[item.orderDate].push(item.price)
    })

    return Object.keys(grouped)
      .sort()
      .map(date => {
        const prices = grouped[date]
        return {
          date,
          label: this._shortDate(date),
          price: Number((prices.reduce((sum, price) => sum + price, 0) / prices.length).toFixed(2))
        }
      })
  },

  _buildTrend(points, label) {
    if (points.length < 2) {
      return {
        text: (label || '所选日期') + '价格记录较少，暂时无法判断趋势',
        tone: 'stable'
      }
    }

    const first = points[0].price
    const last = points[points.length - 1].price
    const change = first === 0 ? 0 : ((last - first) / first) * 100
    const absoluteChange = Math.abs(change)

    if (absoluteChange < 2) {
      return {
        text: (label || '所选日期') + '整体稳定，当前价格与期初接近',
        tone: 'stable'
      }
    }

    if (change > 0) {
      return {
        text: (label || '所选日期') + '价格有所上涨，较期初约高' + absoluteChange.toFixed(1) + '%',
        tone: 'up'
      }
    }

    return {
      text: (label || '所选日期') + '价格有所下降，较期初约低' + absoluteChange.toFixed(1) + '%',
      tone: 'down'
    }
  },

  _renderChart(points, summary) {
    const component = this.selectComponent('#priceChart')
    if (!component) return

    if (this.priceChart) {
      this.priceChart.setOption(this._chartOption(points, summary), true)
      return
    }

    component.init((canvas, width, height, canvasDpr) => {
      const chart = echarts.init(canvas, null, {
        width,
        height,
        devicePixelRatio: canvasDpr || 1
      })
      chart.setOption(this._chartOption(points, summary))
      this.priceChart = chart
      return chart
    })
  },

  _chartOption(points, summary) {
    const values = points.map(item => item.price)
    const average = values.length
      ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
      : null

    return {
      animation: false,
      grid: {
        left: 12,
        right: 12,
        top: 18,
        bottom: 22,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: points.map(item => item.label),
        axisLine: {
          lineStyle: { color: '#d9dfdc' }
        },
        axisTick: { show: false },
        axisLabel: {
          color: '#7e8983',
          fontSize: 10,
          interval: points.length > 14 ? Math.ceil(points.length / 5) - 1 : 'auto'
        }
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitNumber: 4,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#7e8983',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: '#eef1ef',
            type: 'dashed'
          }
        }
      },
      series: [{
        type: 'line',
        data: values,
        smooth: 0.25,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: {
          color: '#169b59',
          width: 2
        },
        itemStyle: {
          color: '#ffffff',
          borderColor: '#169b59',
          borderWidth: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: 'rgba(22, 155, 89, 0.16)'
            }, {
              offset: 1,
              color: 'rgba(22, 155, 89, 0.01)'
            }]
          }
        },
        markLine: average === null ? undefined : {
          silent: true,
          symbol: 'none',
          label: {
            show: true,
            position: 'insideEndTop',
            formatter: '均价 ¥' + this._money(average),
            color: '#168f55',
            fontSize: 10
          },
          lineStyle: {
            color: '#59b987',
            type: 'dashed',
            width: 1
          },
          data: [{ yAxis: average }]
        }
      }],
      graphic: points.length ? [] : [{
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: '所选时间内暂无价格记录',
          fill: '#929b96',
          fontSize: 12
        }
      }]
    }
  },

  _recordsWithinRange(records, startDate, stopDate) {
    if (!records.length) return []
    const start = this._parseDate(startDate)
    const stop = this._parseDate(stopDate)
    if (!start || !stop) return []
    const end = new Date(stop.getFullYear(), stop.getMonth(), stop.getDate(), 23, 59, 59, 999)
    return records.filter(item => item.timestamp >= start.getTime() && item.timestamp <= end.getTime())
  },

  _goodsImageUrl(goods) {
    const path = this._text(goods.nxDgGoodsFileLarge) || this._text(goods.nxDgGoodsFile)
    if (!path) return ''
    if (/^https?:\/\//.test(path)) return path
    return apiUrl.server + path
  },

  _quantityText(quantity, standard) {
    const quantityText = this._text(quantity)
    if (!quantityText) return '—'
    return quantityText + this._text(standard)
  },

  _positiveNumber(value) {
    const number = Number(value)
    return Number.isFinite(number) && number > 0 ? number : null
  },

  _money(value) {
    const number = Number(value)
    if (!Number.isFinite(number)) return '—'
    return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  },

  _parseDate(value) {
    if (!value) return null
    const normalized = String(value).replace(/\./g, '-').replace(/\//g, '-').slice(0, 10)
    const parts = normalized.split('-').map(Number)
    if (parts.length !== 3 || parts.some(part => Number.isNaN(part))) return null
    const date = new Date(parts[0], parts[1] - 1, parts[2])
    return Number.isNaN(date.getTime()) ? null : date
  },

  _dateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-')
  },

  _formatDate(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0')
  },

  _shortDate(dateKey) {
    const parts = dateKey.split('-')
    return parts.length === 3 ? parts[1] + '-' + parts[2] : dateKey
  },

  _text(value) {
    return value === null || value === undefined ? '' : String(value).trim()
  },

  toBack(){
    wx.navigateBack({delta: 1})
  }
})
