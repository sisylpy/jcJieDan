import { getPurchaseManagementOverview } from '../../../../../lib/apiDistributer.js'
const app=getApp()
Page({
  data:{navBarHeight:0,range:'TODAY',startDate:'',stopDate:'',loading:false,error:'',period:{},tasks:{},structures:{}},
  onLoad(){this.setData({navBarHeight:app.globalData.navBarHeight*app.globalData.rpxR})},
  onShow(){this.load()},
  onPullDownRefresh(){this.load(true)},toBack(){wx.navigateBack({delta:1})},
  chooseRange(e){const range=e.currentTarget.dataset.range;this.setData({range,startDate:'',stopDate:''});this.load()},
  changeStart(e){this.setData({range:'CUSTOM',startDate:e.detail.value});this.tryCustom()},
  changeStop(e){this.setData({range:'CUSTOM',stopDate:e.detail.value});this.tryCustom()},
  tryCustom(){if(this.data.startDate&&this.data.stopDate)this.load()},
  load(refresh){this.setData({loading:true,error:''});const q=this.data.range==='CUSTOM'?{startDate:this.data.startDate,stopDate:this.data.stopDate}:{range:this.data.range};getPurchaseManagementOverview(q).then(res=>{const body=res.result||{};if(body.code!==0)throw new Error(body.msg||'加载失败');const d=body.data||{};this.setData({period:d.period||{},tasks:d.currentTasks||{},structures:d.structures||{},startDate:d.startDate||'',stopDate:d.stopDate||''})}).catch(e=>this.setData({error:e.message||'加载失败'})).then(()=>{this.setData({loading:false});if(refresh)wx.stopPullDownRefresh()})},
  open(e){wx.navigateTo({url:e.currentTarget.dataset.url+'?startDate='+this.data.startDate+'&stopDate='+this.data.stopDate})},
  openInternalCollaboration(){
    const userInfo=wx.getStorageSync('userInfo')||{}
    const disId=Number(userInfo.nxDiuDistributerId)
    if(!disId)return wx.showToast({title:'配送商身份无效',icon:'none'})
    wx.navigateTo({url:'/subPackage/pages/offerNx/offerNxDistributerList/offerNxDistributerList?disId='+disId})
  }
})
