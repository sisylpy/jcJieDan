import { getPurchaseManagementPurchasers } from '../../../../../lib/apiDistributer.js'
const app=getApp()
Page({
 data:{navBarHeight:0,startDate:'',stopDate:'',sort:'LAST_PURCHASE',items:[],page:1,pageSize:20,total:0,loading:false,error:''},
 onLoad(o){this.setData({navBarHeight:app.globalData.navBarHeight*app.globalData.rpxR,startDate:o.startDate||'',stopDate:o.stopDate||''});this.load(true)},toBack(){wx.navigateBack({delta:1})},
 sort(e){this.setData({sort:e.currentTarget.dataset.value});this.load(true)},load(reset){if(this.data.loading)return;const page=reset?1:this.data.page;this.setData({loading:true,error:''});getPurchaseManagementPurchasers({startDate:this.data.startDate,stopDate:this.data.stopDate,sort:this.data.sort,page,pageSize:this.data.pageSize}).then(res=>{const b=res.result||{};if(b.code!==0)throw new Error(b.msg||'加载失败');const d=b.data||{};this.setData({items:reset?(d.items||[]):this.data.items.concat(d.items||[]),page,total:d.total||0})}).catch(e=>this.setData({error:e.message||'加载失败'})).then(()=>this.setData({loading:false}))},
 more(){if(this.data.items.length<this.data.total){this.setData({page:this.data.page+1});this.load(false)}},open(e){wx.navigateTo({url:'/subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail?purchaserId='+e.currentTarget.dataset.id+'&startDate='+this.data.startDate+'&stopDate='+this.data.stopDate})}
})
