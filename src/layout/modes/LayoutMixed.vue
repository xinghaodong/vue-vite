<!-- 
  ========================================================================
  文件名称: LayoutMixed.vue
  所属模块: 综合混合布局模式 (src/layout/modes/LayoutMixed.vue)
  功能说明:
    1. 经典阿里云/腾讯云控制台架构：顶栏展示系统一级模块导航，左侧边栏联动展示当前激活模块的二级/三级子菜单；
    2. 基于 useLayoutMenu 动态追踪：无子菜单的一级项自动隐藏左侧边栏，有子菜单项无缝自适应展开；
    3. 支持左侧子边栏独立折叠 (210px <-> 64px) 与暗黑模式深度自适应。
  ========================================================================
-->
<template>
    <el-container class="layout-mode-container layout-mixed-wrapper" direction="vertical">
        <!-- 1. 顶栏：Logo + 一级大类导航 + 工具操作集 -->
        <el-header class="layout-mixed-header">
            <!-- 品牌 Logo -->
            <div class="mixed-logo-box">
                <Logo :is-collapse="false" />
            </div>

            <!-- 一级大类横向菜单 -->
            <div class="mixed-first-nav-wrapper">
                <el-scrollbar>
                    <div class="mixed-first-nav-list">
                        <div
                            v-for="item in firstLevelMenus"
                            :key="item._key"
                            class="mixed-nav-item"
                            :class="{ 'is-active': activeFirstKey === item._key }"
                            @click="handleSelectFirstLevel(item)"
                        >
                            <el-icon :size="18" v-if="item.icon" class="mixed-nav-icon">
                                <component :is="item.icon" />
                            </el-icon>
                            <span class="mixed-nav-title">{{ item.name }}</span>
                        </div>
                    </div>
                </el-scrollbar>
            </div>

            <!-- 顶栏右侧功能区 -->
            <div class="mixed-actions-box">
                <HeaderActions />
            </div>
        </el-header>

        <!-- 2. 下部主体区域 (左侧子菜单边栏 + 右侧内容容器) -->
        <el-container class="mixed-bottom-container">
            <!-- 左侧联动子菜单边栏 (仅在有子菜单时展示) -->
            <el-aside
                v-if="hasSubMenu"
                :style="{ width: isCollapse ? '64px' : '210px' }"
                class="mixed-sub-sidebar"
            >
                <!-- 折叠切换控制器 -->
                <div class="mixed-collapse-bar">
                    <span v-if="!isCollapse" class="mixed-menu-group-title">{{ currentFirstTitle }}</span>
                    <div
                        class="collapse-trigger-btn"
                        :class="{ 'is-collapsed': isCollapse }"
                        @click="layoutStore.toggleCollapse()"
                    >
                        <el-icon :size="16"><Fold /></el-icon>
                    </div>
                </div>

                <!-- 子级树形菜单滚动区 -->
                <el-scrollbar class="mixed-sidebar-scrollbar">
                    <el-menu
                        router
                        :default-active="activeSubMenu"
                        :collapse="isCollapse"
                        :collapse-transition="false"
                        class="mixed-el-menu"
                        @select="handleMenuSelect"
                    >
                        <SidebarItem
                            v-for="(sub, idx) in subMenuList"
                            :key="sub.id || sub.url || idx"
                            :item="sub"
                        />
                    </el-menu>
                </el-scrollbar>
            </el-aside>

            <!-- 右侧主体内容容器 -->
            <el-container class="mixed-content-container" direction="vertical">
                <!-- 顶栏面包屑 (如果在混合模式下开启) -->
                <div v-if="showBreadcrumb" class="mixed-breadcrumb-bar">
                    <Breadcrumb />
                </div>

                <!-- 多标签栏 -->
                <Tabs
                    v-if="showTabs"
                    @refresh-route="handleRefreshRoute"
                />

                <!-- 主路由视图 -->
                <Main ref="mainRef" />
            </el-container>
        </el-container>
    </el-container>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Fold } from '@element-plus/icons-vue';
