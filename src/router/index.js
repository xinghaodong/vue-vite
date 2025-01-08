import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
import home from '@/home.vue';
import api from '../utils/request';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import useMenuStore from '@/stortes/menu'; // 引入仓库

// 预加载所有 Vue 文件
const components = import.meta.glob('@/pages/**/*.vue');

NProgress.configure({
    easing: 'ease', // 动画方式
    speed: 500, // 递增进度条的速度
    showSpinner: false, // 是否显示加载 icon
    trickleSpeed: 200, // 自动递增间隔
    minimum: 0.3, // 初始化时的最小百分比
});

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            redirect: '/home',
        },
        {
            path: '/home',
            name: 'home',
            component: home,
            redirect: '/index',
            meta: { title: '首页' },
            children: [
                {
                    path: '/index',
                    component: () => import('@/pages/index.vue'),
                },
            ],
        },
        {
            name: '404',
            path: '/404',
            component: () => import('@/pages/404.vue'),
        },
        {
            name: 'login',
            path: '/login',
            component: () => import('@/pages/login.vue'),
        },
    ],
});

// 转换路由的函数
function transformRoute(route, parentPath = '') {
    const transformed = {
        path: `${parentPath}${route.url}`, // 确保路径正确拼接
        name: route.code,
        meta: {
            icon: route.icon,
            keepalive: route.keepalive == '1',
        },
        children: route.children ? route.children.map(child => transformRoute(child, `${parentPath}${route.url}/`)).filter(Boolean) : undefined,
    };

    if (route.component) {
        const componentPath = `/src/pages/${route.component}.vue`; // 动态导入组件路径
        if (components[componentPath]) {
            transformed.component = components[componentPath];
        } else {
            console.error(`组件不存在: ${componentPath}`);
            // router.addRoute({ path: '/:catchAll(.*)', redirect: '/404' });
            return null; // 跳过无效路由
        }
    }
    return transformed;
}

// 异步加载路由并添加到路由器
const setupDynamicRoutes = async () => {
    console.log('开始加载动态路由...');
    try {
        const res = await api.menus();
        const backendRoutes = res.data;
        const useMenuStores = useMenuStore();
        useMenuStores.getAllMenu(backendRoutes);
        // 转换路由
        const transformedRoutes = backendRoutes.map(route => transformRoute(route)).filter(Boolean); // 过滤掉无效路由
        // 添加动态路由到 `/home`
        transformedRoutes.forEach(route => {
            router.addRoute('home', route);
        });
        // 添加一个catch-all路由，确保无效路由会重定向到 404
        router.addRoute({
            path: '/:catchAll(.*)', // 使用 catchAll 匹配所有路径
            redirect: '/404', // 重定向到 404 页面
        });
        return res;
    } catch (error) {
        console.error('Failed to setup dynamic routes:', error);
    }
};

// 路由守卫
let dynamicRoutesLoaded = false; // 防止重复加载动态路由
router.beforeEach(async (to, from, next) => {
    NProgress.start(); // 开启进度条
    const useMenuStores = useMenuStore();
    const funcAll = () => {
        dynamicRoutesLoaded = false;
        useMenuStores.changeRemoveAll();
        useMenuStores.clearAll();
        localStorage.clear(); // 清除所有 localStorage 数据
        console.log('清除所有 localStorage 数据');
    };
    if (to.path === '/login') {
        // localStorage.clear(); // 清除所有 localStorage 数据
        // useMenuStores.changeRemoveAll();
        funcAll();
        next(); // 登录页直接放行
        return;
    }
    // 如果没有 refToken 则跳转回登录页
    if (!localStorage.getItem('refreshToken')) {
        funcAll();
        return next('/login');
    }

    if (!dynamicRoutesLoaded) {
        try {
            await setupDynamicRoutes();
            dynamicRoutesLoaded = true; // 标记动态路由已加载
            next({ ...to, replace: true }); // 重新导航到当前路径，确保新添加的路由生效
            return;
        } catch (err) {
            funcAll();
            next('/login'); // 跳转到登录页
        }
    } else {
        next(); // 正常导航
    }
});

router.afterEach(() => {
    NProgress.done(); // 进度条结束
});

export default router;
