import { createRouter, createWebHistory } from 'vue-router'

import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import MainLayout from '../layouts/MainLayout.vue'

import ActivityList from '../views/ActivityList.vue'
import CouponList from '../views/CouponList.vue'
import BannerList from '../views/BannerList.vue'


import PerformanceList from '../views/PerformanceList.vue'
import PerformanceAdd from '../views/PerformanceAdd.vue'
import PerformanceEdit from '../views/PerformanceEdit.vue'

import ArtistList from '../views/ArtistList.vue'
import ArtistAdd from '../views/ArtistAdd.vue'
import ArtistEdit from '../views/ArtistEdit.vue'

// 场次管理页面
import Schedules from '../views/Schedules.vue'
import ScheduleAdd from '../views/ScheduleAdd.vue'
import ScheduleEdit from '../views/ScheduleEdit.vue'

// ⭐ 新增：区域价格页
import AreaPrice from '../views/AreaPrice.vue'

import VenueList from '../views/VenueList.vue'
import VenueAdd from '../views/VenueAdd.vue'
import VenueEdit from '../views/VenueEdit.vue'

import AreaList from '../views/AreaList.vue'
import AreaEdit from '../views/AreaEdit.vue'
import SeatManage from '../views/SeatManage.vue'

import OrderList from '../views/OrderList.vue'
import OrderDetail from '../views/OrderDetail.vue'

import UserList from '../views/UserList.vue'
import UserDetail from '../views/UserDetail.vue'
import UserChat from '../views/UserChat.vue';

import Verify from '../views/Verify.vue'


const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 登录
    { path: '/login', component: Login },

    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', redirect: '/dashboard' },

        { path: 'dashboard', component: Dashboard },

        // // 左侧菜单旧页面（占位）
        // { path: 'performances', component: Performances },
        // { path: 'orders', component: Orders },
        // { path: 'users', component: Users },

        // ⭐ 新增
        { path: 'activities', component: ActivityList },
        { path: 'coupons', component: CouponList },
        { path: 'banners', component: BannerList },
        // 演出管理
        { path: 'performance/list', component: PerformanceList },
        { path: 'performance/add', component: PerformanceAdd },
        { path: 'performance/edit/:id', component: PerformanceEdit },

        // ⭐ 艺人管理
        { path: 'artist/list', component: ArtistList },
        { path: 'artist/add', component: ArtistAdd },
        { path: 'artist/edit/:id', component: ArtistEdit },

        // ⭐ 场次管理（真实页面）
        { path: 'schedules', component: Schedules },
        { path: 'schedules/add', component: ScheduleAdd },
        { path: 'schedules/edit/:id', component: ScheduleEdit },

        // ⭐ 新增：可选座 → 区域价格页
        { path: 'schedules/:id/area-price', component: AreaPrice },

        // 场馆相关
        { path: 'venues', component: VenueList },
        { path: 'venues/add', component: VenueAdd },
        { path: 'venues/edit/:id', component: VenueEdit },

        { path: 'areas', component: AreaList },
        { path: 'areas/edit/:id', component: AreaEdit },

        { path: 'areas/:id/seats', component: SeatManage },

        { path: 'order/list', component: OrderList },
        { path: 'order/detail/:id', component: OrderDetail },

        { path: 'user/list', component: UserList },
        { path: 'user/detail/:id', component: UserDetail },
        { path: 'user/chat/:id', component: UserChat },

        { path: 'verify', component: Verify }


      ]
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')

  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router

