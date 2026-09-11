var load = require('../../../lib/load.js');
var tabBar = require('../../../lib/routeDispatchTabBar.js');
let scrollDdirection = 0; // 用来计算滚动的方向

const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 50;
const mergedWorkBarHeight = 88; // rpx，与 app.wxss 中一级业务页签高度一致

import apiUrl from '../../../config.js'

import {
  disGetCollReplyOutPage,
  disGetCollNxPrepareOutCata,
  disGetTypePrepareOutDepCata,
  disGetCollPrepareOutPage,

  disGetTypePrepareOutByDep,
} from '../../../lib/apiDepOrder'

Component(require('./doingComponent.js')())
