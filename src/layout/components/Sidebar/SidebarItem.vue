<!-- 
  ========================================================================
  文件名称: SidebarItem.vue
  所属模块: 侧边栏系统 (src/layout/components/Sidebar)
  功能说明:
    递归菜单项组件：
    1. 支持无限层级树形菜单自解析；
    2. 优雅的图标映射与 Element Plus 图标动态挂载；
    3. 自适应折叠模式与暗黑模式。
  ========================================================================
-->
<template>
    <!-- 1. 存在子菜单的目录节点 -->
    <el-sub-menu v-if="hasChildren" :index="String(item.id || item.url)">
        <template #title>
            <el-icon v-if="item.icon || Folder">
                <component :is="item.icon || Folder" />
            </el-icon>
            <span class="menu-title-text">{{ item.name }}</span>
        </template>
        <!-- 递归渲染所有子级节点 -->
        <SidebarItem
            v-for="(child, idx) in item.children"
            :key="child.id || child.url || idx"
            :item="child"
        />
    </el-sub-menu>

    <!-- 2. 叶子节点 (普通可点击菜单路由) -->
    <el-menu-item v-else-if="item.url !== '/index'" :index="item.url">
        <el-icon v-if="item.icon || Document">
            <component :is="item.icon || Document" />
        </el-icon>
        <template #title>
            <span class="menu-title-text">{{ item.name }}</span>
        </template>
    </el-menu-item>
</template>

<script setup>
import { computed } from 'vue';
import { Document, Folder } from '@element-plus/icons-vue';

defineOptions({
    name: 'SidebarItem',
});

const props = defineProps({
    item: {
        type: Object,
        required: true,
    },
});

// 计算是否有有效子菜单
const hasChildren = computed(() => {
    return Array.isArray(props.item?.children) && props.item.children.length > 0;
});
</script>

<style scoped>
.menu-title-text {
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.2px;
}
</style>
