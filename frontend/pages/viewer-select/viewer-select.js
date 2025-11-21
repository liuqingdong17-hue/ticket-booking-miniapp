// pages/viewer-select/viewer-select.js
const app = getApp();

Page({
  data: {
    viewerList: [],
    selectedViewerId: null  // 选中 ID
  },

  // 观演人列表 computed (掩码 ID)
  viewers() {
    return this.data.viewerList.map(item => ({
      ...item,
      masked_id_card: this.maskIdCard(item.id_card)  // 掩码处理
    }));
  },

  maskIdCard(idCard) {
    if (!idCard || idCard.length < 18) return idCard;
    return idCard.substring(0, 6) + '****' + idCard.substring(14);
  },

  onLoad() {
    this.getViewerList();
  },

  // 获取观演人列表
  getViewerList() {
    wx.request({
      url: `http://localhost:3000/api/viewer/list`,
      method: 'GET',
      header: {
        Authorization: `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.data.status === 0) {
          this.setData({ viewerList: res.data.data });
        } else {
          wx.showToast({ title: res.data.message, icon: 'none' });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // 选中观演人
  onSelectViewer(e) {
    const viewer = e.currentTarget.dataset.viewer;
    this.setData({ selectedViewerId: viewer.id });
    // 回调父页 (order-confirm)
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage && prevPage.setData) {
      prevPage.setData({ selectedViewer: viewer });
    }
    wx.navigateBack();
  },

  // 跳转添加页
  onAddViewer() {
    wx.navigateTo({
      url: '/pages/add-viewer/add-viewer',
      events: {
        addSuccess: () => {
          this.getViewerList();  // 添加成功后刷新列表
        }
      }
    });
  },

  // 删除观演人 (移除 e.stopPropagation())
  onDeleteViewer(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定删除该观演人吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `http://localhost:3000/api/viewer/delete`,
            method: 'POST',
            header: {
              Authorization: `Bearer ${wx.getStorageSync('token')}`
            },
            data: { id },
            success: (res) => {
              if (res.data.status === 0) {
                wx.showToast({ title: '删除成功', icon: 'success' });
                this.getViewerList();  // 刷新列表
              } else {
                wx.showToast({ title: res.data.message, icon: 'none' });
              }
            },
            fail: (err) => {
              wx.showToast({ title: '网络错误', icon: 'none' });
            }
          });
        }
      }
    });
  }
});