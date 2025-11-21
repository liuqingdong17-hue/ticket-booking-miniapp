Page({
  data: {
    activeTab: 'login',
    formData: {
      username: '',
      phone: '',
      password: '',
      code: '',
      newPassword: ''
    },
    loading: false,
    codeDisabled: false,
    codeText: '获取验证码'
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  inputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: e.detail.value });
  },

  onLogin() {
    const { phone, password } = this.data.formData;
    if (!phone || !password) {
      wx.showToast({ title: '请输入手机号和密码', icon: 'none', duration: 2000 });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号必须是11位数字，且以1开头', icon: 'none', duration: 2000 });
      return;
    }
    if (password.length < 6 || password.length > 13) {
      wx.showToast({ title: '密码长度必须为6-13位', icon: 'none', duration: 2000 });
      return;
    }

    this.setData({ loading: true });
    wx.request({
      url: 'http://localhost:3000/api/user/login',
      method: 'POST',
      data: { phone, password },
      success: (res) => {
        console.log('Login response (full):', JSON.stringify(res));
        console.log('Login data:', res.data);
        if (res.statusCode !== 200) {
          wx.showToast({ title: `服务器错误(${res.statusCode})`, icon: 'none', duration: 2000 });
          this.setData({ loading: false });
          return;
        }
        if (res.data && res.data.status === 0) {
          wx.setStorageSync('token', res.data.data.token);
          wx.setStorageSync('userId', res.data.data.userId);
          wx.showToast({ title: '登录成功', icon: 'success', duration: 2000 });
          wx.switchTab({ url: '/pages/index/index' });
        } else {
          // 处理嵌套 message
          const errorMessage = res.data && res.data.message 
            ? (typeof res.data.message === 'string' ? res.data.message : res.data.message.message || '登录失败，请稍后重试')
            : '登录失败，请稍后重试';
          wx.showToast({ title: errorMessage, icon: 'none', duration: 2000 });
        }
        this.setData({ loading: false });
      },
      fail: (err) => {
        console.error('Login request fail:', err);
        wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none', duration: 2000 });
        this.setData({ loading: false });
      }
    });
  },

  onRegister() {
    const { username, phone, password } = this.data.formData;
    if (!username || !phone || !password) {
      wx.showToast({ title: '请输入用户名、手机号和密码', icon: 'none', duration: 2000 });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号必须是11位数字，且以1开头', icon: 'none', duration: 2000 });
      return;
    }
    if (password.length < 6 || password.length > 13) {
      wx.showToast({ title: '密码长度必须为6-13位', icon: 'none', duration: 2000 });
      return;
    }

    this.setData({ loading: true });
    wx.request({
      url: 'http://localhost:3000/api/user/register',
      method: 'POST',
      data: { username, phone, password },
      success: (res) => {
        console.log('Register response (full):', JSON.stringify(res));
        console.log('Register data:', res.data);
        if (res.statusCode !== 200) {
          wx.showToast({ title: `服务器错误(${res.statusCode})`, icon: 'none', duration: 2000 });
          this.setData({ loading: false });
          return;
        }
        if (res.data && res.data.status === 0) {
          wx.setStorageSync('token', res.data.data.token);
          wx.setStorageSync('userId', res.data.data.userId);
          wx.showToast({ title: '注册成功', icon: 'success', duration: 2000 });
          wx.switchTab({ url: '/pages/index/index' });
        } else {
          const errorMessage = res.data && res.data.message 
            ? (typeof res.data.message === 'string' ? res.data.message : res.data.message.message || '注册失败，请稍后重试')
            : '注册失败，请稍后重试';
          wx.showToast({ title: errorMessage, icon: 'none', duration: 2000 });
        }
        this.setData({ loading: false });
      },
      fail: (err) => {
        console.error('Register request fail:', err);
        wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none', duration: 2000 });
        this.setData({ loading: false });
      }
    });
  },

  getCode() {
    const { phone } = this.data.formData;
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none', duration: 2000 });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号必须是11位数字，且以1开头', icon: 'none', duration: 2000 });
      return;
    }

    this.setData({ loading: true });
    wx.request({
      url: 'http://localhost:3000/api/user/forgot-password',
      method: 'POST',
      data: { phone },
      success: (res) => {
        console.log('Forgot password response (full):', JSON.stringify(res));
        console.log('Forgot password data:', res.data);
        if (res.statusCode !== 200) {
          wx.showToast({ title: `服务器错误(${res.statusCode})`, icon: 'none', duration: 2000 });
          this.setData({ loading: false });
          return;
        }
        if (res.data && res.data.status === 0) {
          wx.showToast({ title: '验证码已发送（查看后端控制台）', icon: 'success', duration: 2000 });
          this.setData({ codeDisabled: true, codeText: '60秒后重试' });
          let seconds = 60;
          const timer = setInterval(() => {
            seconds--;
            this.setData({ codeText: `${seconds}秒后重试` });
            if (seconds <= 0) {
              clearInterval(timer);
              this.setData({ codeDisabled: false, codeText: '获取验证码' });
            }
          }, 1000);
        } else {
          const errorMessage = res.data && res.data.message 
            ? (typeof res.data.message === 'string' ? res.data.message : res.data.message.message || '发送验证码失败')
            : '发送验证码失败';
          wx.showToast({ title: errorMessage, icon: 'none', duration: 2000 });
        }
        this.setData({ loading: false });
      },
      fail: (err) => {
        console.error('Get code request fail:', err);
        wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none', duration: 2000 });
        this.setData({ loading: false });
      }
    });
  },

  onResetPassword() {
    const { phone, code, newPassword } = this.data.formData;
    if (!phone || !code || !newPassword) {
      wx.showToast({ title: '请输入手机号、验证码和新密码', icon: 'none', duration: 2000 });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号必须是11位数字，且以1开头', icon: 'none', duration: 2000 });
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 13) {
      wx.showToast({ title: '新密码长度必须为6-13位', icon: 'none', duration: 2000 });
      return;
    }

    this.setData({ loading: true });
    wx.request({
      url: 'http://localhost:3000/api/user/reset-password',
      method: 'POST',
      data: { phone, code, newPassword },
      success: (res) => {
        console.log('Reset password response (full):', JSON.stringify(res));
        console.log('Reset password data:', res.data);
        if (res.statusCode !== 200) {
          wx.showToast({ title: `服务器错误(${res.statusCode})`, icon: 'none', duration: 2000 });
          this.setData({ loading: false });
          return;
        }
        if (res.data && res.data.status === 0) {
          wx.showToast({ title: '密码重置成功，请登录', icon: 'success', duration: 2000 });
          this.setData({ 
            activeTab: 'login', 
            formData: { username: '', phone: '', password: '', code: '', newPassword: '' } 
          });
        } else {
          const errorMessage = res.data && res.data.message 
            ? (typeof res.data.message === 'string' ? res.data.message : res.data.message.message || '重置密码失败')
            : '重置密码失败';
          wx.showToast({ title: errorMessage, icon: 'none', duration: 2000 });
        }
        this.setData({ loading: false });
      },
      fail: (err) => {
        console.error('Reset password request fail:', err);
        wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none', duration: 2000 });
        this.setData({ loading: false });
      }
    });
  }
});