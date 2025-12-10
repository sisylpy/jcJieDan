
import { 
  saveOneCustomer, 
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
    nxDepartmentEntities: []
  },


  

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = getApp().globalData;
  
    this.setData({
     
      second_height: globalData.windowHeight - globalData.windowWidth / 750 * 120 - (globalData.windowWidth / 750) * 94,
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      disId: options.disId,
      
    })

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




  //群名称输入
  bindKeyInput: function (e) {
    
    if(e.detail.value.length > 0){
      this.setData({
        inputValue: e.detail.value,
        inputed: true,
      })
      this._ifCanSave();
    }else{
      this.setData({
        inputValue: "" ,
        inputed: false ,
        canSave: false, 
      })
    }
   
  },

  _ifCanSave(){
     if(this.data.hasSubs > 0){
      if(this.data.addFinished && this.data.inputValue.length > 0){
        this.setData({
          canSave: true,
        })
      }
     }else{
       if(this.data.inputValue.length > 0){
        this.setData({
          canSave: true,
        })
       }

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
    nxDdDistributerId:this.data.disId,
    nxDepartmentEntity: {
      nxDepartmentFatherId: 0,
      nxDepartmentName: this.data.inputValue,
      nxDepartmentAttrName: this.data.inputValue,
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