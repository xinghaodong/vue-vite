<!-- 
  ========================================================================
  文件名称: index.vue
  所属模块: 系统偏好设置抽屉 (src/layout/components/SettingDrawer)
  功能说明:
    1. 大厂 macOS / Arco Pro 高级控制中心设计：
       - 4 大布局微缩立体骨架卡片 (选中有柔和品牌色外发光光晕与精致角标)；
       - iOS 风格卡片式功能群组 (消除粗笨分割线，带微图标与轻量内边距)；
       - 消除 el-select，全面采用 el-segmented 滑动分段胶囊选择器；
    2. 100% 遵循黑白主题 Design Tokens 自适应体系，彻底消除写死 Hex；
    3. 底部出厂重置采用克制优雅的极简按钮与气泡防误触确认。
  ========================================================================
-->
<template>
    <el-drawer
        v-model="layoutStore.settingDrawerVisible"
        size="360px"
        direction="rtl"
        :append-to-body="true"
        class="system-setting-drawer"
        custom-class="system-setting-drawer"
        :show-close="true"
    >
        <!-- 1. 自定义抽屉 Header -->
        <template #header>
            <div class="setting-drawer-header">
                <div class="header-title-row">
                    <div class="header-icon-badge">
                        <el-icon :size="16"><Setting /></el-icon>
                    </div>
                    <span class="header-title-text">系统偏好设置</span>
                </div>
                <div class="header-subtitle-text">实时配置 · 自动同步至当前账号</div>
            </div>
        </template>

        <div class="setting-drawer-body">
            <!-- 2. 布局模式架构选择器 (立体微缩骨架) -->
            <div class="setting-block">
                <div class="block-title-row">
                    <span class="block-title">布局架构</span>
                    <span class="block-tag">{{ currentLayoutLabel }}</span>
                </div>

                <div class="layout-mode-grid">
                    <!-- 纵向经典模式 -->
                    <div
                        class="layout-card"
                        :class="{ 'is-active': layoutStore.layoutMode === 'vertical' }"
                        @click="handleSelectLayout('vertical')"
                    >
                        <div class="mock-viewport mock-vertical">
                            <div class="mock-sidebar"></div>
                            <div class="mock-right-box">
                                <div class="mock-header"></div>
                                <div class="mock-content"></div>
                            </div>
                        </div>
                        <span class="layout-name">纵向经典</span>
                        <div v-if="layoutStore.layoutMode === 'vertical'" class="active-badge">
                            <el-icon :size="10"><Check /></el-icon>
                        </div>
                    </div>

                    <!-- 分栏双列模式 -->
                    <div
                        class="layout-card"
                        :class="{ 'is-active': layoutStore.layoutMode === 'columns' }"
                        @click="handleSelectLayout('columns')"
                    >
                        <div class="mock-viewport mock-columns">
                            <div class="mock-first-col"></div>
                            <div class="mock-sub-col"></div>
                            <div class="mock-right-box">
                                <div class="mock-header"></div>
                                <div class="mock-content"></div>
                            </div>
                        </div>
                        <span class="layout-name">分栏双列</span>
                        <div v-if="layoutStore.layoutMode === 'columns'" class="active-badge">
                            <el-icon :size="10"><Check /></el-icon>
                        </div>
                    </div>

                    <!-- 横向通栏模式 -->
                    <div
                        class="layout-card"
                        :class="{ 'is-active': layoutStore.layoutMode === 'horizontal' }"
                        @click="handleSelectLayout('horizontal')"
                    >
                        <div class="mock-viewport mock-horizontal">
                            <div class="mock-header"></div>
                            <div class="mock-content"></div>
                        </div>
                        <span class="layout-name">横向通栏</span>
                        <div v-if="layoutStore.layoutMode === 'horizontal'" class="active-badge">
                            <el-icon :size="10"><Check /></el-icon>
                        </div>
                    </div>

                    <!-- 综合混合模式 -->
                    <div
                        class="layout-card"
                        :class="{ 'is-active': layoutStore.layoutMode === 'mixed' }"
                        @click="handleSelectLayout('mixed')"
                    >
                        <div class="mock-viewport mock-mixed">
                            <div class="mock-header"></div>
                            <div class="mock-body">
                                <div class="mock-sidebar"></div>
                                <div class="mock-content"></div>
                            </div>
                        </div>
                        <span class="layout-name">综合混合</span>
                        <div v-if="layoutStore.layoutMode === 'mixed'" class="active-badge">
                            <el-icon :size="10"><Check /></el-icon>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2.5 系统品牌主题色 -->
            <div class="setting-block">
                <div class="block-title-row">
                    <span class="block-title">系统主题色</span>
                    <div class="theme-color-extra">
                        <span class="color-hex-tag">{{ layoutStore.primaryColor }}</span>
                        <!-- 自定义取色器 -->
                        <el-color-picker
                            :model-value="layoutStore.primaryColor"
                            size="small"
                            :show-alpha="false"
                            :predefine="presetThemeColors.map(c => c.color)"
                            @change="handleCustomColorChange"
                        />
                    </div>
                </div>

                <div class="theme-color-palette">
                    <div
                        v-for="item in presetThemeColors"
                        :key="item.color"
                        class="theme-color-item"
                        :class="{ 'is-active': isCurrentColor(item.color) }"
                        :style="{ backgroundColor: item.color }"
                        :title="item.name"
                        @click="handleSelectColor(item.color)"
                    >
                        <el-icon v-if="isCurrentColor(item.color)" :size="13" class="color-check-icon">
                            <Check />
                        </el-icon>
                    </div>
                </div>
            </div>

            <!-- 3. 界面功能开关组 (iOS/macOS 圆角卡片面板) -->
            <div class="setting-block">
                <div class="block-title-row">
                    <span class="block-title">界面功能</span>
                </div>

                <div class="card-group-panel">
                    <!-- 折叠侧边栏 -->
                    <div class="setting-row">
                        <div class="row-left">
                            <el-icon class="row-icon"><Fold /></el-icon>
                            <span class="row-label">折叠侧边栏</span>
                        </div>
                        <el-switch
                            :model-value="layoutStore.isCurrentSidebarCollapsed"
                            :disabled="layoutStore.layoutMode === 'horizontal'"
                            size="small"
                            @update:model-value="layoutStore.toggleCollapse"
                        />
                    </div>

                    <!-- 多标签栏 -->
                    <div class="setting-row">
                        <div class="row-left">
                            <el-icon class="row-icon"><Collection /></el-icon>
                            <span class="row-label">多标签页 (TagsView)</span>
                        </div>
                        <el-switch
                            :model-value="layoutStore.showTabs"
                            size="small"
                            @update:model-value="(val) => layoutStore.updateSettings({ showTabs: val })"
                        />
                    </div>

                    <!-- 标签页图标 (联动) -->
                    <transition name="row-fade">
                        <div v-if="layoutStore.showTabs" class="setting-row sub-row">
                            <div class="row-left">
                                <el-icon class="row-icon"><PictureFilled /></el-icon>
                                <span class="row-label">标签页小图标</span>
                            </div>
                            <el-switch
                                :model-value="layoutStore.showTabsIcon"
                                size="small"
                                @update:model-value="(val) => layoutStore.updateSettings({ showTabsIcon: val })"
                            />
                        </div>
                    </transition>

                    <!-- 面包屑导航 -->
                    <div class="setting-row">
                        <div class="row-left">
                            <el-icon class="row-icon"><Guide /></el-icon>
                            <span class="row-label">面包屑导航</span>
                        </div>
                        <el-switch
                            :model-value="layoutStore.showBreadcrumb"
                            size="small"
                            @update:model-value="(val) => layoutStore.updateSettings({ showBreadcrumb: val })"
                        />
                    </div>

                    <!-- 面包屑图标 (联动) -->
                    <transition name="row-fade">
                        <div v-if="layoutStore.showBreadcrumb" class="setting-row sub-row">
                            <div class="row-left">
                                <el-icon class="row-icon"><Compass /></el-icon>
                                <span class="row-label">面包屑小图标</span>
                            </div>
                            <el-switch
                                :model-value="layoutStore.showBreadcrumbIcon"
                                size="small"
                                @update:model-value="(val) => layoutStore.updateSettings({ showBreadcrumbIcon: val })"
                            />
                        </div>
                    </transition>
                </div>
            </div>

            <!-- 4. 视觉风格与页面动效 (Segmented 分段器，彻底干掉 el-select) -->
            <div class="setting-block">
                <div class="block-title-row">
                    <span class="block-title">视觉与动效</span>
                </div>

                <div class="card-group-panel controls-group">
                    <!-- 标签页风格 -->
                    <div class="segmented-control-item">
                        <div class="segmented-label-row">
                            <div class="row-left">
                                <el-icon class="row-icon"><Management /></el-icon>
                                <span class="row-label">标签页风格</span>
                            </div>
                        </div>
                        <el-segmented
                            v-model="layoutStore.tabsStyle"
                            :options="tabsStyleOptions"
                            block
                            size="small"
                            class="custom-segmented"
                            @change="(val) => layoutStore.updateSettings({ tabsStyle: val })"
                        />
                    </div>

                    <div class="group-divider"></div>

                    <!-- 路由转场动效 -->
                    <div class="segmented-control-item">
                        <div class="segmented-label-row">
                            <div class="row-left">
                                <el-icon class="row-icon"><MagicStick /></el-icon>
                                <span class="row-label">页面转场动画</span>
                            </div>
                        </div>
                        <el-segmented
                            v-model="layoutStore.pageTransition"
                            :options="pageTransitionOptions"
                            block
                            size="small"
                            class="custom-segmented"
                            @change="(val) => layoutStore.updateSettings({ pageTransition: val })"
                        />
                    </div>

                    <div class="group-divider"></div>

                    <!-- 全局组件尺寸 -->
                    <div class="segmented-control-item">
                        <div class="segmented-label-row">
                            <div class="row-left">
                                <el-icon class="row-icon"><SetUp /></el-icon>
                                <span class="row-label">全局组件尺寸</span>
                            </div>
                        </div>
                        <el-segmented
                            v-model="layoutStore.componentSize"
                            :options="componentSizeOptions"
                            block
                            size="small"
                            class="custom-segmented"
                            @change="(val) => layoutStore.setComponentSize(val)"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- 5. 底部操作区 (克制优雅出厂重置) -->
        <template #footer>
            <div class="setting-drawer-footer">
                <el-popconfirm
                    title="确定恢复出厂默认配置吗？"
                    confirm-button-text="确定重置"
                    cancel-button-text="取消"
                    confirm-button-type="danger"
                    @confirm="handleReset"
                >
                    <template #reference>
                        <el-button class="reset-action-btn" plain>
                            <el-icon :size="14" class="btn-icon"><RefreshLeft /></el-icon>
                            <span>恢复出厂设置</span>
                        </el-button>
                    </template>
                </el-popconfirm>
            </div>
        </template>
    </el-drawer>
