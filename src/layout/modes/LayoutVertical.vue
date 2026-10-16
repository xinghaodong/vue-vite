<!-- 
  ========================================================================
  文件名称: LayoutVertical.vue
  所属模块: 纵向经典布局模式 (src/layout/modes/LayoutVertical.vue)
  功能说明:
    1. 经典中后台默认排版：左侧垂直全量导航 + 顶栏面包屑与快捷工具；
    2. 支持侧边栏平滑折叠展开 (210px <-> 64px)；
    3. 适用于大多数管理后台系统。
  ========================================================================
-->
<template>
    <el-container class="layout-mode-container layout-vertical-wrapper">
        <!-- 1. 左侧全量导航菜单栏 -->
        <Sidebar
            :is-collapse="isCollapse"
            :menu-list="allArray"
        />

        <!-- 2. 右侧主体容器 (Header + Tabs + Main) -->
        <el-container class="layout-right-container" direction="vertical">
            <!-- 顶栏 -->
            <Header
                :is-collapse="isCollapse"
                @toggle-collapse="toggleCollapse"
            />

            <!-- 多标签栏 -->
            <Tabs
                v-if="showTabs"
                @refresh-route="handleRefreshRoute"
            />

            <!-- 主路由视图 -->
            <Main ref="mainRef" />
        </el-container>
    </el-container>
</template>

<script setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import Sidebar from '../components/Sidebar/index.vue';
import Header from '../components/Header/index.vue';
import Tabs from '../components/Tabs/index.vue';
import Main from '../components/Main/index.vue';
import menuStore from '@/stores/menu.js';
import useLayoutStore from '@/stores/layout.js';

const menuInfoStore = menuStore();
const layoutStore = useLayoutStore();
const { allArray } = storeToRefs(menuInfoStore);
const { isCollapse, showTabs } = storeToRefs(layoutStore);

const toggleCollapse = () => {
    layoutStore.toggleCollapse();
};

const mainRef = ref(null);
const handleRefreshRoute = () => {
    if (mainRef.value?.reloadCurrentRoute) {
        mainRef.value.reloadCurrentRoute();
    }
};
</script>

<style scoped>
.layout-vertical-wrapper {
    width: 100%;
    height: 100vh;
    display: flex;
    overflow: hidden;
    background: var(--el-bg-color-page);
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
