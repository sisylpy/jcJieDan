import Promise from './bluebird'
import apiUrl from '../config.js'

// Supplier-settlement-only query kept separate so the shared finance API can
// remain untouched while the purchaser-reimbursement worktree is in progress.
export const getSupplierSettlementPeople = data => new Promise((resolve, reject) => {
  getApp().ownerRequest({
    url: apiUrl.apiUrl + 'purchase-finance/settlement-suppliers',
    method: 'GET',
    data: data || {},
    header: { 'Content-Type': 'application/json' },
    success: res => resolve({ result: res.data }),
    fail: reject
  })
})
