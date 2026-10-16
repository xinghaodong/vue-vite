<!-- 
  ========================================================================
  文件名称: index.vue
  所属模块: 顶栏系统 (src/layout/components/Header)
  功能说明:
    现代化后台顶栏容器总控：
    1. 左侧：侧边栏折叠/展开控制器 + 动态面包屑导航；
    2. 右侧：全屏切换、View Transitions 暗黑模式扩散切换、用户中心；
    3. 标准 50px 高度，彻底解决原先 90px 硬编码与内边距混乱问题。
  ========================================================================
-->
<template>
    <el-header class="layout-header-container">
        <!-- 1. 左侧：折叠按钮 + 面包屑导航 -->
        <div class="header-left">
            <div
                class="collapse-trigger-btn"
                :class="{ 'is-collapsed': isCollapse }"
                @click="$emit('toggle-collapse')"
            >
                <el-icon :size="20"><Fold /></el-icon>
            </div>
            <Breadcrumb v-if="showBreadcrumb" />
        </div>

        <!-- 2. 右侧：功能操作集与用户中心 -->
        <div class="header-right">
            <HeaderActions />
        </div>
    </el-header>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { Fold } from '@element-plus/icons-vue';
import Breadcrumb from './Breadcrumb.vue';
import HeaderActions from './HeaderActions.vue';
import useLayoutStore from '@/stores/layout';

const layoutStore = useLayoutStore();
const { showBreadcrumb } = storeToRefs(layoutStore);

defineProps({
    isCollapse: {
        type: Boolean,
        default: false,
    },
});

defineEmits(['toggle-collapse']);
</script>

<style scoped>
.layout-header-container {
    height: 50px !important;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    box-sizing: border-box;
    transition: background-color 0.3s ease;
}

.header-left {
    display: flex;
    align-items: center;
    height: 100%;
}

.collapse-trigger-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    color: var(--el-text-color-primary);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.collapse-trigger-btn:hover {
    background: var(--el-fill-color-light);
    color: var(--el-color-primary);
}

.collapse-trigger-btn.is-collapsed {
    transform: rotate(180deg);
}

.header-right {
    display: flex;
    align-items: center;
    height: 100%;
}
</style>
