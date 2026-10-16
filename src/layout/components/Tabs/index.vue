<!-- 
  ========================================================================
  文件名称: index.vue
  所属模块: 标签页导航系统 (src/layout/components/Tabs)
  功能说明:
    现代化后台多标签栏 (TagsView) 核心组件：
    1. 动态同步 Pinia 活跃标签列表，支持首页常驻且不可关闭；
    2. 右侧快捷“更多操作”菜单与右键快捷菜单双重保障；
    3. 支持无感局部刷新 (Refresh)、关闭当前、关闭左侧、关闭右侧、关闭其他、全部关闭；
    4. 彻底消除原先手写原生绝对定位浮层导致的边缘溢出与样式破碎缺陷。
  ========================================================================
-->
<template>
    <div class="layout-tabs-container">
        <!-- 1. 标签页主体 -->
        <div class="tabs-scroll-wrapper">
            <el-tabs
                v-model="editableTabsValue"
                type="card"
                class="modern-el-tabs"
                @tab-click="handleTabClick"
                @tab-remove="handleTabRemove"
                @contextmenu.prevent="handleContextMenu($event)"
            >
                <el-tab-pane
                    v-for="(item, index) in activeTabArray"
                    :key="item.url"
                    :label="item.name"
                    :name="item.url"
                    :closable="item.url !== '/index' && index !== 0"
                />
            </el-tabs>
        </div>

        <!-- 2. 右侧操作集合栏：刷新当前页与批量关闭下拉 -->
        <div class="tabs-right-actions">
            <!-- 快捷刷新按钮 -->
            <el-tooltip content="刷新当前页" placement="bottom">
                <div class="tab-action-icon-btn" @click="$emit('refresh-route')">
                    <el-icon :size="15"><RefreshRight /></el-icon>
                </div>
            </el-tooltip>

            <!-- 批量关闭下拉菜单 -->
            <el-dropdown trigger="click" placement="bottom-end" @command="handleCommand">
                <div class="tab-action-icon-btn more-btn">
                    <el-icon :size="14"><ArrowDown /></el-icon>
                </div>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item command="refresh">
                            <el-icon><Refresh /></el-icon>刷新当前
                        </el-dropdown-item>
                        <el-dropdown-item command="closeCurrent" :disabled="editableTabsValue === '/index'">
                            <el-icon><Close /></el-icon>关闭当前
                        </el-dropdown-item>
                        <el-dropdown-item command="closeOther">
                            <el-icon><CircleClose /></el-icon>关闭其他
                        </el-dropdown-item>
                        <el-dropdown-item command="closeLeft" :disabled="!canCloseLeft">
                            <el-icon><Back /></el-icon>关闭左侧
                        </el-dropdown-item>
                        <el-dropdown-item command="closeRight" :disabled="!canCloseRight">
                            <el-icon><Right /></el-icon>关闭右侧
                        </el-dropdown-item>
                        <el-dropdown-item command="closeAll" divided>
                            <el-icon><FolderDelete /></el-icon>全部关闭
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>

        <!-- 3. 右键菜单 (使用精准边界计算的平滑浮层) -->
        <transition name="context-menu-fade">
            <ul
                v-if="contextMenuVisible"
                :style="{ left: menuLeft + 'px', top: menuTop + 'px' }"
                class="tabs-contextmenu"
            >
                <li @click="handleCommand('refresh')">
                    <el-icon><Refresh /></el-icon>刷新
                </li>
                <li v-if="targetTab !== '/index'" @click="handleCommand('closeTarget')">
                    <el-icon><Close /></el-icon>关闭
                </li>
                <li v-if="canCloseLeft" @click="handleCommand('closeLeft')">
                    <el-icon><Back /></el-icon>关闭左侧
                </li>
                <li v-if="canCloseRight" @click="handleCommand('closeRight')">
                    <el-icon><Right /></el-icon>关闭右侧
                </li>
                <li @click="handleCommand('closeOther')">
                    <el-icon><CircleClose /></el-icon>关闭其他
                </li>
                <li @click="handleCommand('closeAll')">
                    <el-icon><FolderDelete /></el-icon>全部关闭
                </li>
            </ul>
        </transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import {
    RefreshRight,
    ArrowDown,
    Refresh,
    Close,
    CircleClose,
    Back,
    Right,
    FolderDelete,
} from '@element-plus/icons-vue';
import menuStore from '@/stores/menu';

const emit = defineEmits(['refresh-route']);

const router = useRouter();
const menuInfoStore = menuStore();
const { activeTabArray, editableTabsValue } = storeToRefs(menuInfoStore);

// 右键菜单状态
const contextMenuVisible = ref(false);
const menuLeft = ref(0);
const menuTop = ref(0);
const targetTab = ref('');

// 计算当前右键目标或当前活跃项是否能关闭左/右侧
const currentIndex = computed(() => {
    const key = targetTab.value || editableTabsValue.value;
    return activeTabArray.value.findIndex(item => item.url === key);
});

const canCloseLeft = computed(() => {
    return currentIndex.value > 1; // 0 是首页不可关，至少大于 1 才能关左侧
});

