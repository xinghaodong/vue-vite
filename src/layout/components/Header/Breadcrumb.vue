<!-- 
  ========================================================================
  文件名称: Breadcrumb.vue
  所属模块: 顶栏系统 (src/layout/components/Header)
  功能说明:
    现代高性能面包屑导航组件：
    1. O(1) 瞬时响应：直接读取路由预注入的祖先全链路 (route.meta.breadcrumbs)；
    2. 支持静态路由优雅降级，首页固定锚点自动规范；
    3. 联动设置中心，支持动态显示/隐藏层级小图标；
    4. 中间目录纯文本安全防呆，终节点高亮，祖先页面可点击。
  ========================================================================
-->
<template>
    <el-breadcrumb class="app-breadcrumb" separator="/">
        <transition-group name="breadcrumb">
            <el-breadcrumb-item
                v-for="(item, index) in breadcrumbs"
                :key="item.path || item.title || index"
            >
                <!-- 最后一级为当前页，或者无跳转地址的中间目录：不可点击 -->
                <span
                    v-if="index === breadcrumbs.length - 1 || !item.path || item.path === route.path"
                    class="no-redirect"
                >
                    <el-icon v-if="showBreadcrumbIcon && item.icon" class="breadcrumb-icon">
                        <component :is="item.icon" />
                    </el-icon>
                    <span>{{ item.title }}</span>
                </span>

                <!-- 可点击跳转的父级或首页 -->
                <a
                    v-else
                    class="redirect-link"
                    @click.prevent="handleLink(item)"
                >
                    <el-icon v-if="showBreadcrumbIcon && item.icon" class="breadcrumb-icon">
                        <component :is="item.icon" />
                    </el-icon>
                    <span>{{ item.title }}</span>
                </a>
            </el-breadcrumb-item>
        </transition-group>
    </el-breadcrumb>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import useLayoutStore from '@/stores/layout.js';

const route = useRoute();
const router = useRouter();
const layoutStore = useLayoutStore();
const { showBreadcrumbIcon } = storeToRefs(layoutStore);

/**
 * 响应式计算当前面包屑链路：
 * 1. 优先使用动态路由预注入的祖先全链路 (route.meta.breadcrumbs)；
 * 2. 静态路由优雅降级回退 (route.matched)；
 * 3. 首页作为固定的首级锚点。
 */
const breadcrumbs = computed(() => {
    // 1. 如果当前路由已注入预计算好的祖先链路，忠实呈现真实的业务菜单层级
    if (route.meta?.breadcrumbs && route.meta.breadcrumbs.length > 0) {
        return route.meta.breadcrumbs;
    }

    // 2. 静态路由优雅降级回退 (Fallback: 提取 route.matched 中有 title 的项，排除外层 home 布局壳)
    const matched = route.matched.filter(
        item => item.meta && item.meta.title && item.path !== '/home'
    );
    const fallbackList = matched.map(item => ({
        title: item.meta.title,
        icon: item.meta.icon || (item.path === '/index' ? 'HomeFilled' : ''),
        path: item.path,
    }));

    return fallbackList.length > 0 ? fallbackList : [{ title: '首页', path: '/index', icon: 'HomeFilled' }];
});

const handleLink = (item) => {
    if (item.path) {
        router.push(item.path);
    }
};
</script>

<style scoped>
.app-breadcrumb {
    display: inline-flex;
    align-items: center;
    font-size: 14px;
    line-height: 50px;
    margin-left: 14px;
    user-select: none;
}

.no-redirect {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--el-text-color-regular);
    cursor: default;
    font-weight: 500;
}

/* 最后一级当前页面文本颜色加深，凸显所在位置 */
:deep(.el-breadcrumb__item:last-child .no-redirect) {
    color: var(--el-text-color-primary);
    font-weight: 600;
}

.redirect-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--el-text-color-secondary);
    font-weight: 400;
    cursor: pointer;
    transition: color 0.2s ease;
}

.redirect-link:hover {
    color: var(--el-color-primary);
}

.breadcrumb-icon {
    font-size: 15px;
    line-height: 1;
}

/* 面包屑切页平滑动画 */
.breadcrumb-enter-active,
.breadcrumb-leave-active {
    transition: all 0.25s ease;
}

.breadcrumb-enter-from,
.breadcrumb-leave-to {
    opacity: 0;
    transform: translateX(12px);
}
</style>
