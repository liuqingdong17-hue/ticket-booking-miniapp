// pages/feedback/feedback.js
Page({
  data: {
    typeList: ['演出问题', '票务问题', '订单问题', '退款问题', '其他'],
    selectedType: 0,
    content: "",
    images: [],   // 存服务器 URL
    phone: ""
  },

  onLoad() {
    const phone = wx.getStorageSync('phone') || "";
    this.setData({ phone });
  },

  onTypeChange(e) {
    this.setData({ selectedType: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },
  removeImg(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.images;
  
    list.splice(index, 1);
  
    this.setData({ images: list });
  },
  

  // -------------------------
  // ✅ 选择图片 + 上传到服务器
  // -------------------------
  chooseImg() {
    const current = this.data.images.length;
  
    // 1️⃣ 已经 3 张了，不允许再选
    if (current >= 3) {
      wx.showToast({
        title: '最多上传 3 张图片',
        icon: 'none'
      });
      return;
    }
  
    wx.chooseMedia({
      count: 3 - current,          // 2️⃣ 本次最多还能选几张
      mediaType: ['image'],
      success: (res) => {
        // 3️⃣ 计算还剩几个名额
        const remain = 3 - this.data.images.length;
        const files = res.tempFiles.slice(0, remain);
  
        if (files.length === 0) return;
  
        files.forEach(file => {
          wx.uploadFile({
            url: "http://localhost:3000/api/feedback/upload",
            filePath: file.tempFilePath,
            name: 'images',
            header: {
              Authorization: "Bearer " + wx.getStorageSync("token")
            },
            success: (result) => {
              const data = JSON.parse(result.data);
  
              if (data.status === 0) {
                const baseUrl = 'http://localhost:3000';
                const serverUrls = data.data.map(p => baseUrl + p);
  
                this.setData({
                  images: [...this.data.images, ...serverUrls]
                });
              } else {
                wx.showToast({ title: '上传失败', icon: 'none' });
              }
            },
            fail: () => {
              wx.showToast({ title: '上传失败', icon: 'none' });
            }
          });
        });
      }  
    });
  },  
  previewImg(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.url,
      urls: this.data.images
    });
  },

  // -------------------------
  // ✅ 提交意见反馈
  // -------------------------
  submitFeedback() {
    if (!this.data.content.trim()) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    wx.request({
      url: "http://localhost:3000/api/feedback/submit",
      method: "POST",
      header: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + wx.getStorageSync('token')
      },
      data: {
        type: this.data.typeList[this.data.selectedType],
        content: this.data.content,
        phone: this.data.phone,
        images: this.data.images // ⭐ 现在是服务器 URL，而不是本地路径
      },
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '提交成功', icon: 'success' });

        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '提交失败', icon: 'none' });
      }
    });
  }
});
