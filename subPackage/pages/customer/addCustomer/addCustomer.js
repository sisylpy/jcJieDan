
import { 
  saveOneCustomer, 
  getDisUsers,
} from '../../../../lib/apiDistributer'


Page({

  /**
   * 页面的初始数据
   */
  data: {
    second_height: 0,
    type: 1,
    canSave: false,
    hasSubs: 0,
    myInPutIndex: -1,
    nxDepartmentEntities: [],
    customerName: '',
    labelPrintName: '',
    orderName: '',
    salesUsers: [],
    clerkUsers: [],
    salesIndex: -1,
    clerkIndex: -1,
    salesUserId: null,
    clerkUserId: null,
  },


  

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = getApp().globalData;
    const owner = wx.getStorageSync('userInfo') || {};
  
    this.setData({
     
      second_height: globalData.windowHeight - globalData.windowWidth / 750 * 120 - (globalData.windowWidth / 750) * 94,
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      disId: options.disId,
      fallbackOwner: owner,
      
    })
    this._loadResponsibleUsers();
  },

  _loadResponsibleUsers() {
    getDisUsers(this.data.disId).then(res => {
      if (!res.result || res.result.code != 0) {
        wx.showToast({ title: (res.result && res.result.msg) || '员工列表加载失败', icon: 'none' });
        return;
      }
      var sales = res.result.data.sales || [];
      var clerks = res.result.data.clerks || [];
      var admins = res.result.data.admins || [];
      var cachedOwner = wx.getStorageSync('userInfo') || {};
      var fallbackOwner = admins.find(item =>
        item.nxDistributerUserId == cachedOwner.nxDistributerUserId) || admins[0] || cachedOwner;
      var update = { salesUsers: sales, clerkUsers: clerks, fallbackOwner: fallbackOwner };
      if (sales.length === 1) {
        update.salesIndex = 0;
        update.salesUserId = sales[0].nxDistributerUserId;
      }
      if (clerks.length === 1) {
        update.clerkIndex = 0;
        update.clerkUserId = clerks[0].nxDistributerUserId;
      }
      if (!update.clerkUserId && update.salesUserId) {
        var defaultClerkId = sales[update.salesIndex].nxDiuDefaultClerkUserId;
        var defaultClerkIndex = clerks.findIndex(item =>
          item.nxDistributerUserId == defaultClerkId);
        if (defaultClerkIndex >= 0) {
          update.clerkIndex = defaultClerkIndex;
          update.clerkUserId = clerks[defaultClerkIndex].nxDistributerUserId;
        }
      }
      this.setData(update);
      this._ifCanSave();
    }).catch(() => {
      wx.showToast({ title: '员工列表加载失败', icon: 'none' });
    });
  },

  onSalesChange(e) {
    var index = Number(e.detail.value);
    var user = this.data.salesUsers[index];
    var update = { salesIndex: index, salesUserId: user && user.nxDistributerUserId };
    if (user && user.nxDiuDefaultClerkUserId) {
      var clerkIndex = this.data.clerkUsers.findIndex(item =>
        item.nxDistributerUserId == user.nxDiuDefaultClerkUserId);
      if (clerkIndex >= 0) {
        update.clerkIndex = clerkIndex;
        update.clerkUserId = this.data.clerkUsers[clerkIndex].nxDistributerUserId;
      }
    }
    this.setData(update);
    this._ifCanSave();
  },

  onClerkChange(e) {
    var index = Number(e.detail.value);
    var user = this.data.clerkUsers[index];
    this.setData({ clerkIndex: index, clerkUserId: user && user.nxDistributerUserId });
    this._ifCanSave();
  },

   
  showNumber(e){
    console.log(e)
    this.setData({
      showNumber: true
    })
  },

  selIndex(e){
    console.log(e)
    var num = Number(e.currentTarget.dataset.index) + 2;
    var deps = [];
    for(var i = 0; i < num; i++) {
         var dep = {
          nxDepartmentFatherId: this.data.depId,
           nxDepartmentName: null,
           nxDepartmentType: "unFixed",
           nxDepartmentPrintName: "ApplyHalfPanel",
           nxDepartmentHasSubs: 0,
           nxDepartmentShowWeeks: 1,
           nxDepartmentSubAmount: 0,
           nxDepartmentIsGroupDep: 0,
           nxDepartmentDisId: this.data.disId
          };
          deps.push(dep);
    }
    
    this.setData({
      selNumber: num,
      showNumber: false,
      canSave: false,
      nxDepartmentEntities: deps
    })

    this._ifAddSubDepFinished();

  },
  getDepartmentName(e){
    var name = e.detail.value;
    var index = e.currentTarget.dataset.index;
    console.log(name);
    // var dep = this.data.nxDepartmentEntities[index];
    var depNameData = "nxDepartmentEntities["+index+"].nxDepartmentName"
    this.setData({
      myInPutIndex:index,
      [depNameData]: name,
    })
    // wx.setStorageSync('deps', this.data.departments);

    this._ifAddSubDepFinished();


  },

  _ifAddSubDepFinished(){
     var num  = this.data.nxDepartmentEntities.length;
     for (var i = 0; i < num; i++) {
       var name =  this.data.nxDepartmentEntities[i].nxDepartmentName;
       if(name == null || name.length == 0){
         this.setData({
          addFinished: false
         })
          return;
       }else{
         this.setData({
           addFinished: true,
         })
       }
     }
     this._ifCanSave(); 

   },



   
   radioChangeType: function (e) {
    console.log(e);
    
    this.setData({
      type: e.detail.value,
    }) 
   

  },


  radioChange: function (e) {
   console.log(e);
   this.setData({
    hasSubs: e.detail.value,
    myInPutIndex: -1,
   }) 
   if(e.detail.value == 0){
    this.setData({
      hasSubs: 0,
     selNumber: 0,
     addFinished:true,
     nxDepartmentEntities: []
    })

  }else{
    var deps = [];
   for(var i = 0; i < 2; i++) {
        var dep = {
        index: i,
         nxDepartmentFatherId: this.data.depId,
          nxDepartmentName: null,
          nxDepartmentType: "unFixed",
          nxDepartmentPrintName: "ApplyHalfPanel",
          nxDepartmentHasSubs: 0,
          nxDepartmentShowWeeks: 1,
          nxDepartmentSubAmount: 0,
          nxDepartmentIsGroupDep: 0,
          nxDepartmentDisId: this.data.disId
         };
         deps.push(dep);
   }
    this.setData({
      hasSubs: e.detail.value,
      selNumber: 2,
      addFinished: false,
     nxDepartmentEntities: deps
     }) 
  }
  this._ifCanSave();

 },




  // 名称输入（客户名称/标签打印名称/订货名称）
  bindKeyInput: function (e) {
    var type = e.currentTarget.dataset.type;
    var value = e.detail.value;
    var key = type == 0 ? 'customerName' : (type == 1 ? 'labelPrintName' : 'orderName');
    var update = { [key]: value };
    if (type == 0) {
      update.inputValue = value;
      update.inputed = value.length > 0;
      // 输入客户名称时，默认将标签打印名称和订货名称赋为相同值
      update.labelPrintName = value;
      update.orderName = value;
    }
    this.setData(update);
    this._ifCanSave();
  },

  _ifCanSave(){
    var hasName = (this.data.customerName || this.data.inputValue || '').length > 0;
    if(this.data.hasSubs > 0){
      if(this.data.addFinished && hasName){
        this.setData({ canSave: true });
      } else {
        this.setData({ canSave: false });
      }
    } else {
      this.setData({ canSave: hasName });
    }
  },

toSave(e){
  if(this.data.canSave){

    var value = wx.getStorageSync('deps');

  if(value){
    this.setData({
      nxDepartmentEntities: value,
    })
  }
  var dep = {  
    nxDdDistributerId: this.data.disId,
    salesUserId: this.data.salesUserId,
    clerkUserId: this.data.clerkUserId,
    nxDepartmentEntity: {
      nxDepartmentFatherId: 0,
      nxDepartmentName: this.data.customerName || this.data.inputValue,
      nxDepartmentAttrName: this.data.labelPrintName || this.data.customerName || this.data.inputValue,
      nxDepartmentOrderCode: (this.data.orderName !== undefined && this.data.orderName !== null) ? String(this.data.orderName) : '',
      nxDepartmentType: "unFixed",
       nxDepartmentPrintName: "ApplyHalfPanel",
      nxDepartmentSettleType: this.data.type,
      nxDepartmentDisId: this.data.disId,
      nxDepartmentIsGroupDep: 1,
      nxDepartmentShowWeeks: 1,
      nxDepartmentSubAmount: this.data.nxDepartmentEntities.length,
      nxSubDepartments:this.data.nxDepartmentEntities,
    }
   
    
  }
  console.log(dep);

  saveOneCustomer(dep).then(res => {
    if(res.result.code == 0) {
      console.log(res) 
        wx.navigateBack({
          delta: 1
        })  
    }
  })

  }else{
    wx.showToast({
      title: '请输入必填项',
      icon: 'none'
    })
  }

  
},
  

toBack(){
  wx.navigateBack({
    delta: 1,
  })
}




  
})
