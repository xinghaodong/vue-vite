<!-- 
  ========================================================================
  文件名称: Logo.vue
  所属模块: 侧边栏系统 (src/layout/components/Sidebar)
  功能说明:
    侧边栏顶部品牌 Logo 栏：
    1. 自适应折叠模式：展开时展示 Logo + 系统标题，折叠时仅展示 Logo；
    2. 支持暗黑模式自适应与无缝平滑过渡。
  ========================================================================
-->
<template>
    <div class="sidebar-logo-container" :class="{ collapse: isCollapse }">
        <transition name="sidebar-logo-fade">
            <router-link v-if="isCollapse" key="collapse" class="sidebar-logo-link" to="/index">
                <div class="logo-icon-box">
                    <img src="/vite.svg" class="sidebar-logo-img" alt="Logo" />
                </div>
            </router-link>
            <router-link v-else key="expand" class="sidebar-logo-link" to="/index">
                <div class="logo-icon-box">
                    <img src="/vite.svg" class="sidebar-logo-img" alt="Logo" />
                </div>
                <h1 class="sidebar-title">管理系统</h1>
            </router-link>
        </transition>
    </div>
</template>

<script setup>

defineProps({
    isCollapse: {
        type: Boolean,
        default: false,
    },
});
</script>

<style scoped>
.sidebar-logo-container {
    position: relative;
    width: 100%;
    height: 52px;
    line-height: 52px;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-lighter);
    text-align: center;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
}

.sidebar-logo-link {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    text-decoration: none;
    gap: 10px;
    padding: 0 16px;
    box-sizing: border-box;
}

.logo-icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: transparent;
    flex-shrink: 0;
}

.sidebar-logo-img {
    width: 26px;
    height: 26px;
    vertical-align: middle;
    transition: transform 0.3s ease;
}

.sidebar-logo-container:hover .sidebar-logo-img {
    transform: rotate(20deg);
}

.sidebar-title {
    display: inline-block;
    margin: 0;
    color: var(--el-text-color-primary);
    font-weight: 600;
    font-size: 16px;
    line-height: 52px;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sidebar-logo-fade-enter-active {
    transition: opacity 0.3s;
}

.sidebar-logo-fade-enter-from,
.sidebar-logo-fade-leave-to {
    opacity: 0;
}
</style>