import Logo from '../components/Sidebar/Logo.vue';
import SidebarItem from '../components/Sidebar/SidebarItem.vue';
import HeaderActions from '../components/Header/HeaderActions.vue';
import Breadcrumb from '../components/Header/Breadcrumb.vue';
import Tabs from '../components/Tabs/index.vue';
import Main from '../components/Main/index.vue';
import { useLayoutMenu } from '../composables/useLayoutMenu.js';
import useLayoutStore from '@/stores/layout.js';
import menuStore from '@/stores/menu.js';

const route = useRoute();
const layoutStore = useLayoutStore();
const menuInfoStore = menuStore();
const { isCollapse, showTabs, showBreadcrumb } = storeToRefs(layoutStore);

// 提取多布局联动计算
const {
    firstLevelMenus,
    subMenuList,
    activeFirstKey,
    handleSelectFirstLevel,
} = useLayoutMenu();

const mainRef = ref(null);

// 是否存在有效子菜单
const hasSubMenu = computed(() => {
    return subMenuList.value && subMenuList.value.length > 0;
});

// 当前高亮的一级菜单名称
const currentFirstTitle = computed(() => {
    const found = firstLevelMenus.value.find((it) => it._key === activeFirstKey.value);
    return found?.name || '功能导航';
});

// 当前激活的二级子菜单高亮
const activeSubMenu = computed(() => {
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
    const target = findItemByUrl(subMenuList.value, index);
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
.layout-mixed-wrapper {
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: var(--el-bg-color-page);
    display: flex;
    flex-direction: column;
}

/* 1. 顶栏 */
.layout-mixed-header {
    height: 50px !important;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    box-sizing: border-box;
    flex-shrink: 0;
    z-index: 10;
}

.mixed-logo-box {
    flex-shrink: 0;
    width: 210px;
}

.mixed-first-nav-wrapper {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: center;
}

.mixed-first-nav-wrapper :deep(.el-scrollbar),
.mixed-first-nav-wrapper :deep(.el-scrollbar__view) {
    height: 100%;
    display: flex;
    align-items: center;
}

/* 彻底禁止纵向滚动与溢出，隐藏纵向滚动条 */
.mixed-first-nav-wrapper :deep(.el-scrollbar__wrap) {
    overflow-y: hidden !important;
    height: 100%;
}

.mixed-first-nav-wrapper :deep(.el-scrollbar__bar.is-vertical) {
    display: none !important;
}

.mixed-first-nav-list {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 49px;
    white-space: nowrap;
}

.mixed-nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 100%;
    padding: 0 16px;
    border-radius: 0;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-regular);
    user-select: none;
    transition: color 0.2s ease, background-color 0.2s ease;
}

.mixed-nav-item:hover {
    color: var(--el-color-primary);
    background: var(--el-fill-color-light);
}

.mixed-nav-item.is-active {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    font-weight: 600;
}

.mixed-nav-item.is-active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2.5px;
    background: var(--el-color-primary);
    border-radius: 2px 2px 0 0;
}

.mixed-actions-box {
    flex-shrink: 0;
    margin-left: 16px;
}

/* 2. 下部主体区域 */
.mixed-bottom-container {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
}

/* 左侧子菜单栏 */
.mixed-sub-sidebar {
    height: 100%;
    background: var(--el-bg-color);
    border-right: 1px solid var(--el-border-color-lighter);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}

.mixed-collapse-bar {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;
    padding-right: 4px;
}

.mixed-menu-group-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.collapse-trigger-btn {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    color: var(--el-text-color-regular);
    transition: all 0.25s ease;
}

.collapse-trigger-btn:hover {
    color: var(--el-color-primary);
    background: var(--el-fill-color);
}

.collapse-trigger-btn.is-collapsed {
    transform: rotate(180deg);
}

.mixed-sidebar-scrollbar {
    flex: 1;
    width: 100%;
}

.mixed-el-menu {
    border-right: none !important;
    background: transparent !important;
}

/* 右侧内容容器 */
.mixed-content-container {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.mixed-breadcrumb-bar {
    height: 36px;
    display: flex;
    align-items: center;
    padding: 0 16px;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;
}
</style>
