// pages/add-viewer/add-viewer.js
const app = getApp();

Page({
  data: {
    newViewer: {
      name: '',
      id_card: ''
    }
  },

  onLoad() {
    // 可从选择页传新数据，如果需要
  },

  // 输入框监听
  onNameInput(e) {
    this.setData({ 'newViewer.name': e.detail.value });
  },
  onIdCardInput(e) {
    this.setData({ 'newViewer.id_card': e.detail.value });
  },

  // 添加观演人
  onAddViewer() {
    const { name, id_card } = this.data.newViewer;
    if (!name || !id_card) {
      return wx.showToast({ title: '姓名和身份证号不能为空', icon: 'none' });
    }
    if (id_card.length !== 18 || !/^\d{17}[\dX]$/.test(id_card)) {
      return wx.showToast({ title: '身份证格式错误', icon: 'none' });
    }

    wx.request({
      url: `http://localhost:3000/api/viewer/add`,
      method: 'POST',
      header: {
        Authorization: `Bearer ${wx.getStorageSync('token')}`
      },
      data: { name, id_card },
      success: (res) => {
        if (res.data.status === 0) {
          wx.showToast({ title: '添加成功', icon: 'success' });
          // 回调选择页刷新
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage && prevPage.getViewerList) {
            prevPage.getViewerList();
          }
          wx.navigateBack();
        } else {
          wx.showToast({ title: res.data.message, icon: 'none' });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
});