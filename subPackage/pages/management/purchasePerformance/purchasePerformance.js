import { getInventoryPurchasePerformance } from '../../../../lib/apiDistributer.js'
const app = getApp()
Page({
  data: { navBarHeight: 0, startDate: '', stopDate: '', dimension: 'PURCHASER', groups: [], loading: false, excludedCount: 0 },
  onLoad() { const end=new Date(), start=new Date(); start.setDate(end.getDate()-30); this.setData({navBarHeight:app.globalData.navBarHeight*app.globalData.rpxR,startDate:fmt(start),stopDate:fmt(end)}); this.load() },
  toBack(){wx.navigateBack({delta:1})},
  changeDimension(e){this.setData({dimension:e.currentTarget.dataset.value});this.load()},
  changeStart(e){this.setData({startDate:e.detail.value});this.load()}, changeStop(e){this.setData({stopDate:e.detail.value});this.load()},
  load(){this.setData({loading:true});getInventoryPurchasePerformance({startDate:this.data.startDate,stopDate:this.data.stopDate,dimension:this.data.dimension}).then(res=>{if(res.result&&res.result.code===0){const data=res.result.data||{};this.setData({groups:data.groups||[],excludedCount:data.excludedNonWarehouseOrUnresolvedCount||0})}else throw new Error((res.result&&res.result.msg)||'加载失败')}).catch(e=>wx.showToast({title:e.message||'加载失败',icon:'none'})).then(()=>this.setData({loading:false}))},
  openBatch(e){wx.navigateTo({url:'/subPackage/pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness?stockBatchId='+e.currentTarget.dataset.id})}
})
function fmt(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
