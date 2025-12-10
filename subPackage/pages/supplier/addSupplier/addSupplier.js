import {
  saveJrdhSupplier,
  updateJrdhSupplier
} from '../../../../lib/apiDistributer'
Page({
  /**
   * 页面的初始数据
   */
  data: {
    addFinished: false,
    supplierName:"",
    editName: "",
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = getApp().globalData;
    this.setData({
     windowWidth: globalData.windowWidth * globalData.rpxR,
        windowHeight: globalData.windowHeight * globalData.rpxR,
        navBarHeight: globalData.navBarHeight  * globalData.rpxR,
        disId: options.disId,
        userId: options.userId,
        type: options.type,
       
      
    })
    if(options.type == 'edit'){

      var supplier = wx.getStorageSync('supplierItem');
      if(supplier){
        this.setData({
          supplier: supplier
        })
      }
    }
    
  },

  getRestrauntName(e){
    this.setData({
      supplierName: e.detail.value
    })
    this._ifCanSave();
  },

  editName(e){
    if(e.detail.value.length > 0){
      this.setData({
        editName: e.detail.value,
      })
    }else{
      this.setData({
        editName: "",
        addFinished: false
      })
    }
   
  },


  chechUpdate(){
    if(this.data.editName !== this.data.supplier.nxJrdhsSupplierName && this.data.editName.length > 0){
      this.setData({
         addFinished: true,
      })
    }else{
      this.setData({
         addFinished: false,
      })
    }
  },

  saveUpdate(){
    var data = this.data.supplier;
    data.nxJrdhsSupplierName = this.data.editName;
    updateJrdhSupplier(data).then(res =>{
      if(res.result.code == 0){
        wx.navigateBack({
          delta: 1
        })
      }
    })


  },

  /**
   * 检查可下一步状态
   */
   _ifCanSave(){
     //resName
     if(this.data.supplierName.length > 0){
        this.setData({
          addFinished: true
        })
     }else{
       this.setData({
         addFinished: false
       })
     }
    
   },

 
  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

  saveDepartment(){  
    console.log("saveDepartmentsaveDepartment")  
    var  dep = {
      nxJrdhsSupplierName: this.data.supplierName,
      nxJrdhsNxDistributerId: this.data.disId,
      nxJrdhsNxPurUserId: this.data.userId,
      nxJrdhsGbDistributerId: -1,
      nxJrdhsNxCommunityId: -1,
      }
      saveJrdhSupplier(dep)
      .then(res =>{
        if(res.result.code == 0){
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2]; //上一个页面
          //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
          prevPage.setData({
            update: true
          })
          wx.navigateBack({
            delta: 1,
          })
        }
      })

  }

  








  
})