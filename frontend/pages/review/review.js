// pages/review/review.js
Page({
  data: {
    order_id: null,
    performance_id: null,
    rating: 5,
    content: ""
  },

  onLoad(options) {
    this.setData({
      order_id: options.order_id,
      performance_id: options.performance_id
    });
  },

  // 点击星星评分
  selectStar(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      rating: index + 1
    });
  },

  // 输入评论文本
  onInput(e) {
    this.setData({
      content: e.detail.value
    });
  },

  // 提交评价
  submitReview() {
    const { order_id, performance_id, rating, content } = this.data;

    if (!rating) {
      wx.showToast({ title: "请给出评分", icon: "none" });
      return;
    }

    wx.request({
      url: "http://localhost:3000/api/review/add",
      method: "POST",
      header: {
        Authorization: "Bearer " + wx.getStorageSync("token")
      },
      data: {
        order_id,
        performance_id,
        rating,
        content
      },
      success: (res) => {
        if (res.data.status === 0) {
          wx.showToast({
            title: "评价成功",
            icon: "success"
          });

          setTimeout(() => {
            wx.navigateBack();
          }, 600);

        } else {
          wx.showToast({
            title: res.data.message,
            icon: "none"
          });
        }
      }
    });
  }
});
