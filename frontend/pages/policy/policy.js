// pages/policy/policy.js
Page({
  goUserAgreement() {
    wx.navigateTo({
      url: '/pages/policy-detail/user-agreement'
    });
  },

  goPrivacy() {
    wx.navigateTo({
      url: '/pages/policy-detail/privacy'
    });
  },

  goTicketRules() {
    wx.navigateTo({
      url: '/pages/policy-detail/ticket-rules'
    });
  },

  goRefundRules() {
    wx.navigateTo({
      url: '/pages/policy-detail/refund-rules'
    });
  }
});
