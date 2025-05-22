import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue'; // HomeView.vue を後で作成

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: HomeView, // 初期表示ページ (月次カレンダーやダッシュボード想定)
  },
  {
    path: '/daily/:date', // :date は YYYY-MM-DD 形式のパラメータ
    name: 'DailyView',
    // route level code-splitting
    // this generates a separate chunk (DailyView.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "daily" */ '../views/DailyView.vue'), // DailyView.vue を後で作成
    props: true, // ルートパラメータをコンポーネントのpropsとして渡す
  },
  {
    path: '/weekly/:year/:weekNumber', // :year と :weekNumber パラメータ
    name: 'WeeklyView',
    component: () => import(/* webpackChunkName: "weekly" */ '../views/WeeklyView.vue'), // WeeklyView.vue を後で作成
    props: true,
  },
  {
    path: '/staff',
    name: 'StaffManagement',
    component: () => import(/* webpackChunkName: "staff" */ '../views/StaffManagementView.vue'), // StaffManagementView.vue を後で作成
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import(/* webpackChunkName: "settings" */ '../views/SettingsView.vue'), // SettingsView.vue を後で作成
  },
  // 必要に応じて他のルートを追加 (例: 業務テンプレート管理ページなど)
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;