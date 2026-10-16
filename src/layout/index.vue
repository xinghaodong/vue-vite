<!-- 
  ========================================================================
  文件名称: index.vue
  所属模块: 布局系统总装配调度中枢 (src/layout/index.vue)
  功能说明:
    1. 策略模式解耦四大布局引擎 (vertical / columns / horizontal / mixed)；
    2. 监听 useLayoutStore 的 layoutMode 动态瞬时切换装配，零闪烁、零冗余 CSS 冲突；
    3. 全局统一挂载 SettingDrawer 设置抽屉、View Transitions 主题与实景三维后台单例。
  ========================================================================
-->
<template>
    <div class="layout-app-root">
        <!-- 1. 动态装配当前激活的布局引擎 -->
        <component :is="currentLayoutComponent" />

        <!-- 2. 全局唯一系统偏好设置抽屉 -->
        <SettingDrawer />
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import LayoutVertical from './modes/LayoutVertical.vue';
import LayoutColumns from './modes/LayoutColumns.vue';
import LayoutHorizontal from './modes/LayoutHorizontal.vue';
import LayoutMixed from './modes/LayoutMixed.vue';
import SettingDrawer from './components/SettingDrawer/index.vue';
import useLayoutStore from '@/stores/layout.js';
import { initTheme } from '@/composables/useTheme';
import { useReconstructionStream } from '@/composables/useReconstructionStream';

const layoutStore = useLayoutStore();

// 四大布局策略映射字典
const layoutModeMap = {
    vertical: LayoutVertical,
    columns: LayoutColumns,
    horizontal: LayoutHorizontal,
    mixed: LayoutMixed,
};

// 当前激活的布局组件
const currentLayoutComponent = computed(() => {
    return layoutModeMap[layoutStore.layoutMode] || LayoutVertical;
});

// 实景三维建模全局按需单例
const { checkBackgroundTasks } = useReconstructionStream();

onMounted(() => {
    // 确保暗黑模式初始类名正确同步
    initTheme();
    // 检查后台是否有进行中的实景三维建模任务
    checkBackgroundTasks();
});
</script>

<style scoped>
.layout-app-root {
    width: 100%;
    height: 100vh;
    overflow: hidden;
    position: relative;
}
</style>