</template>

<script setup>
import { computed } from 'vue';
import {
    Setting,
    Check,
    RefreshLeft,
    Fold,
    Collection,
    PictureFilled,
    Guide,
    Compass,
    Management,
    MagicStick,
    SetUp,
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import useLayoutStore from '@/stores/layout.js';

const layoutStore = useLayoutStore();

// 标签页风格分段选项
const tabsStyleOptions = [
    { label: '圆角卡片', value: 'card' },
    { label: '胶囊风格', value: 'capsule' },
    { label: '极简无框', value: 'plain' },
];

// 路由转场动效分段选项
const pageTransitionOptions = [
    { label: '无动效', value: 'none' },
    { label: '平滑淡入', value: 'fade' },
    { label: '滑动缩放', value: 'fade-transform' },
];

// 全局组件尺寸分段选项
const componentSizeOptions = [
    { label: '紧凑 (小)', value: 'small' },
    { label: '默认 (中)', value: 'default' },
    { label: '宽松 (大)', value: 'large' },
];

// 当前布局中文描述
const currentLayoutLabel = computed(() => {
    const map = {
        vertical: '纵向经典',
        columns: '分栏双列',
        horizontal: '横向通栏',
        mixed: '综合混合',
    };
    return map[layoutStore.layoutMode] || '纵向经典';
});

// 经典大厂系统品牌主题色预设
const presetThemeColors = [
    { name: '极客蔚蓝 (默认)', color: '#409EFF' },
    { name: '翡翠生机', color: '#00B96B' },
    { name: '极光科技', color: '#722ED1' },
    { name: '活力暖阳', color: '#FA8C16' },
    { name: '珊瑚粉红', color: '#EB2F96' },
    { name: '极客天青', color: '#13C2C2' },
    { name: '商务深蓝', color: '#165DFF' },
    { name: '玄武深灰', color: '#475569' },
];

// 判断是否为当前选中主题色
const isCurrentColor = (color) => {
    return (layoutStore.primaryColor || '').toLowerCase() === color.toLowerCase();
};

// 选择预设主题色
const handleSelectColor = (color) => {
    layoutStore.setPrimaryColor(color);
};

// 自定义取色器修改颜色
const handleCustomColorChange = (color) => {
    if (color) {
        layoutStore.setPrimaryColor(color);
    }
};

// 选择布局模式
const handleSelectLayout = (mode) => {
    layoutStore.setLayoutMode(mode);
};

// 恢复出厂设置
const handleReset = () => {
    layoutStore.resetSettings();
    ElMessage.success('已恢复系统默认设置');
};
</script>

<style scoped>
/* 1. 抽屉 Header 与整体边距规范 */
:deep(.el-drawer__header) {
    padding: 18px 20px 14px 20px !important;
    margin-bottom: 0 !important;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-drawer__body) {
    padding: 0 !important;
}

:deep(.el-drawer__footer) {
    padding: 14px 20px 16px 20px !important;
    border-top: 1px solid var(--el-border-color-lighter);
}

.setting-drawer-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.header-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.header-icon-badge {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
}

.header-title-text {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.header-subtitle-text {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    padding-left: 34px;
}

/* 2. 抽屉内容区 (规范 20px 左右呼吸感边距) */
.setting-drawer-body {
    padding: 16px 20px 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    box-sizing: border-box;
}

.setting-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.block-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px;
}

.block-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    letter-spacing: 0.2px;
}

