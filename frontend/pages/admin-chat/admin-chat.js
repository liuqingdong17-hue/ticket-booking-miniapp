// pages/admin-chat/admin-chat.js
Page({
  data: {
    inputText: "",
    messages: [],
    user: {}
  },

  onLoad() {
    const user = wx.getStorageSync("userInfo") || {
      avatar: "/images/default-avatar.png"
    };

    this.setData({ user });

    this.loadMessages();

    // 每 2 秒轮询客服回复
    this.timer = setInterval(() => {
      this.loadMessages();
    }, 2000);
  },

  onUnload() {
    clearInterval(this.timer);
  },

  // 输入绑定
  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  // 拉取消息
  loadMessages() {
    wx.request({
      url: "http://localhost:3000/api/chat/human/messages",
      method: "GET",
      header: { Authorization: "Bearer " + wx.getStorageSync("token") },
      success: (res) => {
        if (res.data.status === 0) {
          this.setData({ messages: res.data.data }, this.scrollToBottom);
        }
      }
    });
  },

  // 发送消息
  sendMsg() {
    const text = this.data.inputText.trim();
    if (!text) return;

    this.pushLocalUser(text);
    this.setData({ inputText: "" });

    wx.request({
      url: "http://localhost:3000/api/chat/human/user-message",
      method: "POST",
      header: { Authorization: "Bearer " + wx.getStorageSync("token") },
      data: { text },
      success: () => {},
      fail: () => wx.showToast({ title: '发送失败', icon: 'none' })
    });
  },

  // 本地显示用户消息
  pushLocalUser(text) {
    const msg = {
      id: Date.now(),
      sender: 'user',
      message: text
    };

    this.setData({
      messages: [...this.data.messages, msg]
    }, this.scrollToBottom);
  },

  scrollToBottom() {
    wx.pageScrollTo({
      scrollTop: 999999,
      duration: 200
    });
  }
});
