import { getPurchaseFundingSources,classifyPurchaseFunding,getPurchaseFundingAllocations,confirmPurchaseFundingAllocation,recordPurchaseFinancePayment } from '../../../../../lib/apiDistributer.js'
const app=getApp(),types=['PURCHASER_ADVANCE','SUPPLIER_CREDIT','COMPANY_DIRECT','INTERNAL_TRANSFER'],names=['采购员垫付','供应商账期','公司直付','内部调拨'],methods=['WECHAT','BANK_TRANSFER','CASH','OTHER'],methodNames=['微信','银行转账','现金','其他']
Page({
  data:{navBarHeight:0,list:[],pendingDeclarations:[],directAllocations:[],selected:null,directSelected:null,amount:'',paymentAmount:'',typeIndex:0,methodIndex:1,types,names,methodNames,loading:false},
  onLoad(){this.setData({navBarHeight:app.globalData.navBarHeight*app.globalData.rpxR});this.load()},
  toBack(){wx.navigateBack()},
  load(){this.setData({loading:true});Promise.all([getPurchaseFundingSources({pageSize:100,onlyAvailable:true}),getPurchaseFundingAllocations({pageSize:100})]).then(rs=>{rs.forEach(r=>{const b=r.result||{};if(b.code!==0)throw new Error(b.msg)});const allocations=rs[1].result.data||[],direct=allocations.filter(x=>x.status==='ACTIVE'&&x.fundingType==='COMPANY_DIRECT'&&Number(x.directRemainingAmount||0)>0);this.setData({list:rs[0].result.data||[],pendingDeclarations:allocations.filter(x=>x.status==='PENDING_CONFIRMATION'),directAllocations:direct})}).catch(e=>wx.showToast({title:e.message||'加载失败',icon:'none'})).then(()=>this.setData({loading:false}))},
  select(e){const item=this.data.list[e.currentTarget.dataset.index];this.setData({selected:item,amount:String(item.availableAmount||'')})},
  amount(e){this.setData({amount:e.detail.value})},
  type(e){this.setData({typeIndex:Number(e.detail.value)})},
  selectDirect(e){const item=this.data.directAllocations[e.currentTarget.dataset.index];this.setData({directSelected:item,paymentAmount:String(item.directRemainingAmount||'')})},
  paymentAmount(e){this.setData({paymentAmount:e.detail.value})},
  paymentMethod(e){this.setData({methodIndex:Number(e.detail.value)})},
  submit(){const s=this.data.selected;if(!s)return;const data={purchaseGoodsId:s.purchaseGoodsId,purchaserUserId:s.purchaserUserId,supplierRelationId:s.supplierRelationId,fundingType:types[this.data.typeIndex],amount:this.data.amount};classifyPurchaseFunding(data,'boss-funding-'+Date.now()).then(r=>{const b=r.result||{};if(b.code!==0)throw new Error(b.msg);wx.showToast({title:'归类成功'});this.setData({selected:null,amount:''});this.load()}).catch(e=>wx.showToast({title:e.message||'归类失败',icon:'none'}))},
  confirmDeclaration(e){confirmPurchaseFundingAllocation(e.currentTarget.dataset.id,{confirmationStatus:e.currentTarget.dataset.state,reason:e.currentTarget.dataset.state==='CONFIRMED'?'老板确认采购员垫付':'老板驳回垫付申报'}).then(r=>{if((r.result||{}).code!==0)throw new Error(r.result.msg);this.load()}).catch(err=>wx.showToast({title:err.message||'处理失败',icon:'none'}))},
  payDirect(){const item=this.data.directSelected;if(!item)return;recordPurchaseFinancePayment('COMPANY_DIRECT_PURCHASE',item.allocationId,{amount:this.data.paymentAmount,paymentMethod:methods[this.data.methodIndex],reason:'公司直接支付采购款'},'boss-direct-pay-'+Date.now()).then(r=>{if((r.result||{}).code!==0)throw new Error(r.result.msg);wx.showToast({title:'付款已记录'});this.setData({directSelected:null,paymentAmount:''});this.load()}).catch(e=>wx.showToast({title:e.message||'付款失败',icon:'none'}))}
})
