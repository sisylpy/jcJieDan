function createChangeShwoType(purType) {
  var isPurchase = purType === 1;
  var storageKey = isPurchase ? 'purchaseViewMode' : 'stockViewMode';

  return function changeShwoType() {
    var viewMode = this.data.viewMode === 'category' ? 'department' : 'category';
    var resetData = isPurchase ? {
      selectedArr: [],
      selectedPrintArr: [],
      purGoodsArr: [],
      purCataArr: [],
      selectedSubWx: 0,
      toViewWx: '',
      scrollTopLeftWx: 0
    } : {
      leftMenuWidth: 120,
      choiceStockArr: [],
      goodsArr: [],
      goodsCataArr: [],
      selDepName: '',
      selectedSub: 0,
      toView: 'position0',
      scrollTopLeft: 0
    };

    wx.setStorageSync(storageKey, viewMode);
    this.setData(Object.assign({
      viewMode: viewMode,
      depArr: [],
      selectedDepId: null,
      categoryPositions: [],
      currentPage: 1,
      totalPage: 0,
      totalCount: 0,
      hasMore: true,
      isLoading: false
    }, resetData), () => this._initData(purType));
  };
}

module.exports = { createChangeShwoType };