.block-tag {
    font-size: 11px;
    font-weight: 500;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    padding: 2px 8px;
    border-radius: 4px;
}

/* 3. 布局模式微缩卡片矩阵 */
.layout-mode-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.layout-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 8px 8px 8px;
    background: var(--el-fill-color-blank);
    border: 1.5px solid var(--el-border-color-lighter);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.layout-card:hover {
    border-color: var(--el-border-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.layout-card.is-active {
    border-color: var(--el-color-primary);
    background: var(--el-fill-color-blank);
    box-shadow: 0 0 0 1px var(--el-color-primary), 0 4px 14px rgba(64, 158, 255, 0.16);
}

.layout-name {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-regular);
    font-weight: 500;
}

.layout-card.is-active .layout-name {
    color: var(--el-color-primary);
    font-weight: 600;
}

.active-badge {
    position: absolute;
    top: -1px;
    right: -1px;
    width: 18px;
    height: 18px;
    background: var(--el-color-primary);
    border-radius: 0 8px 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
}

/* 微缩视口 (68px * 48px) - 纯 CSS Design Tokens 自适应黑白主题 */
.mock-viewport {
    width: 68px;
    height: 48px;
    background: var(--el-fill-color);
    border-radius: 5px;
    overflow: hidden;
    display: flex;
    border: 1px solid var(--el-border-color-lighter);
    box-sizing: border-box;
}

/* 纵向模式微缩 */
.mock-vertical .mock-sidebar {
    width: 16px;
    background: var(--el-fill-color-darker);
    border-right: 1px solid var(--el-border-color-extra-light);
}
.mock-vertical .mock-right-box {
    flex: 1;
    display: flex;
    flex-direction: column;
}
.mock-vertical .mock-header {
    height: 10px;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-extra-light);
}
.mock-vertical .mock-content {
    flex: 1;
    background: var(--el-fill-color-light);
}

