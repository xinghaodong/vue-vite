<!-- 
  ========================================================================
  文件名称: index.vue
  所属模块: 侧边栏系统 (src/layout/components/Sidebar)
  功能说明:
    现代化后台侧边栏总控组件：
    1. 顶部品牌 Logo + 标题区；
    2. 自适应 el-scrollbar 滚动容器，杜绝原生滚动条破坏视觉；
    3. Element Plus 现代菜单集成，支持平滑折叠宽度过渡 (210px <-> 64px)；
    4. 路由状态与 Pinia 标签状态深度双向联动。
  ========================================================================
-->
<template>
    <el-aside
        :style="{ width: isCollapse ? '64px' : '210px' }"
        class="layout-sidebar-container"
    >
        <!-- 1. 顶部品牌 Logo 栏 -->
        <Logo :is-collapse="isCollapse" />

        <!-- 2. 菜单滚动容器 -->
        <el-scrollbar class="sidebar-scrollbar">
            <el-menu
                router
                :default-active="activeMenu"
                :collapse="isCollapse"
                :collapse-transition="false"
                class="sidebar-menu-el"
                @select="handleMenuSelect"
            >
                <SidebarItem
                    v-for="(item, index) in menuList"
                    :key="item.id || item.url || index"
                    :item="item"
                />
            </el-menu>
        </el-scrollbar>
    </el-aside>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Logo from './Logo.vue';
import SidebarItem from './SidebarItem.vue';
import menuStore from '@/stortes/menu';

const props = defineProps({
    isCollapse: {
        type: Boolean,
        default: false,
    },
    menuList: {
        type: Array,
        default: () => [],
    },
});

const route = useRoute();
const menuInfoStore = menuStore();

// 当前激活的菜单项 (匹配当前路由完整路径)
const activeMenu = computed(() => {
    return route.fullPath;
});

// 菜单选择事件，同步更新 Pinia 标签页
const handleMenuSelect = (key) => {
    if (key) {
        menuInfoStore.changeTabsValue(key);
        const node = findNodeByUrl(props.menuList, key);
        if (node) {
            menuInfoStore.changeMenu(node);
        }
    }
};

/**
 * 递归从树形菜单中查找当前选中的节点对象
 */
const findNodeByUrl = (tree, targetUrl) => {
    if (!Array.isArray(tree)) return null;
    for (const node of tree) {
        if (node.url === targetUrl) {
            return node;
        }
        if (node.children && node.children.length > 0) {
            const found = findNodeByUrl(node.children, targetUrl);
            if (found) return found;
        }
    }
    return null;
};
</script>

<style scoped>
.layout-sidebar-container {
    height: 100vh;
    background: var(--el-bg-color);
    border-right: 1px solid var(--el-border-color-lighter);
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 100;
}

.sidebar-scrollbar {
    flex: 1;
    height: calc(100vh - 52px);
}

.sidebar-menu-el {
    border-right: none !important;
    background: transparent;
}

/* 菜单项激活高亮风格 */
:deep(.el-menu-item.is-active) {
    background-color: var(--el-color-primary-light-9) !important;
    color: var(--el-color-primary) !important;
    font-weight: 600;
    border-right: 3px solid var(--el-color-primary);
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
    background-color: var(--el-fill-color-light) !important;
}
</style>
