<!-- 
  ========================================================================
  文件名称: index.vue
  所属模块: 路由内容展示系统 (src/layout/components/Main)
  功能说明:
    主体路由展示容器：
    1. 页面平滑转场动画 (fade-transform)；
    2. 局部无感刷新机制 (通过 refreshKey 触发单路由重载，免去整页白屏重载)；
    3. 自适应全局滚动条与内容区内边距标准规范。
  ========================================================================
-->
<template>
    <el-main class="layout-main-container">
        <el-scrollbar class="main-scrollbar">
            <div class="main-content-box">
                <router-view v-if="isRouterAlive" v-slot="{ Component, route }">
                    <!-- 1. 开启转场动画模式：采用标准 transition 进行丝滑交叉过渡 -->
                    <transition
                        v-if="layoutStore.pageTransition !== 'none'"
                        :name="layoutStore.pageTransition"
                        mode="default"
                    >
                        <keep-alive :include="menuStore.cachedViews">
                            <component :is="Component" :key="route.fullPath" />
                        </keep-alive>
                    </transition>

                    <!-- 2. 无动效模式：彻底脱离 transition 运行时管线，Vue 直接执行同步原子级 VNode 替换，DOM 内绝无新旧两层并存，杜绝任何纵向跳跃 -->
                    <keep-alive v-else :include="menuStore.cachedViews">
                        <component :is="Component" :key="route.fullPath" />
                    </keep-alive>
                </router-view>
            </div>
        </el-scrollbar>
    </el-main>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import useMenuStore from '@/stores/menu.js';
import useLayoutStore from '@/stores/layout.js';

const menuStore = useMenuStore();
const layoutStore = useLayoutStore();
const currentRoute = useRoute();
const isRouterAlive = ref(true);

// 监听当前活跃路由，当配置了 keepalive 时自动加入缓存池
watch(
    () => currentRoute.name,
    () => {
        menuStore.addCachedView(currentRoute);
    },
    { immediate: true }
);

/**
 * 局部无感刷新当前活跃路由
 */
const reloadCurrentRoute = () => {
    isRouterAlive.value = false;
    if (currentRoute.name) {
        menuStore.removeCachedView(currentRoute.name);
    }
    nextTick(() => {
        isRouterAlive.value = true;
        menuStore.addCachedView(currentRoute);
    });
};

defineExpose({
    reloadCurrentRoute,
});
</script>

<style scoped>
.layout-main-container {
    padding: 0 !important;
    background: var(--el-bg-color-page);
    height: calc(100vh - 50px - 38px);
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
}

.main-scrollbar {
    height: 100%;
}

:deep(.main-scrollbar .el-scrollbar__view) {
    height: 100%;
}

/* 🌟 核心防跳动架构：CSS Grid 坐标堆叠 (Grid Stacking)
   无论是有动效时新旧组件同时存在，还是单一组件渲染，
   所有子组件全部锚定在同一个单元格 (row 1, col 1)。
   即使两个组件同时存在，也会自然重叠在同一坐标系，绝不可能被挤压到下方！ */
.main-content-box {
    padding: 12px;
    height: 100%;
    min-height: 100%;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: 1fr;
    position: relative;
    overflow: hidden;
}

.main-content-box > * {
    grid-area: 1 / 1 / 2 / 2;
    min-width: 0;
    width: 100%;
}

/* 退场组件：禁用鼠标指针交互，层级在下 */
.fade-leave-active,
.fade-transform-leave-active {
    pointer-events: none;
    z-index: 1;
}

/* 进场组件：层级在上，平滑过渡 */
.fade-enter-active,
.fade-transform-enter-active {
    z-index: 2;
}

/* 1. 平滑淡入 (fade) */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.18s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* 2. 缩放滑动 (fade-transform) */
.fade-transform-enter-active,
.fade-transform-leave-active {
    transition: opacity 0.18s cubic-bezier(0.4, 0, 0.2, 1), transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-transform-enter-from {
    opacity: 0;
    transform: translateX(-15px);
}
.fade-transform-leave-to {
    opacity: 0;
    transform: translateX(15px);
}
</style>