/* 分栏模式微缩 */
.mock-columns .mock-first-col {
    width: 10px;
    background: var(--el-text-color-primary);
}
.mock-columns .mock-sub-col {
    width: 12px;
    background: var(--el-fill-color-darker);
    border-right: 1px solid var(--el-border-color-extra-light);
}
.mock-columns .mock-right-box {
    flex: 1;
    display: flex;
    flex-direction: column;
}
.mock-columns .mock-header {
    height: 10px;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-extra-light);
}
.mock-columns .mock-content {
    flex: 1;
    background: var(--el-fill-color-light);
}

/* 横向模式微缩 */
.mock-horizontal {
    flex-direction: column;
}
.mock-horizontal .mock-header {
    height: 12px;
    background: var(--el-text-color-primary);
}
.mock-horizontal .mock-content {
    flex: 1;
    background: var(--el-fill-color-light);
}

/* 综合混合模式微缩 */
.mock-mixed {
    flex-direction: column;
}
.mock-mixed .mock-header {
    height: 10px;
    background: var(--el-text-color-primary);
}
.mock-mixed .mock-body {
    flex: 1;
    display: flex;
}
.mock-mixed .mock-sidebar {
    width: 14px;
    background: var(--el-fill-color-darker);
    border-right: 1px solid var(--el-border-color-extra-light);
}
.mock-mixed .mock-content {
    flex: 1;
    background: var(--el-fill-color-light);
}

