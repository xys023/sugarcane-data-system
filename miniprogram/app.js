// app.js
// 甘蔗田间数据收集系统 - 微信小程序入口

App({
  /**
   * 全局数据
   */
  globalData: {
    // 后端API地址（部署时修改为实际服务器地址）
    // 本地开发：http://localhost:3000
    // 服务器部署：http://你的服务器IP:3000 或 https://你的域名
    apiBase: 'http://localhost:3000/api',
    uploadUrl: 'http://localhost:3000/api/upload/image',
    
    // 用户信息
    userInfo: null,
    token: '',
    
    // 系统信息
    systemInfo: null
  },

  /**
   * 小程序启动时执行
   */
  onLaunch() {
    console.log('甘蔗田间数据收集系统启动');
    
    // 获取系统信息
    try {
      this.globalData.systemInfo = wx.getSystemInfoSync();
    } catch (e) {
      console.error('获取系统信息失败', e);
    }

    // 检查本地存储的登录状态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
    }
  },

  /**
   * 检查登录状态，未登录则跳转到登录页
   * @returns {boolean} 是否已登录
   */
  checkLogin() {
    if (!this.globalData.token) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再使用',
        showCancel: false,
        success: () => {
          wx.navigateTo({ url: '/pages/login/login' });
        }
      });
      return false;
    }
    return true;
  },

  /**
   * 保存登录信息
   */
  setLoginInfo(token, userInfo) {
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);
  },

  /**
   * 清除登录信息（退出登录）
   */
  clearLoginInfo() {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  }
});