const canCloseRight = computed(() => {
    return currentIndex.value >= 0 && currentIndex.value < activeTabArray.value.length - 1;
});

// 点击标签页跳转
const handleTabClick = (pane) => {
    if (pane.paneName && pane.paneName !== router.currentRoute.value.fullPath) {
        router.push(pane.paneName);
    }
};

// 移除单个标签
const handleTabRemove = (targetUrl) => {
    menuInfoStore.changeRemoveTab(targetUrl);
    nextTick(() => {
        router.push(editableTabsValue.value);
    });
};

// 触发右键菜单
const handleContextMenu = (e) => {
    const tabEl = e.target.closest('.el-tabs__item');
    if (!tabEl) return;

    // 解析当前被右键点击的 tab key (形如 tab-/index)
    const rawId = tabEl.id || '';
    const clickedUrl = rawId.replace(/^tab-/, '');
    if (!clickedUrl) return;

    targetTab.value = clickedUrl;
    
    // 安全边界计算，防止溢出屏幕右下角
    const x = e.clientX;
    const y = e.clientY;
    menuLeft.value = Math.min(x, window.innerWidth - 150);
    menuTop.value = Math.min(y, window.innerHeight - 200);
    contextMenuVisible.value = true;
};

// 全局点击自动关闭右键菜单
const closeContextMenu = () => {
    contextMenuVisible.value = false;
};

// 集中处理所有操作指令
const handleCommand = (command) => {
    const key = targetTab.value || editableTabsValue.value;

    switch (command) {
        case 'refresh':
            emit('refresh-route');
            break;
        case 'closeCurrent':
        case 'closeTarget':
            handleTabRemove(key);
            break;
        case 'closeLeft':
            menuInfoStore.changeRemoveLeftAll(key);
            nextTick(() => router.push(editableTabsValue.value));
            break;
        case 'closeRight':
            menuInfoStore.changeRemoveRightAll(key);
            nextTick(() => router.push(editableTabsValue.value));
            break;
        case 'closeOther':
            menuInfoStore.changeRemoveOtherAll(key);
            nextTick(() => router.push(editableTabsValue.value));
            break;
        case 'closeAll':
            menuInfoStore.changeRemoveAll(key);
            nextTick(() => router.push(editableTabsValue.value));
            break;
    }

    contextMenuVisible.value = false;
};

onMounted(() => {
    document.addEventListener('click', closeContextMenu);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', closeContextMenu);
});
</script>

<style scoped>
.layout-tabs-container {
    height: 38px;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    box-sizing: border-box;
    position: relative;
    user-select: none;
}

.tabs-scroll-wrapper {
    flex: 1;
    overflow: hidden;
    height: 100%;
}

.modern-el-tabs {
    border: none !important;
    height: 100%;
}

/* 覆盖 Element Plus 卡片标签样式，打造成熟现代扁平风格 */
:deep(.el-tabs__header) {
    margin: 0 !important;
    border-bottom: none !important;
    height: 100%;
}

:deep(.el-tabs__nav) {
    border: none !important;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 4px;
}

:deep(.el-tabs__item) {
    height: 28px !important;
    line-height: 26px !important;
    font-size: 13px !important;
    color: var(--el-text-color-regular) !important;
    background: var(--el-fill-color-light) !important;
    border: 1px solid var(--el-border-color-lighter) !important;
    border-radius: 4px !important;
    padding: 0 10px !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

:deep(.el-tabs__item:hover) {
    color: var(--el-color-primary) !important;
    background: var(--el-fill-color) !important;
}

:deep(.el-tabs__item.is-active) {
    color: #ffffff !important;
    background: var(--el-color-primary) !important;
    border-color: var(--el-color-primary) !important;
    font-weight: 500;
}

:deep(.el-tabs__item .is-icon-close) {
    font-size: 11px;
    margin-left: 6px;
    border-radius: 50%;
    transition: all 0.15s;
}

:deep(.el-tabs__item .is-icon-close:hover) {
    background-color: rgba(0, 0, 0, 0.2);
    color: #ffffff;
}

.tabs-right-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 10px;
}

.tab-action-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    transition: all 0.2s ease;
}

.tab-action-icon-btn:hover {
    color: var(--el-color-primary);
    background: var(--el-fill-color);
}

/* 右键菜单浮层 */
.tabs-contextmenu {
    position: fixed;
    z-index: 99999;
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    box-shadow: var(--el-box-shadow-light);
    padding: 4px 0;
    margin: 0;
    list-style: none;
    min-width: 120px;
}

.tabs-contextmenu li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    padding: 7px 14px;
    color: var(--el-text-color-regular);
    cursor: pointer;
    transition: background 0.15s ease;
}

.tabs-contextmenu li:hover {
    background: var(--el-fill-color-light);
    color: var(--el-color-primary);
}

.context-menu-fade-enter-active,
.context-menu-fade-leave-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.context-menu-fade-enter-from,
.context-menu-fade-leave-to {
    opacity: 0;
    transform: scale(0.95);
}
</style>
