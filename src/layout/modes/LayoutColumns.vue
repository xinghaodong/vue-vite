<!-- 
  ========================================================================
  文件名称: LayoutColumns.vue
  所属模块: 分栏双列布局模式 (src/layout/modes/LayoutColumns.vue)
  功能说明:
    1. 专为大中型复杂系统设计：最左侧为一级图标极窄栏 (65px)，次列为二级树形子菜单栏 (200px)；
    2. 基于 useLayoutMenu 自动响应路由变化与一级模块高亮联动；
    3. 支持次列子菜单栏独立折叠收起 (200px <-> 0px)，极大化内容工作区。
  ========================================================================
-->
<template>
    <el-container class="layout-mode-container layout-columns-wrapper">
        <!-- 1. 第一列：一级图标极窄导航栏 (65px) -->
        <div class="columns-first-aside">
            <!-- 极简 Logo 图标 (统一复用 Logo.vue) -->
            <div class="columns-logo-wrapper">
                <Logo :is-collapse="true" />
            </div>

            <!-- 一级模块列表 -->
            <el-scrollbar class="columns-first-scrollbar">
                <div class="first-menu-list">
                    <div
                        v-for="item in firstLevelMenus"
                        :key="item._key"
                        class="first-menu-item"
                        :class="{ 'is-active': activeFirstKey === item._key }"
                        @click="handleSelectFirstLevel(item)"
                    >
                        <el-icon :size="20" class="first-menu-icon">
                            <component :is="item.icon || 'Menu'" />
                        </el-icon>
                        <span class="first-menu-title">{{ item.name }}</span>
                    </div>
                </div>
            </el-scrollbar>
        </div>

        <!-- 2. 第二列：二级/三级子菜单栏 (200px，支持独立折叠为 0px) -->
        <div
            v-if="hasSubMenu"
            class="columns-sub-aside"
            :class="{ 'is-collapsed': isColumnsSubCollapse }"
        >
            <!-- 子菜单栏顶部标题与折叠开关 -->
            <div class="sub-aside-header">
                <span class="sub-header-title">{{ currentFirstTitle }}</span>
                <div
                    class="sub-collapse-trigger"
                    @click="layoutStore.toggleColumnsSubCollapse()"
                >
                    <el-icon :size="14">
                        <DArrowLeft v-if="!isColumnsSubCollapse" />
                        <DArrowRight v-else />
                    </el-icon>
                </div>
            </div>

            <!-- 子菜单滚动树 -->
            <el-scrollbar class="sub-aside-scrollbar">
                <el-menu
                    router
                    :default-active="activeSubMenu"
                    class="columns-sub-menu"
                    @select="handleMenuSelect"
                >
                    <SidebarItem
                        v-for="(sub, idx) in subMenuList"
                        :key="sub.id || sub.url || idx"
                        :item="sub"
                    />
                </el-menu>
            </el-scrollbar>
        </div>

        <!-- 3. 右侧主体容器 (Header + Tabs + Main) -->
        <el-container class="layout-right-container" direction="vertical">
            <!-- 顶栏 -->
            <Header
                :is-collapse="isColumnsSubCollapse"
                @toggle-collapse="layoutStore.toggleColumnsSubCollapse()"
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
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { DArrowLeft, DArrowRight, Menu } from '@element-plus/icons-vue';
import Logo from '../components/Sidebar/Logo.vue';
import SidebarItem from '../components/Sidebar/SidebarItem.vue';
import Header from '../components/Header/index.vue';
import Tabs from '../components/Tabs/index.vue';
import Main from '../components/Main/index.vue';
import { useLayoutMenu } from '../composables/useLayoutMenu.js';
import useLayoutStore from '@/stores/layout.js';
import menuStore from '@/stores/menu.js';

const route = useRoute();
const router = useRouter();
const layoutStore = useLayoutStore();
const menuInfoStore = menuStore();
const { isColumnsSubCollapse, showTabs } = storeToRefs(layoutStore);

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
    return found?.name || '模块导航';
});

// 当前激活的二级子菜单高亮
const activeSubMenu = computed(() => {
    return route.path;
});

// 点击子菜单同步 Pinia 活跃标签
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
.layout-columns-wrapper {
    width: 100%;
    height: 100vh;
    display: flex;
    overflow: hidden;
    background: var(--el-bg-color-page);
}

/* 1. 第一列极窄栏 (65px) - 黑白主题自适应 */
.columns-first-aside {
    width: 65px;
    height: 100vh;
    background: var(--el-bg-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    z-index: 12;
    border-right: 1px solid var(--el-border-color-lighter);
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.columns-logo-wrapper {
    width: 100%;
    height: 52px;
}

.columns-first-scrollbar {
    flex: 1;
    width: 100%;
}

.first-menu-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 0;
    gap: 8px;
}

.first-menu-item {
    width: 52px;
    height: 52px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--el-text-color-regular);
    transition: all 0.25s ease;
}

.first-menu-item:hover {
    color: var(--el-color-primary);
    background: var(--el-fill-color-light);
}

.first-menu-item.is-active {
    color: #ffffff;
    background: var(--el-color-primary);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.35);
}

.first-menu-icon {
    margin-bottom: 3px;
}

.first-menu-title {
    font-size: 11px;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 48px;
    transform: scale(0.92);
}

/* 2. 第二列子菜单栏 (200px) */
.columns-sub-aside {
    width: 200px;
    height: 100vh;
    background: var(--el-bg-color);
    border-right: 1px solid var(--el-border-color-lighter);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    z-index: 11;
}

.columns-sub-aside.is-collapsed {
    width: 0 !important;
    border-right: none;
}

.sub-aside-header {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;
}

.sub-header-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sub-collapse-trigger {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--el-text-color-secondary);
    transition: all 0.2s ease;
}

.sub-collapse-trigger:hover {
    color: var(--el-color-primary);
    background: var(--el-fill-color);
}

.sub-aside-scrollbar {
    flex: 1;
    width: 100%;
}

.columns-sub-menu {
    border-right: none !important;
    background: transparent !important;
}

/* 3. 右侧主体容器 */
.layout-right-container {
    flex: 1;
    min-width: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
</style>
