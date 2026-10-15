<!-- 
  ========================================================================
  文件名称: index.vue
  所属模块: 布局系统总装配入口 (src/layout)
  功能说明:
    大厂标准分层架构 Layout 总入口：
    1. 整合 Sidebar (侧边栏)、Header (顶栏)、Tabs (多标签栏)、Main (主体内容区)；
    2. 统一管控侧边栏折叠状态与路由无感刷新；
    3. 完全解耦单体臃肿 home.vue，提升系统的扩展性与工程质感。
  ========================================================================
-->
<template>
    <el-container class="layout-app-wrapper">
        <!-- 1. 侧边栏 -->
        <Sidebar
            :is-collapse="isCollapse"
            :menu-list="allArray"
        />

        <!-- 2. 主体右侧区域 (Header + Tabs + Main) -->
        <el-container class="layout-right-container" direction="vertical">
            <!-- 顶栏 -->
            <Header
                :is-collapse="isCollapse"
                @toggle-collapse="toggleCollapse"
            />

            <!-- 多标签栏 -->
            <Tabs
                @refresh-route="handleRefreshCurrentRoute"
            />

            <!-- 主路由视图 -->
            <Main ref="mainLayoutRef" />
        </el-container>
    </el-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import Sidebar from './components/Sidebar/index.vue';
import Header from './components/Header/index.vue';
import Tabs from './components/Tabs/index.vue';
import Main from './components/Main/index.vue';
import menuStore from '@/stortes/menu';
import { initTheme } from '@/composables/useTheme';
import { useReconstructionStream } from '@/composables/useReconstructionStream';

const menuInfoStore = menuStore();
const { allArray } = storeToRefs(menuInfoStore);

// 实景三维建模全局按需单例
const { checkBackgroundTasks } = useReconstructionStream();

// 侧边栏折叠状态
const isCollapse = ref(false);

const toggleCollapse = () => {
    isCollapse.value = !isCollapse.value;
};

// 触发路由局部无感刷新
const mainLayoutRef = ref(null);
const handleRefreshCurrentRoute = () => {
    if (mainLayoutRef.value?.reloadCurrentRoute) {
        mainLayoutRef.value.reloadCurrentRoute();
    }
};

onMounted(() => {
    // 确保暗黑模式初始类名正确同步
    initTheme();
    // 检查后台是否有进行中的实景三维建模任务（有则自动激活跨页面监听，无则完全静默零开销）
    checkBackgroundTasks();
});
</script>

<style scoped>
.layout-app-wrapper {
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: var(--el-bg-color-page);
    display: flex;
}

.layout-right-container {
    flex: 1;
    min-width: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
</style>
