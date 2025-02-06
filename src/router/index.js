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
                // {
                //     path: '/vueFlow',
                //     component: () => import('@/pages/vueFlow/index.vue'),
                // },
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
function transformRoute(route) {
    // 对于menutype为2的路由，我们直接使用`/${route.url}`作为path；
    // 否则，我们仅使用`${route.url}`来避免嵌套。
    const pathPrefix = route.menutype == 2 ? '/' : '';

    const transformed = {
        path: `${route.url}`, // 确保路径是相对于根路径的
        name: route.code,
        meta: {
            icon: route.icon,
            keepalive: route.keepalive === '1',
            title: route.name,
        },
        url: `${route.url}`,
        keepalive: route.keepalive === '1',
        menutype: route.menutype,
        sorts: route.sorts,
        // 移除了children递归调用，因为我们现在生成的是平级路由
    };
    if (route.component) {
        const componentPath = `/src/pages/${route.component}.vue`; // 动态导入组件路径
        if (components[componentPath]) {
            // 使用动态导入的结果作为组件定义
            transformed.component = components[componentPath];
        } else {
            return null; // 跳过无效路由
        }
    }

    return transformed;
}
let backendRoutes = [];
// 异步加载路由并添加到路由器
const setupDynamicRoutes = async () => {
    console.log('开始加载动态路由...');
    try {
        const res = await api.menus();
        backendRoutes = res.data;
        let menu = JSON.parse(JSON.stringify(backendRoutes));
        let menus = JSON.parse(JSON.stringify(backendRoutes));
        const useMenuStores = useMenuStore();
        // 递归过滤掉 menutype == 2 的数据
        menu = generateUrls(menu);
        menu = filterMenuTree(menu);
        useMenuStores.getAllMenu(menu);
        menus = generateUrls(menus);
        useMenuStores.getAllMenuWithBtn(menus);
        // useMenuStores.getAllMenuWithBtn(backendRoutes);
        // 把树形数组转为评价结构
        backendRoutes = flattenTree(backendRoutes);
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
    } catch (error) {}
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
        // 增加判 对按钮路由 也要更新tab菜单
        // 从菜单里找到对应的对象
        // useMenuStores.changeMenu(to);
        let obj = findNodeById(backendRoutes, to.name);
        if (obj && obj.menutype == 2) {
            obj.url = to.fullPath;
            // to.fullPath = to.fullPath.replace(/^\//, '');
            useMenuStores.changeMenu(obj);
            useMenuStores.changeTabsValue(obj.url);
        }
        next(); // 正常导航
    }
});
function filterMenuTree(menuTree) {
    return menuTree
        .filter(menu => menu.menutype !== '2') // 过滤掉 menutype 为 "2" 的节点
        .map(menu => {
            if (menu.children && menu.children.length > 0) {
                // 递归处理子菜单
                menu.children = filterMenuTree(menu.children);
            }
            return menu;
        });
}
// 递归处理树形数据，拼接 url
function generateUrls(tree) {
    return tree.map(item => {
        if (item.url) {
            item.url = `/home/${item.url}`; // 如果url存在，则拼接'/home'
        }

        // 如果有子节点，则递归处理子节点
        if (item.children && item.children.length > 0) {
            item.children = generateUrls(item.children);
        }

        return item;
    });
}
function flattenTree(tree) {
    let result = [];
    function traverse(node) {
        // 将当前节点添加到结果数组中
        result.push(node);
        // 如果当前节点有子节点，递归遍历子节点
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                traverse(child);
            });
        }
    }
    // 遍历树形结构中的每个节点
    tree.forEach(node => {
        traverse(node);
    });
    return result;
}
const findNodeById = (tree, url) => {
    for (const node of tree) {
        if (node.code === url) {
            return node;
        }
        if (node.children) {
            // 如果节点有子节点，继续递归查找
            const foundNode = findNodeById(node.children, url);
            if (foundNode) {
                return foundNode;
            }
        }
    }
    return null; // 没有找到对应ID的节点
};

router.afterEach(() => {
    NProgress.done(); // 进度条结束
});

export default router;
