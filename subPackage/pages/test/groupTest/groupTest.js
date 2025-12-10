// 企业微信会话存档功能测试页面
// 注意：本页面专注于会话存档功能，不包含客户联系功能
// 配置URL - 与 config.js 保持同步
const API_CONFIG = {
  // 当前使用外网地址
  // apiUrl: "https://grainservice.club:8443/nongxinle/api/",
  // server: "https://grainservice.club:8443/nongxinle/",
  
  // 内网地址（需要时取消注释，并注释上面的外网地址）
  apiUrl: "http://192.168.0.103:8080/nongxinle_master_war_exploded/api/",
  server: "http://192.168.0.103:8080/nongxinle_master_war_exploded/",
};

Page({
  data: {
    groupInfo: null,
    groupMembers: [],
    groupMessages: [],
    isEnterpriseWechat: false,
    testResults: [],
    // 会话存档相关
    archiveConfig: null,
    chatList: []
  },

  onLoad() {
    // 检测是否为企业微信环境
    this.checkEnvironment();
  },

  // 检测环境
  checkEnvironment() {
    const device = wx.getDeviceInfo();
    const isQywx = device.environment === 'wxwork';
    
    console.log('环境检测详情:', {
      environment: device.environment,
      isQywx: isQywx,
      device: device
    });
    
    this.setData({
      isEnterpriseWechat: isQywx
    });

    this.addTestResult(`环境检测: ${isQywx ? '企业微信' : '普通微信'} (${device.environment})`);
  },

  // 测试获取群信息
  testGetGroupInfo() {
    this.addTestResult('开始测试获取群信息...');
    
    if (!this.data.isEnterpriseWechat) {
      this.addTestResult('❌ 当前不是企业微信环境，无法测试群功能');
      return;
    }

    // 检测可用的API
    this.addTestResult('检测企业微信API...');
    this.addTestResult(`wx.qy 对象存在: ${!!wx.qy}`);
    
    if (wx.qy) {
      const apis = Object.keys(wx.qy);
      this.addTestResult(`可用的API: ${apis.join(', ')}`);
      
      // 检查常见的群相关API
      const groupAPIs = ['getGroupInfo', 'getGroupMembers', 'getGroupMessages', 'shareMessage', 'getChatInfo', 'getChatMembers'];
      groupAPIs.forEach(api => {
        this.addTestResult(`${api}: ${wx.qy[api] ? '✅ 可用' : '❌ 不可用'}`);
      });
    }

    // 尝试获取群信息
    if (wx.qy && wx.qy.getGroupInfo) {
      wx.qy.getGroupInfo({
        success: (res) => {
          console.log('群信息获取成功:', res);
          this.setData({
            groupInfo: res
          });
          this.addTestResult(`✅ 群名称: ${res.groupName || '未知'}`);
          this.addTestResult(`✅ 群ID: ${res.groupId || '未知'}`);
          this.addTestResult(`✅ 群成员数: ${res.memberCount || 0}`);
        },
        fail: (err) => {
          console.error('获取群信息失败:', err);
          this.addTestResult(`❌ 获取群信息失败: ${err.errMsg}`);
        }
      });
    } else {
      this.addTestResult('❌ wx.qy.getGroupInfo API 不可用');
      this.addTestResult('💡 建议：检查企业微信应用权限配置');
    }
  },

  // 测试获取群成员
  testGetGroupMembers() {
    this.addTestResult('开始测试获取群成员...');
    
    if (wx.qy && wx.qy.getGroupMembers) {
      wx.qy.getGroupMembers({
        success: (res) => {
          console.log('群成员获取成功:', res);
          this.setData({
            groupMembers: res.members || []
          });
          this.addTestResult(`✅ 获取到 ${res.members.length} 个群成员`);
          
          // 显示前几个成员信息
          res.members.slice(0, 3).forEach((member, index) => {
            this.addTestResult(`  成员${index + 1}: ${member.name || member.userid || '未知'}`);
          });
        },
        fail: (err) => {
          console.error('获取群成员失败:', err);
          this.addTestResult(`❌ 获取群成员失败: ${err.errMsg}`);
        }
      });
    } else {
      this.addTestResult('❌ wx.qy.getGroupMembers API 不可用');
    }
  },

  // 测试获取群聊天记录
  testGetGroupMessages() {
    this.addTestResult('开始测试获取群聊天记录...');
    
    if (wx.qy && wx.qy.getGroupMessages) {
      wx.qy.getGroupMessages({
        limit: 10, // 获取最近10条消息
        success: (res) => {
          console.log('群消息获取成功:', res);
          this.setData({
            groupMessages: res.messages || []
          });
          this.addTestResult(`✅ 获取到 ${res.messages.length} 条群消息`);
          
          // 显示最近几条消息
          res.messages.slice(0, 3).forEach((msg, index) => {
            this.addTestResult(`  消息${index + 1}: ${msg.content || msg.msgtype || '未知类型'}`);
          });
        },
        fail: (err) => {
          console.error('获取群消息失败:', err);
          this.addTestResult(`❌ 获取群消息失败: ${err.errMsg}`);
        }
      });
    } else {
      this.addTestResult('❌ wx.qy.getGroupMessages API 不可用');
    }
  },

  // 测试获取客户群列表
  // ❌ 已废弃：本应用不使用客户联系功能，只使用会话存档功能
  testGetCustomerGroupList() {
    this.addTestResult('开始测试获取客户群列表...');
    
    if (!this.data.isEnterpriseWechat) {
      this.addTestResult('❌ 当前不是企业微信环境，无法测试客户群功能');
      return;
    }

    // 注意：这个API需要服务端调用，这里我们测试小程序的群相关API
    this.addTestResult('💡 客户群列表API需要服务端调用，测试小程序相关API...');
    
    // 检查是否有客户群相关的API
    if (wx.qy) {
      const customerGroupAPIs = ['getCustomerGroupList', 'getExternalContactGroup', 'getGroupChatList'];
      customerGroupAPIs.forEach(api => {
        this.addTestResult(`客户群API ${api}: ${wx.qy[api] ? '✅ 可用' : '❌ 不可用'}`);
      });
      
      // 尝试调用可能的API
      if (wx.qy.getCustomerGroupList) {
        wx.qy.getCustomerGroupList({
          success: (res) => {
            console.log('客户群列表获取成功:', res);
            this.setData({
              customerGroupList: res.group_chat_list || []
            });
            this.addTestResult(`✅ 获取到 ${res.group_chat_list.length} 个客户群`);
            
            res.group_chat_list.slice(0, 3).forEach((group, index) => {
              this.addTestResult(`  客户群${index + 1}: ${group.chat_id}`);
            });
          },
          fail: (err) => {
            console.error('获取客户群列表失败:', err);
            this.addTestResult(`❌ 获取客户群列表失败: ${err.errMsg}`);
          }
        });
      } else {
        this.addTestResult('❌ 小程序端没有直接的客户群列表API');
        this.addTestResult('💡 需要通过服务端调用: /cgi-bin/externalcontact/groupchat/list');
        this.addTestResult('💡 需要权限: 企业客户权限->客户基础信息');
        
        // 尝试通过服务端API调用
        this.addTestResult('🔄 尝试通过服务端API获取客户群列表...');
        this.testCustomerGroupListViaServer();
      }
    }
  },

  // 通过服务端API测试客户群列表
  // ❌ 已废弃：本应用不使用客户联系功能，只使用会话存档功能
  testCustomerGroupListViaServer() {
    this.addTestResult('📡 通过服务端API获取客户群列表...');
    
    var data = {
      corpId: 'ww9778dea409045fe6',
      statusFilter: 0,
      offset: 0,
      limit: 10
    }
    
    wx.showLoading({
      title: "获取客户群列表"
    });
    wx.request({
      url: API_CONFIG.apiUrl + 'qywx/customergroup/list',
      method: 'GET',
      data: data,
      success: (res) => {
        wx.hideLoading();
        console.log('服务端获取客户群列表响应:', res.data);
        
        if (res.data.code == 0) {
          const groupList = res.data.list || [];
          this.setData({
            customerGroupList: groupList
          });
          this.addTestResult(`✅ 服务端API成功获取 ${groupList.length} 个客户群`);
          
          if (groupList.length > 0) {
            groupList.slice(0, 3).forEach((group, index) => {
              this.addTestResult(`  客户群${index + 1}: ${group.chat_id || group.id} (名称: ${group.name || '未知'})`);
            });
          } else {
            this.addTestResult('💡 没有找到客户群，可能需要先创建客户群');
          }
        } else {
          this.addTestResult(`❌ 服务端API返回错误: ${res.data.msg || '未知错误'}`);
          if (res.data.msg) {
            this.addTestResult(`   错误详情: ${res.data.msg}`);
          }
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('服务端API调用失败:', err);
        this.addTestResult(`❌ 服务端API调用失败: ${err.errMsg}`);
        this.addTestResult('💡 请检查网络连接和后台服务是否正常运行');
      }
    });
  },

  // 测试后台配置
  testBackendConfig() {
    this.addTestResult('🔧 测试后台配置...');
    
    var data = {
      corpId: 'ww9778dea409045fe6'
    }
    
    wx.showLoading({
  title: "测试后台配置"
});
    wx.request({
      url: API_CONFIG.apiUrl + 'qywx/customergroup/test',
      method: 'GET',
      data: data,
      success: (res) => {
        wx.hideLoading();
        console.log('后台配置测试响应:', res.data);
        
        if (res.data.code == 0) {
          this.addTestResult('✅ 后台配置测试成功');
          this.addTestResult(`   企业ID: ${res.data.data.corpId}`);
          this.addTestResult(`   消息: ${res.data.data.message}`);
        } else {
          this.addTestResult(`❌ 后台配置测试失败: ${res.data.msg || '未知错误'}`);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('后台配置测试失败:', err);
        this.addTestResult(`❌ 后台配置测试失败: ${err.errMsg}`);
      }
    });
  },

  // 测试数据库配置
  testDatabaseConfig() {
    this.addTestResult('💾 测试数据库配置...');
    
    var data = {
      corpId: 'ww9778dea409045fe6'
    }
    
    wx.showLoading({
  title: "测试数据库配置"
});
    wx.request({
      url: API_CONFIG.apiUrl + 'qywx/customergroup/db-test',
      method: 'GET',
      data: data,
      success: (res) => {
        wx.hideLoading();
        console.log('数据库配置测试响应:', res.data);
        
        if (res.data.code == 0) {
          const resultData = res.data.data;
          this.addTestResult('✅ 数据库配置测试成功');
          this.addTestResult(`   企业ID: ${resultData.corpId}`);
          this.addTestResult(`   配置存在: ${resultData.configExists ? '是' : '否'}`);
          
          if (resultData.configExists) {
            this.addTestResult(`   Secret已配置: ${resultData.secretConfigured ? '是' : '否'}`);
            this.addTestResult(`   私钥已配置: ${resultData.privateKeyConfigured ? '是' : '否'}`);
            this.addTestResult(`   状态: ${resultData.status}`);
          }
        } else {
          this.addTestResult(`❌ 数据库配置测试失败: ${res.data.msg || '未知错误'}`);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('数据库配置测试失败:', err);
        this.addTestResult(`❌ 数据库配置测试失败: ${err.errMsg}`);
      }
    });
  },

  // 测试获取access_token
  testAccessToken() {
    this.addTestResult('🔑 测试获取access_token...');
    
    var data = {
      corpId: 'ww9778dea409045fe6'
    }
    
    wx.showLoading("测试获取access_token");
    wx.request({
      url: API_CONFIG.apiUrl + 'qywx/customergroup/token-test',
      method: 'GET',
      data: data,
      success: (res) => {
        wx.hideLoading();
        console.log('access_token测试响应:', res.data);
        
        if (res.data.code == 0) {
          const resultData = res.data.data;
          if (resultData.success) {
            this.addTestResult('✅ access_token获取成功');
            this.addTestResult(`   企业ID: ${resultData.corpId}`);
            this.addTestResult(`   Token: ${resultData.accessToken.substring(0, 20)}...`);
          } else {
            this.addTestResult(`❌ access_token获取失败: ${resultData.message}`);
          }
        } else {
          this.addTestResult(`❌ access_token测试失败: ${res.data.msg || '未知错误'}`);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('access_token测试失败:', err);
        this.addTestResult(`❌ access_token测试失败: ${err.errMsg}`);
      }
    });
  },

  // 测试获取用户列表
  // ❌ 已废弃：本应用不使用客户联系功能，只使用会话存档功能
  testGetUsers() {
    this.addTestResult('👥 测试获取用户列表...');
    
    var data = {
      corpId: 'ww9778dea409045fe6',
      departmentId: 1,
      fetchChild: 1
    }
    
    wx.showLoading("获取用户列表");
    wx.request({
      url: API_CONFIG.apiUrl + 'qywx/customergroup/users',
      method: 'GET',
      data: data,
      success: (res) => {
        wx.hideLoading();
        console.log('用户列表测试响应:', res.data);
        
        if (res.data.code == 0) {
          this.addTestResult('✅ 用户列表获取成功');
          this.addTestResult('   响应数据已获取，请查看控制台日志');
        } else {
          this.addTestResult(`❌ 用户列表获取失败: ${res.data.msg || '未知错误'}`);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('用户列表测试失败:', err);
        this.addTestResult(`❌ 用户列表测试失败: ${err.errMsg}`);
      }
    });
  },

  // 测试客户群列表API（详细测试）
  // ❌ 已废弃：本应用不使用客户联系功能，只使用会话存档功能
  testGroupChatListAPI() {
    this.addTestResult('📋 测试客户群列表API（详细）...');
    
    var data = {
      corpId: 'ww9778dea409045fe6'
    }
    
    wx.showLoading("测试客户群列表API");
    wx.request({
      url: API_CONFIG.apiUrl + 'qywx/customergroup/groupchat-test',
      method: 'GET',
      data: data,
      success: (res) => {
        wx.hideLoading();
        console.log('客户群列表API详细测试响应:', res.data);
        
        if (res.data.code == 0) {
          const resultData = res.data.data;
          this.addTestResult('✅ 客户群列表API测试完成');
          this.addTestResult(`   企业ID: ${resultData.corpId}`);
          this.addTestResult(`   Access Token: ${resultData.accessToken ? resultData.accessToken.substring(0, 20) + '...' : '未获取到'}`);
          this.addTestResult(`   响应: ${resultData.response ? '已获取' : '无响应'}`);
          
          // 解析响应内容
          if (resultData.response) {
            try {
              const responseData = JSON.parse(resultData.response);
              if (responseData.errcode === 0) {
                const groupList = responseData.group_chat_list || [];
                this.addTestResult(`   找到 ${groupList.length} 个客户群`);
              } else {
                this.addTestResult(`   API错误: ${responseData.errmsg} (${responseData.errcode})`);
              }
            } catch (e) {
              this.addTestResult(`   响应解析失败: ${e.message}`);
            }
          }
        } else {
          this.addTestResult(`❌ 客户群列表API测试失败: ${res.data.msg || '未知错误'}`);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('客户群列表API测试失败:', err);
        this.addTestResult(`❌ 客户群列表API测试失败: ${err.errMsg}`);
      }
    });
  },

  // 测试会话存档功能
  testMsgAudit() {
    this.addTestResult('📨 测试会话存档功能...');
    
    var data = {
      corpId: 'ww9778dea409045fe6'
    }
    
    wx.showLoading({
      title: "测试会话存档功能"
    });
    wx.request({
      url: API_CONFIG.apiUrl + 'qywx/customergroup/test-msgaudit',
      method: 'GET',
      data: data,
      success: (res) => {
        wx.hideLoading();
        console.log('会话存档功能测试响应:', res.data);
        
        if (res.data.code == 0) {
          const resultData = res.data.data;
          this.addTestResult('✅ 会话存档功能测试成功');
          this.addTestResult(`   企业ID: ${resultData.corpId}`);
          this.addTestResult(`   状态: ${resultData.status}`);
          this.addTestResult(`   配置状态: ${resultData.configStatus}`);
          this.addTestResult(`   Secret已配置: ${resultData.secretConfigured ? '是' : '否'}`);
          this.addTestResult(`   私钥已配置: ${resultData.privateKeyConfigured ? '是' : '否'}`);
          this.addTestResult(`   回调URL: ${resultData.callbackUrl}`);
          this.addTestResult(`💡 ${resultData.instructions}`);
        } else {
          this.addTestResult(`❌ 会话存档功能测试失败: ${res.data.msg || '未知错误'}`);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('会话存档功能测试失败:', err);
        this.addTestResult(`❌ 会话存档功能测试失败: ${err.errMsg}`);
      }
    });
  },

  // 测试会话存档配置
  testSessionArchiveConfig() {
    this.addTestResult('🔐 测试会话存档配置...');
    
    var data = {
      corpId: 'ww9778dea409045fe6'
    }
    
    wx.showLoading({
      title: "测试会话存档配置"
    });
    wx.request({
      url: API_CONFIG.apiUrl + 'qywx/customergroup/secret-test',
      method: 'GET',
      data: data,
      success: (res) => {
        wx.hideLoading();
        console.log('会话存档配置测试响应:', res.data);
        
        if (res.data.code == 0) {
          const resultData = res.data.data;
          this.addTestResult('✅ 会话存档配置测试成功');
          this.addTestResult(`   企业ID: ${resultData.corpId}`);
          this.addTestResult(`   配置存在: ${resultData.configExists ? '是' : '否'}`);
          this.addTestResult(`   Secret已配置: ${resultData.secretConfigured ? '是' : '否'}`);
          this.addTestResult(`   Secret长度: ${resultData.secretLength || '未知'}`);
          this.addTestResult(`   私钥已配置: ${resultData.privateKeyConfigured ? '是' : '否'}`);
          this.addTestResult(`   状态: ${resultData.status}`);
          this.addTestResult(`   状态消息: ${resultData.statusMessage || '无'}`);
          
          if (resultData.secret) {
            this.addTestResult(`   Secret: ${resultData.secret.substring(0, 20)}...`);
          }
          if (resultData.token) {
            this.addTestResult(`   Token: ${resultData.token.substring(0, 20)}...`);
          }
        } else {
          this.addTestResult(`❌ 会话存档配置测试失败: ${res.data.msg || '未知错误'}`);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('会话存档配置测试失败:', err);
        this.addTestResult(`❌ 会话存档配置测试失败: ${err.errMsg}`);
      }
    });
  },

  // 测试获取已发现的群聊列表（会话存档自动发现）
  testDiscoveredGroups() {
    this.addTestResult('🔍 测试获取已发现的群聊列表...');
    
    var data = {
      corpId: 'ww9778dea409045fe6'
    }
    
    wx.showLoading({
      title: "获取已发现的群聊"
    });
    wx.request({
      url: API_CONFIG.apiUrl + 'qywx/customergroup/discovered-groups',
      method: 'GET',
      data: data,
      success: (res) => {
        wx.hideLoading();
        console.log('已发现的群聊列表响应:', res.data);
        
        if (res.data.code == 0) {
          const resultData = res.data.data;
          const groups = resultData.discoveredGroups || [];
          
          this.addTestResult('✅ 获取已发现的群聊列表成功');
          this.addTestResult(`   企业ID: ${resultData.corpId}`);
          this.addTestResult(`   已发现群聊数量: ${groups.length}`);
          this.addTestResult(`💡 ${resultData.note}`);
          
          if (groups.length > 0) {
            this.addTestResult('   --- 群聊列表 ---');
            groups.slice(0, 5).forEach((group, index) => {
              this.addTestResult(`   ${index + 1}. 群ID: ${group.roomid || group.chat_id || '未知'}`);
              if (group.name) {
                this.addTestResult(`      群名: ${group.name}`);
              }
              if (group.lastMsgTime) {
                this.addTestResult(`      最后消息: ${new Date(group.lastMsgTime).toLocaleString()}`);
              }
            });
            
            if (groups.length > 5) {
              this.addTestResult(`   ... 还有 ${groups.length - 5} 个群聊`);
            }
            
            // 保存到data中
            this.setData({
              chatList: groups
            });
          } else {
            this.addTestResult('💡 暂未发现任何群聊');
            this.addTestResult('💡 提示：在外部群中发送消息后，系统会自动发现群聊');
          }
        } else {
          this.addTestResult(`❌ 获取已发现的群聊列表失败: ${res.data.msg || '未知错误'}`);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取已发现的群聊列表失败:', err);
        this.addTestResult(`❌ 获取已发现的群聊列表失败: ${err.errMsg}`);
      }
    });
  },

  // 测试Spring配置
  testSpringConfig() {
    this.addTestResult('⚙️ 测试Spring配置...');
    
    var data = {
      corpId: 'ww9778dea409045fe6'
    }
    
    wx.showLoading({
      title: "测试Spring配置"
    });
    wx.request({
      url: API_CONFIG.apiUrl + 'qywx/customergroup/spring-config',
      method: 'GET',
      data: data,
      success: (res) => {
        wx.hideLoading();
        console.log('Spring配置测试响应:', res.data);
        
        if (res.data.code == 0) {
          const resultData = res.data.data;
          this.addTestResult('✅ Spring配置测试成功');
          this.addTestResult(`   企业ID: ${resultData.corpId}`);
          this.addTestResult(`   Secret已配置: ${resultData.secretConfigured ? '是' : '否'}`);
          this.addTestResult(`   私钥已配置: ${resultData.privateKeyConfigured ? '是' : '否'}`);
          this.addTestResult(`   状态: ${resultData.status}`);
          
          if (resultData.token) {
            this.addTestResult(`   Token: ${resultData.token.substring(0, 20)}...`);
          }
        } else {
          this.addTestResult(`❌ Spring配置测试失败: ${res.data.msg || '未知错误'}`);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('Spring配置测试失败:', err);
        this.addTestResult(`❌ Spring配置测试失败: ${err.errMsg}`);
      }
    });
  },

  // 测试获取群成员详情
  // ❌ 已废弃：本应用不使用客户联系功能，只使用会话存档功能
  testGetGroupMemberDetail() {
    this.addTestResult('👥 测试获取群成员详情...');
    
    // 先获取客户群列表，然后测试第一个群的成员详情
    var data = {
      corpId: 'ww9778dea409045fe6',
      limit: 1
    }
    
    wx.showLoading({
      title: "获取群成员详情"
    });
    wx.request({
      url: API_CONFIG.apiUrl + 'qywx/customergroup/list',
      method: 'GET',
      data: data,
      success: (res) => {
        if (res.data.code == 0 && res.data.data && res.data.data.group_chat_list && res.data.data.group_chat_list.length > 0) {
          const firstGroup = res.data.data.group_chat_list[0];
          const chatId = firstGroup.chat_id;
          
          // 获取群成员详情
          wx.request({
            url: API_CONFIG.apiUrl + 'qywx/customergroup/member',
            method: 'GET',
            data: {
              corpId: 'ww9778dea409045fe6',
              chatId: chatId
            },
            success: (memberRes) => {
              wx.hideLoading();
              console.log('群成员详情测试响应:', memberRes.data);
              
              if (memberRes.data.code == 0) {
                const memberData = memberRes.data.data;
                this.addTestResult('✅ 群成员详情获取成功');
                this.addTestResult(`   群ID: ${memberData.chat_id}`);
                this.addTestResult(`   成员数量: ${memberData.member_list ? memberData.member_list.length : 0}`);
                
                if (memberData.member_list && memberData.member_list.length > 0) {
                  memberData.member_list.slice(0, 3).forEach((member, index) => {
                    this.addTestResult(`   成员${index + 1}: ${member.name || member.userid} (${member.type})`);
                  });
                }
              } else {
                this.addTestResult(`❌ 群成员详情获取失败: ${memberRes.data.msg || '未知错误'}`);
              }
            },
            fail: (err) => {
              wx.hideLoading();
              this.addTestResult(`❌ 群成员详情获取失败: ${err.errMsg}`);
            }
          });
        } else {
          wx.hideLoading();
          this.addTestResult('❌ 没有找到客户群，无法测试群成员详情');
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取客户群列表失败:', err);
        this.addTestResult(`❌ 获取客户群列表失败: ${err.errMsg}`);
      }
    });
  },

  // 测试分享到群
  testShareToGroup() {
    this.addTestResult('开始测试分享到群...');
    
    // 尝试多种分享方式
    if (wx.qy && wx.qy.shareMessage) {
      wx.qy.shareMessage({
        title: '配送管理系统测试分享',
        desc: '这是一个测试分享消息',
        path: '/pages/order/index/index',
        success: (res) => {
          console.log('分享成功:', res);
          this.addTestResult('✅ 分享到群成功');
        },
        fail: (err) => {
          console.error('分享失败:', err);
          this.addTestResult(`❌ 分享失败: ${err.errMsg}`);
        }
      });
    } else if (wx.qy && wx.qy.shareAppMessage) {
      // 尝试替代API
      wx.qy.shareAppMessage({
        title: '配送管理系统测试分享',
        path: '/pages/order/index/index',
        success: (res) => {
          this.addTestResult('✅ 使用shareAppMessage分享成功');
        },
        fail: (err) => {
          this.addTestResult(`❌ shareAppMessage分享失败: ${err.errMsg}`);
        }
      });
    } else {
      this.addTestResult('❌ 所有分享API都不可用');
      this.addTestResult('💡 尝试使用普通分享功能...');
      
      // 使用普通分享作为备选
      if (wx.shareAppMessage) {
        this.addTestResult('✅ 普通分享功能可用，可以手动分享');
      } else {
        this.addTestResult('❌ 普通分享功能也不可用');
      }
    }
  },

  // 测试所有功能（仅会话存档功能）
  testAll() {
    this.setData({
      testResults: []
    });
    
    // 重新检测环境
    this.checkEnvironment();
    
    this.addTestResult('=== 开始企业微信会话存档功能全面测试 ===');
    this.addTestResult('💡 注意：本测试专注于会话存档功能，不包含客户联系功能');
    
    // 基础环境测试
    setTimeout(() => {
      this.testBackendConfig();
    }, 500);
    
    setTimeout(() => {
      this.testDatabaseConfig();
    }, 1000);
    
    setTimeout(() => {
      this.testAccessToken();
    }, 1500);
    
    // 会话存档功能测试
    setTimeout(() => {
      this.addTestResult('--- 会话存档功能测试 ---');
      this.testMsgAudit();
    }, 2000);
    
    setTimeout(() => {
      this.testSessionArchiveConfig();
    }, 2500);
    
    setTimeout(() => {
      this.testDiscoveredGroups();
    }, 3000);
    
    setTimeout(() => {
      this.testSpringConfig();
    }, 3500);
    
    // 小程序端API测试（基础群功能）
    setTimeout(() => {
      this.addTestResult('--- 小程序端基础群API测试 ---');
      this.testGetGroupInfo();
    }, 4000);
    
    setTimeout(() => {
      this.testGetGroupMembers();
    }, 4500);
    
    setTimeout(() => {
      this.testGetGroupMessages();
    }, 5000);
    
    setTimeout(() => {
      this.testShareToGroup();
    }, 5500);
    
    setTimeout(() => {
      this.addTestResult('=== 测试完成 ===');
      this.addTestResult('💡 如需在群中收到消息：');
      this.addTestResult('  1. 确保配置了会话存档Secret和私钥');
      this.addTestResult('  2. 在企业微信外部群中发送消息');
      this.addTestResult('  3. 点击"获取已发现的群聊"查看自动发现的群');
    }, 6000);
  },

  // 添加测试结果
  addTestResult(message) {
    const results = this.data.testResults;
    let type = 'info';
    if (message.includes('✅')) {
      type = 'success';
    } else if (message.includes('❌')) {
      type = 'error';
    }
    
    const timestamp = Date.now();
    const timeStr = new Date().toLocaleTimeString();
    
    results.push({
      id: timestamp, // 使用唯一ID作为key
      message: message,
      time: timeStr,
      type: type
    });
    
    this.setData({
      testResults: results
    });
    
    console.log(`[${timeStr}] ${message}`);
  },

  // 清空测试结果
  clearResults() {
    this.setData({
      testResults: []
    });
  }
});
