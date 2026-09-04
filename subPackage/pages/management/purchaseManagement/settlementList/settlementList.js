import { getPurchaseFundingAllocations,getSupplierSettlements,createSupplierSettlement,submitSupplierSettlement,reviewSupplierSettlement,recordPurchaseFinancePayment } from '../../../../../lib/apiDistributer.js'
const app=getApp()
Page({
  data:{navBarHeight:0,allocations:[],list:[],selected:[],payId:null,payAmount:''},
  onLoad(){this.setData({navBarHeight:app.globalData.navBarHeight*app.globalData.rpxR});this.load()},
  toBack(){wx.navigateBack()},
  load(){Promise.all([getPurchaseFundingAllocations({fundingType:'SUPPLIER_CREDIT',pageSize:100}),getSupplierSettlements({pageSize:100})]).then(rs=>this.setData({allocations:(rs[0].result.data||[]).filter(x=>x.status==='ACTIVE'&&!x.consumed).map(x=>Object.assign({},x,{checked:false})),list:rs[1].result.data||[]})).catch(e=>wx.showToast({title:e.message||'加载失败',icon:'none'}))},
  toggle(e){const id=Number(e.currentTarget.dataset.id),allocations=this.data.allocations.map(x=>Number(x.allocationId)===id?Object.assign({},x,{checked:!x.checked}):x);this.setData({allocations,selected:allocations.filter(x=>x.checked).map(x=>Number(x.allocationId))})},
  create(){if(!this.data.selected.length)return wx.showToast({title:'请选择账期明细',icon:'none'});const first=this.data.allocations.find(x=>x.checked);createSupplierSettlement({supplierRelationId:first.supplierRelationId,allocationIds:this.data.selected},'boss-sb-'+Date.now()).then(r=>{if(r.result.code!==0)throw new Error(r.result.msg);this.setData({selected:[]});this.load()}).catch(e=>wx.showToast({title:e.message||'创建失败',icon:'none'}))},
  submit(e){submitSupplierSettlement(e.currentTarget.dataset.id,{reason:'老板提交供应商结算审核'}).then(()=>this.load())},
  review(e){reviewSupplierSettlement(e.currentTarget.dataset.id,{reviewStatus:e.currentTarget.dataset.state,reason:'老板端审核'}).then(()=>this.load())},
  choosePay(e){this.setData({payId:e.currentTarget.dataset.id,payAmount:e.currentTarget.dataset.amount})},
  amount(e){this.setData({payAmount:e.detail.value})},
  pay(){recordPurchaseFinancePayment('SUPPLIER_SETTLEMENT',this.data.payId,{amount:this.data.payAmount,paymentMethod:'BANK_TRANSFER'},'boss-pay-sb-'+Date.now()).then(r=>{if(r.result.code!==0)throw new Error(r.result.msg);this.setData({payId:null});this.load()}).catch(e=>wx.showToast({title:e.message||'付款失败',icon:'none'}))}
})
