<template>
  <div class="layout">
    <!-- 左侧侧边栏 -->
    <aside class="sider">
      <div class="logo">
        <span>演出后台管理</span>
      </div>

      <nav class="menu">
        <router-link to="/dashboard" class="menu-item" active-class="active">
        仪表盘</router-link>

        <router-link to="/activities" class="menu-item" active-class="active">
        活动管理
        </router-link>

        <router-link to="/coupons" class="menu-item" active-class="active">
        优惠券管理</router-link>

        <router-link to="/banners" class="menu-item" active-class="active">
        轮播图管理</router-link>

        <router-link to="/performance/list" class="menu-item" active-class="active">
        演出管理</router-link>

        <router-link to="/artist/list" class="menu-item" active-class="active">
        艺人管理</router-link>

        <router-link to="/schedules" class="menu-item" active-class="active">
        场次管理
        </router-link>

        <router-link to="/venues" class="menu-item" active-class="active">
        场馆管理</router-link>

        <router-link to="/areas" class="menu-item" active-class="active">
        区域管理</router-link>

        <router-link to="/order/list" class="menu-item" active-class="active">
        订单管理
        </router-link>

        <router-link to="/user/list" class="menu-item" active-class="active">
        用户管理
        </router-link>

        <router-link to="/verify" class="menu-item" active-class="active">
        扫码核销
        </router-link>


      </nav>
    </aside>

    <!-- 右侧主体 -->
    <div class="main">
      <!-- 顶部栏 -->
      <header class="header">
        <div class="header-left">
          <h1 class="title">演出门票后台管理系统</h1>
        </div>
        <div class="header-right">
          <span class="admin-name">
            管理员：{{adminName}}
          </span>
          <button class="logout-btn" @click="logout">退出登录</button>
        </div>
      </header>

      <!-- 内容区 -->
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 管理员名字，可以以后从接口拿
const adminName = computed(() => {
  return localStorage.getItem('adminName') || '管理员'
})

const logout = () => {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('adminName')
  router.push('/login')
}
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* 左侧侧边栏 */
.sider {
  width: 220px;
  background: #1f2937;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.menu {
  flex: 1;
  padding: 12px 0;
}

.menu-item {
  display: block;
  padding: 10px 20px;
  font-size: 14px;
  color: #e5e7eb;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.menu-item.active {
  background: #4b5563;
  color: #fff;
}

/* 右侧主体 */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 顶部栏 */
.header {
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-name {
  font-size: 14px;
  color: #4b5563;
}

.logout-btn {
  margin-top: 0px;
  padding: 6px 14px;
  border-radius: 4px;
  border: 1px solid #ef4444;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  cursor: pointer;
}

.logout-btn:hover {
  background: #fee2e2;
}

/* 内容区 */
.content {
  flex: 1;
  padding: 20px;
  overflow: auto;
}
</style>
