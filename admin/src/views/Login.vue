<!-- <template>
  <div class="login-container">
    <div class="login-box">
      <h2>后台管理系统</h2>

      <input v-model="username" placeholder="用户名" />
      <input v-model="password" type="password" placeholder="密码" />

      <button @click="login">登录</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      username: '',
      password: ''
    };
  },
  methods: {
    login() {
      if (!this.username || !this.password) {
        alert('请输入账号密码！')
        return
      }

      // 简单模拟登录（等下接后端）
      if (this.username === 'admin' && this.password === '123456') {
        localStorage.setItem('admin_token', 'TEST_TOKEN')
        this.$router.push('/dashboard')
      } else {
        alert('账号或密码错误')
      }
    }
  }
}
</script>

<style>
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
}
.login-box {
  width: 360px;
  padding: 30px;
  background: white;
  box-shadow: 0 0 8px rgba(0,0,0,0.1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}
input {
  margin-top: 10px;
  padding: 10px;
  font-size: 14px;
}
button {
  margin-top: 20px;
  padding: 10px;
  background: #409eff;
  border: none;
  color: white;
  border-radius: 5px;
  cursor: pointer;
}
</style> -->
<template>
  <div class="login-container">
    <div class="login-box">
      <h2>后台管理系统</h2>

      <input v-model="username" placeholder="用户名" />
      <input v-model="password" type="password" placeholder="密码" />

      <button @click="login" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false
    }
  },
  methods: {
    async login() {
      if (!this.username || !this.password) {
        alert('请输入账号密码！')
        return
      }

      if (this.loading) return
      this.loading = true

      try {
        const res = await fetch('http://localhost:3000/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: this.username,
            password: this.password
          })
        })

        const data = await res.json()

        if (data.status !== 0) {
          alert(data.message || '登录失败')
          return
        }

        const token = data?.data?.token
        const adminUsername = data?.data?.admin?.username

        if (!token) {
          alert('登录失败：token缺失')
          return
        }

        // ✅ 存 token + 管理员名字（Layout 才能显示）
        localStorage.setItem('admin_token', token)
        localStorage.setItem('adminName', adminUsername || this.username)

        this.$router.push('/dashboard')
      } catch (e) {
        console.error(e)
        alert('网络错误/接口异常，请检查后端是否启动、地址是否正确')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style>
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
}
.login-box {
  width: 360px;
  padding: 30px;
  background: white;
  box-shadow: 0 0 8px rgba(0,0,0,0.1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}
input {
  margin-top: 10px;
  padding: 10px;
  font-size: 14px;
}
button {
  margin-top: 20px;
  padding: 10px;
  background: #409eff;
  border: none;
  color: white;
  border-radius: 5px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
