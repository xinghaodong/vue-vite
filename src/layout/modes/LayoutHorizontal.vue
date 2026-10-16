<!-- 
  ========================================================================
  文件名称: LayoutHorizontal.vue
  所属模块: 横向通栏布局模式 (src/layout/modes/LayoutHorizontal.vue)
  功能说明:
    1. 顶部通栏导航：左侧 Logo + 中间横向多级菜单 + 右侧工具操作栏；
    2. 彻底释放左侧空间，Main 内容区与多标签栏 100% 宽度铺满；
    3. 适用于宽屏大表单、图表分析与数据驾驶舱。
  ========================================================================
-->
<template>
    <el-container class="layout-mode-container layout-horizontal-wrapper" direction="vertical">
        <!-- 1. 顶部通栏 Header -->
        <el-header class="layout-horizontal-header">
            <!-- 品牌 Logo -->
            <div class="horizontal-logo-wrapper">
                <Logo :is-collapse="false" />
            </div>

            <!-- 横向主菜单栏 -->
            <div class="horizontal-menu-wrapper">
                <el-scrollbar>
                    <el-menu
                        router
                        mode="horizontal"
                        :default-active="activeMenu"
                        :ellipsis="false"
                        class="horizontal-nav-menu"
                        @select="handleMenuSelect"
                    >
                        <SidebarItem
                            v-for="(item, index) in allArray"
                            :key="item.id || item.url || index"
                            :item="item"
                        />
                    </el-menu>
                </el-scrollbar>
            </div>

            <!-- 右侧功能区 (全屏/暗黑/设置/头像) -->
            <div class="horizontal-actions-wrapper">
                <HeaderActions />
            </div>
        </el-header>

        <!-- 2. 多标签栏 (受全局开关控制) -->
        <Tabs
            v-if="showTabs"
            @refresh-route="handleRefreshRoute"
        />

        <!-- 3. 主内容区 (全宽铺满) -->
        <div class="layout-horizontal-main">
            <Main ref="mainRef" />
        </div>
    </el-container>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import Logo from '../components/Sidebar/Logo.vue';
import SidebarItem from '../components/Sidebar/SidebarItem.vue';
import HeaderActions from '../components/Header/HeaderActions.vue';
import Tabs from '../components/Tabs/index.vue';
import Main from '../components/Main/index.vue';
import menuStore from '@/stores/menu.js';
import useLayoutStore from '@/stores/layout.js';

const route = useRoute();
const menuInfoStore = menuStore();
const layoutStore = useLayoutStore();
const { allArray } = storeToRefs(menuInfoStore);
const { showTabs } = storeToRefs(layoutStore);

const mainRef = ref(null);

// 当前高亮菜单项
const activeMenu = computed(() => {
    return route.path;
});

// 点击菜单同步 Pinia 活跃标签
const handleMenuSelect = (index) => {
    const findItemByUrl = (list, targetUrl) => {
        for (const it of list) {
            if (it.url === targetUrl) return it;
            if (it.children?.length) {
                const sub = findItemByUrl(it.children, targetUrl);
                if (sub) return sub;
            }
        }
        return null;
    };
    const target = findItemByUrl(allArray.value, index);
    if (target) {
        menuInfoStore.changeMenu({
            name: target.name,
            url: target.url,
            icon: target.icon,
        });
        menuInfoStore.changeTabsValue(target.url);
    }
};

const handleRefreshRoute = () => {
    if (mainRef.value?.reloadCurrentRoute) {
        mainRef.value.reloadCurrentRoute();
    }
};
</script>

<style scoped>
.layout-horizontal-wrapper {
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: var(--el-bg-color-page);
    display: flex;
    flex-direction: column;
}

.layout-horizontal-header {
    height: 50px !important;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    box-sizing: border-box;
    transition: background-color 0.3s ease;
    z-index: 10;
}

.horizontal-logo-wrapper {
    flex-shrink: 0;
    margin-right: 20px;
}

.horizontal-menu-wrapper {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: center;
}

.horizontal-nav-menu {
    border-bottom: none !important;
    background: transparent !important;
    height: 50px;
    line-height: 50px;
    display: flex;
    white-space: nowrap;
}

.horizontal-nav-menu :deep(.el-sub-menu__title),
.horizontal-nav-menu :deep(.el-menu-item) {
    height: 50px !important;
    line-height: 50px !important;
    border-bottom: 2px solid transparent !important;
}

.horizontal-nav-menu :deep(.el-menu-item.is-active),
.horizontal-nav-menu :deep(.el-sub-menu.is-active .el-sub-menu__title) {
    border-bottom: 2px solid var(--el-color-primary) !important;
    color: var(--el-color-primary) !important;
}

.horizontal-actions-wrapper {
    flex-shrink: 0;
    margin-left: 16px;
}

.layout-horizontal-main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
</style>
