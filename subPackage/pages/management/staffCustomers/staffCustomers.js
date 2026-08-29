import {
  disGetAllCustomer,
  getDisUsers,
  updateCustomerResponsibility
} from '../../../../lib/apiDistributer'

function decodeQueryValue(value) {
  try {
    return decodeURIComponent(value || '')
  } catch (e) {
    return value || ''
  }
}

function sameId(left, right) {
  if (left === null || left === undefined || left === '') {
    return right === null || right === undefined || right === ''
  }
  return String(left) === String(right)
}

Page({
  data: {
    loading: true,
    errorMessage: '',
    keyword: '',
    allCustomers: [],
    customers: [],
    salesOptions: [],
    clerkOptions: [],
    targetUserId: null,
    targetRole: null,
    targetRoleLabel: '员工',
    targetName: '',
    targetInitial: '员',
    savingCustomerId: null
  },

  onLoad(options) {
    const app = getApp()
    const globalData = app.globalData || {}
    const userInfo = wx.getStorageSync('userInfo') || {}
    const disInfo = userInfo.nxDistributerEntity || {}
    const targetRole = Number(options.role)
    const targetName = decodeQueryValue(options.name)

    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: Number(options.disId || disInfo.nxDistributerId),
      userInfo: userInfo,
      targetUserId: Number(options.userId),
      targetRole: targetRole,
      targetRoleLabel: targetRole === 3 ? '业务员' : '录单员',
      targetName: targetName,
      targetInitial: String(targetName || '员').slice(0, 1)
    })

    if (!this.data.disId || !this.data.targetUserId || (targetRole !== 1 && targetRole !== 3)) {
      this.setData({ loading: false, errorMessage: '员工信息无效，请返回后重试' })
      return
    }
    this._loadPage()
  },

  _loadPage() {
    this.setData({ loading: true, errorMessage: '' })
    return Promise.all([
      getDisUsers(this.data.disId),
      disGetAllCustomer(this.data.disId, null, this.data.targetUserId)
    ]).then(results => {
      const staffResult = results[0] && results[0].result || {}
      const customerResult = results[1] && results[1].result || {}
      if (staffResult.code != 0) {
        throw new Error(staffResult.msg || '员工列表加载失败')
      }
      if (customerResult.code != 0) {
        throw new Error(customerResult.msg || '客户列表加载失败')
      }

      const staffData = staffResult.data || {}
      const options = this._buildStaffOptions(staffData)
      const targetUsers = this.data.targetRole === 3
        ? (staffData.sales || [])
        : (staffData.clerks || [])
      const target = targetUsers.find(user => sameId(
        user.nxDistributerUserId,
        this.data.targetUserId
      ))
      const targetName = target
        ? (target.nxDiuWxNickName || target.nxDiuWxPhone || this.data.targetName)
        : this.data.targetName

      this.setData({
        salesOptions: options.salesOptions,
        clerkOptions: options.clerkOptions,
        targetName: targetName,
        targetInitial: String(targetName || '员').slice(0, 1)
      })
      this._applyCustomerResult(customerResult, options.salesOptions, options.clerkOptions)
      this.setData({ loading: false })
    }).catch(error => {
      this.setData({
        loading: false,
        errorMessage: error && error.message ? error.message : '页面加载失败，请重试'
      })
    })
  },

  _buildStaffOptions(data) {
    const admins = data.admins || []
    const sales = data.sales || []
    const clerks = data.clerks || []
    const currentUserId = this.data.userInfo && this.data.userInfo.nxDistributerUserId
    const owner = admins.find(user => sameId(user.nxDistributerUserId, currentUserId))
      || admins[0]
      || this.data.userInfo
      || {}
    const ownerOption = {
      id: owner.nxDistributerUserId || null,
      name: (owner.nxDiuWxNickName || '老板') + '（老板代管）'
    }
    return {
      salesOptions: [ownerOption].concat(sales.map(user => ({
        id: user.nxDistributerUserId,
        name: user.nxDiuWxNickName || user.nxDiuWxPhone || '未命名业务员'
      }))),
      clerkOptions: [ownerOption].concat(clerks.map(user => ({
        id: user.nxDistributerUserId,
        name: user.nxDiuWxNickName || user.nxDiuWxPhone || '未命名录单员'
      })))
    }
  },

  _optionIndex(options, userId) {
    const index = (options || []).findIndex(option => sameId(option.id, userId))
    return index < 0 ? 0 : index
  },

  _decorateCustomer(customer, salesOptions, clerkOptions) {
    const salesIndex = this._optionIndex(salesOptions, customer.nxDepartmentSalesUserId)
    const clerkIndex = this._optionIndex(clerkOptions, customer.nxDepartmentClerkUserId)
    const departments = customer.nxDepartmentEntities || customer.nxSubDepartments || []
    return Object.assign({}, customer, {
      avatarText: String(customer.nxDepartmentName || '客').slice(0, 1),
      departmentCount: departments.length,
      salesIndex: salesIndex,
      clerkIndex: clerkIndex,
      savedSalesIndex: salesIndex,
      savedClerkIndex: clerkIndex,
      assignmentDirty: false
    })
  },

  _applyCustomerResult(result, salesOptions, clerkOptions) {
    const data = result.data || {}
    const source = (data.settleTypeOne || []).concat(data.settleTypeTwo || [])
    const seen = {}
    const allCustomers = source.filter(customer => {
      const id = customer && customer.nxDepartmentId
      if (!id || seen[id]) return false
      seen[id] = true
      return true
    }).map(customer => this._decorateCustomer(customer, salesOptions, clerkOptions))
    this.setData({
      allCustomers: allCustomers,
      customers: this._filterCustomers(allCustomers, this.data.keyword, salesOptions, clerkOptions)
    })
  },

  _filterCustomers(customers, keyword, salesOptions, clerkOptions) {
    const value = String(keyword || '').trim().toLowerCase()
    if (!value) return customers || []
    return (customers || []).filter(customer => {
      const sales = salesOptions[customer.salesIndex] || {}
      const clerk = clerkOptions[customer.clerkIndex] || {}
      return [
        customer.nxDepartmentName,
        customer.nxDepartmentAttrName,
        customer.nxDepartmentAddress,
        customer.nxDepartmentOrderCode,
        sales.name,
        clerk.name
      ].some(text => String(text || '').toLowerCase().indexOf(value) >= 0)
    })
  },

  onKeywordInput(e) {
    const keyword = e.detail.value || ''
    this.setData({
      keyword: keyword,
      customers: this._filterCustomers(
        this.data.allCustomers,
        keyword,
        this.data.salesOptions,
        this.data.clerkOptions
      )
    })
  },

  clearSearch() {
    this.setData({ keyword: '', customers: this.data.allCustomers })
  },

  onSalesChange(e) {
    this._updateCustomerDraft(e.currentTarget.dataset.id, 'salesIndex', Number(e.detail.value))
  },

  onClerkChange(e) {
    this._updateCustomerDraft(e.currentTarget.dataset.id, 'clerkIndex', Number(e.detail.value))
  },

  _updateCustomerDraft(customerId, field, value) {
    const allCustomers = (this.data.allCustomers || []).map(customer => {
      if (!sameId(customer.nxDepartmentId, customerId)) return customer
      const update = {}
      update[field] = value
      const salesIndex = field === 'salesIndex' ? value : customer.salesIndex
      const clerkIndex = field === 'clerkIndex' ? value : customer.clerkIndex
      update.assignmentDirty = salesIndex !== customer.savedSalesIndex
        || clerkIndex !== customer.savedClerkIndex
      return Object.assign({}, customer, update)
    })
    this.setData({
      allCustomers: allCustomers,
      customers: this._filterCustomers(
        allCustomers,
        this.data.keyword,
        this.data.salesOptions,
        this.data.clerkOptions
      )
    })
  },

  saveCustomerAssignment(e) {
    if (this.data.savingCustomerId) return
    const customerId = e.currentTarget.dataset.id
    const customer = (this.data.allCustomers || []).find(item => sameId(
      item.nxDepartmentId,
      customerId
    ))
    if (!customer || !customer.assignmentDirty) return

    const salesOption = this.data.salesOptions[customer.salesIndex]
    const clerkOption = this.data.clerkOptions[customer.clerkIndex]
    if (!salesOption || !clerkOption) {
      wx.showToast({ title: '负责人选择无效', icon: 'none' })
      return
    }

    this.setData({ savingCustomerId: customer.nxDepartmentId })
    wx.showLoading({ title: '保存中', mask: true })
    updateCustomerResponsibility(customer.nxDepartmentId, {
      salesUserId: salesOption.id,
      clerkUserId: clerkOption.id,
      expectedVersion: Number(customer.nxDepartmentStaffVersion) || 0
    }).then(res => {
      const result = res && res.result || {}
      if (result.code != 0) {
        throw new Error(result.msg || '负责人修改失败')
      }
      this._applySavedAssignment(customer.nxDepartmentId, result.data || {})
      wx.hideLoading()
      this.setData({ savingCustomerId: null })
      wx.showToast({ title: '负责人已更新', icon: 'success' })
      return this._reloadCustomers().catch(function () {})
    }).catch(error => {
      wx.hideLoading()
      this.setData({ savingCustomerId: null })
      wx.showToast({
        title: error && error.message ? error.message : '负责人修改失败',
        icon: 'none'
      })
      return this._reloadCustomers().catch(function () {})
    })
  },

  _applySavedAssignment(customerId, saved) {
    const stillAssigned = this.data.targetRole === 3
      ? sameId(saved.nxDepartmentSalesUserId, this.data.targetUserId)
      : sameId(saved.nxDepartmentClerkUserId, this.data.targetUserId)
    const allCustomers = (this.data.allCustomers || []).reduce((list, customer) => {
      if (!sameId(customer.nxDepartmentId, customerId)) {
        list.push(customer)
        return list
      }
      if (!stillAssigned) return list
      const salesIndex = this._optionIndex(
        this.data.salesOptions,
        saved.nxDepartmentSalesUserId
      )
      const clerkIndex = this._optionIndex(
        this.data.clerkOptions,
        saved.nxDepartmentClerkUserId
      )
      list.push(Object.assign({}, customer, saved, {
        salesIndex: salesIndex,
        clerkIndex: clerkIndex,
        savedSalesIndex: salesIndex,
        savedClerkIndex: clerkIndex,
        assignmentDirty: false
      }))
      return list
    }, [])
    this.setData({
      allCustomers: allCustomers,
      customers: this._filterCustomers(
        allCustomers,
        this.data.keyword,
        this.data.salesOptions,
        this.data.clerkOptions
      )
    })
  },

  _reloadCustomers() {
    return disGetAllCustomer(this.data.disId, null, this.data.targetUserId).then(res => {
      const result = res && res.result || {}
      if (result.code != 0) {
        throw new Error(result.msg || '客户列表刷新失败')
      }
      this._applyCustomerResult(result, this.data.salesOptions, this.data.clerkOptions)
    })
  },

  retryLoad() {
    this._loadPage()
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  }
})
