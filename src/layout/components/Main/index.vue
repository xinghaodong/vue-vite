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
                <router-view v-if="isRouterAlive" :key="refreshKey" />
            </div>
        </el-scrollbar>
    </el-main>
</template>

<script setup>
import { ref, nextTick } from 'vue';

const isRouterAlive = ref(true);
const refreshKey = ref(0);

/**
 * 局部无感刷新当前活跃路由
 */
const reloadCurrentRoute = () => {
    isRouterAlive.value = false;
    refreshKey.value += 1;
    nextTick(() => {
        isRouterAlive.value = true;
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

.main-content-box {
    padding: 14px;
    height: 100%;
    min-height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

/* 页面路由平滑切换过渡动效 (fade-transform) */
.fade-transform-leave-active,
.fade-transform-enter-active {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
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
