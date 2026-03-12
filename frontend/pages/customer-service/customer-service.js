Page({
  data: {
    inputText: "",
    messages: [],
    user: {}
  },

  onLoad() {
    const user = wx.getStorageSync("userInfo") || {
      avatar: "/images/default-avatar.png",
      username: "用户"
    };

    this.setData({ user });

    this.loadHistory();
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  //加载对话
  loadHistory() {
    wx.request({
      url: "http://localhost:3000/api/chat/history",
      method: "GET",
      header: {
        Authorization: "Bearer " + wx.getStorageSync("token")
      },
      success: (res) => {
        if (res.data.status === 0) {
          const list = res.data.data || [];
  
          if (list.length > 0) {
            // 有历史记录 → 显示
            this.setData({ messages: list }, this.scrollToBottom);
          } else {
            // 没历史记录 → 给欢迎语
            this.pushAI("您好，我是智能客服小蜜，有什么可以帮您的吗？");
          }
        }
      }
    });
  },
  

  // 用户发送消息
  sendMsg() {
    const text = this.data.inputText.trim();
    if (!text) return;

    this.pushUser(text);
    this.setData({ inputText: "" });

    // 保存到数据库
    wx.request({
      url: "http://localhost:3000/api/chat/user",
      method: "POST",
      header: { Authorization: "Bearer " + wx.getStorageSync("token") },
      data: { text },
      success: () => {
        this.askAI(text);   // ← 修复关键点：把 text 传给 AI
      }
    });
  },

  // 向 AI 提问
  askAI(text) {
    wx.request({
      url: "http://localhost:3000/api/chat/ai",
      method: "POST",
      header: { Authorization: "Bearer " + wx.getStorageSync("token") },
      data: { text },  // ← AI 使用当前轮输入
      success: (res) => {
        this.pushAI(res.data.reply);
      }
    });
  },

  pushUser(text) {
    const msg = {
      id: Date.now(),
      sender: "user",
      text
    };
    this.setData({
      messages: [...this.data.messages, msg]
    }, this.scrollToBottom);
  },

  pushAI(text) {
    const msg = {
      id: Date.now() + 1,
      sender: "ai",
      text
    };
    this.setData({
      messages: [...this.data.messages, msg]
    }, this.scrollToBottom);
  },

  scrollToBottom() {
    wx.pageScrollTo({
      scrollTop: 999999,
      duration: 300
    });
  },

  goHuman() {
    wx.navigateTo({
      url: "/pages/admin-chat/admin-chat"
    });
  }
});