/* 4. iOS / macOS 卡片群组面板 */
.card-group-panel {
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    padding: 4px 12px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--el-border-color-extra-light);
}

.setting-row:last-child {
    border-bottom: none;
}

.setting-row.sub-row {
    padding-left: 14px;
    background: var(--el-fill-color-lighter);
    margin: 0 -12px;
    padding-right: 12px;
    border-radius: 6px;
}

.row-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.row-icon {
    font-size: 15px;
    color: var(--el-text-color-secondary);
}

.row-label {
    font-size: 13px;
    color: var(--el-text-color-regular);
}

.row-fade-enter-active,
.row-fade-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}

.row-fade-enter-from,
.row-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

/* 5. 分段选择器控件组 */
.controls-group {
    padding: 12px;
    gap: 12px;
}

.segmented-control-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.segmented-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.custom-segmented {
    --el-segmented-bg-color: var(--el-fill-color);
    --el-segmented-item-selected-bg-color: var(--el-bg-color);
    --el-segmented-item-selected-color: var(--el-color-primary);
    padding: 3px !important;
    border-radius: 8px !important;
}

.group-divider {
    height: 1px;
    background: var(--el-border-color-extra-light);
    margin: 2px 0;
}

/* 6. 底部重置按钮 */
.setting-drawer-footer {
    padding: 6px 4px 4px 4px;
}

.reset-action-btn {
    width: 100%;
    height: 38px;
    border-radius: 8px;
    border: 1px solid var(--el-border-color-lighter) !important;
    background: var(--el-fill-color-blank) !important;
    color: var(--el-text-color-regular) !important;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s ease;
}

.reset-action-btn:hover {
    color: var(--el-color-danger) !important;
    border-color: var(--el-color-danger-light-7) !important;
    background: var(--el-color-danger-light-9) !important;
}

.btn-icon {
    margin-right: 6px;
    transition: transform 0.3s ease;
}

.reset-action-btn:hover .btn-icon {
    transform: rotate(-90deg);
}

/* 7. 系统品牌主题色调色盘 */
.theme-color-extra {
    display: flex;
    align-items: center;
    gap: 8px;
}

.color-hex-tag {
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-weight: 600;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    padding: 1px 6px;
    border-radius: 4px;
    letter-spacing: 0.5px;
    border: 1px solid var(--el-color-primary-light-8);
}

:deep(.el-color-picker--small) {
    height: 24px;
}

:deep(.el-color-picker--small .el-color-picker__trigger) {
    width: 24px;
    height: 24px;
    padding: 2px;
    border-radius: 6px;
    border: 1px solid var(--el-border-color-lighter);
}

.theme-color-palette {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 8px;
    padding: 12px;
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.theme-color-item {
    aspect-ratio: 1;
    width: 100%;
    max-width: 32px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.theme-color-item:hover {
    transform: translateY(-2px) scale(1.08);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.18);
}

.theme-color-item.is-active {
    transform: scale(1.1);
    box-shadow: 0 0 0 2px var(--el-bg-color), 0 0 0 4px var(--el-color-primary);
}

.color-check-icon {
    color: #ffffff;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}
</style>
