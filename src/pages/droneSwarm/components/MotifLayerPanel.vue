<template>
    <aside class="swarm-official-left-panel" :class="{ collapsed: isCollapsed }">
        <!-- 面板主顶部标题栏 -->
        <div class="panel-top-bar">
            <span v-show="!isCollapsed" class="panel-main-title">未命名 2D 工程</span>
            <button class="collapse-toggle-btn" @click="isCollapsed = !isCollapsed">
                <span>{{ isCollapsed ? '›' : '‹' }}</span>
            </button>
        </div>

        <div v-show="!isCollapsed" class="panel-body">
            <!-- ================= 1. 构型列表区块 ================= -->
            <div class="panel-section">
                <div class="section-header-bar">
                    <div class="header-left">
                        <span class="drag-dots">⋮⋮</span>
                        <span class="sec-title">阵型列表</span>
                        <button class="sec-link-btn" @click="emit('add-layer')">导入</button>
                    </div>
                    <div class="header-right-tools">
                        <button class="tool-icon-btn">—</button>
                        <button class="tool-icon-btn">⤢</button>
                    </div>
                </div>

                <!-- 本地 / 资产库 选项卡 -->
                <div class="source-segmented-tab">
                    <button class="source-tab-btn active">
                        <span class="icon-lock-small">🔒</span>
                        <span>本地</span>
                    </button>
                    <button class="source-tab-btn">
                        <span class="icon-grid-small">⊞</span>
                        <span>资产库</span>
                    </button>
                </div>

                <!-- 阵型图层列表树 -->
                <div class="layer-tree-container">
                    <div
                        v-for="layer in layers"
                        :key="layer.id"
                        class="layer-tree-card"
                        :class="{ active: selectedLayerId === layer.id }"
                        @click="selectLayer(layer.id)"
                    >
                        <div class="card-main-line">
                            <span class="color-badge" :style="{ backgroundColor: layer.color || '#00f2fe' }"></span>
                            <div class="layer-meta">
                                <span class="layer-name" :title="layer.name">{{ layer.name }}</span>
                                <span class="layer-sub-count">{{ layer.agentCount }} 架</span>
                            </div>
                            <div class="card-actions" @click.stop>
                                <button
                                    class="icon-btn"
                                    :class="{ muted: !layer.visible }"
                                    title="显示/隐藏"
                                    @click="toggleVisibility(layer)"
                                >
                                    {{ layer.visible ? '👁' : '⌀' }}
                                </button>
                                <button
                                    class="icon-btn"
                                    :class="{ locked: layer.locked }"
                                    title="锁定/解锁"
                                    @click="toggleLock(layer)"
                                >
                                    {{ layer.locked ? '🔒' : '🔓' }}
                                </button>
                            </div>
                        </div>

                        <!-- 选中展开 -->
                        <div v-if="selectedLayerId === layer.id" class="layer-quick-expand" @click.stop>
                            <div class="expand-row">
                                <span class="exp-label">主色</span>
                                <el-color-picker
                                    v-model="layer.color"
                                    size="small"
                                    :show-alpha="false"
                                    :disabled="layer.locked"
                                    @change="handleLayerColorChange(layer)"
                                />
                                <button
                                    class="text-danger-btn"
                                    :disabled="layer.locked"
                                    @click="emit('delete-layer', layer.id)"
                                >
                                    删除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ================= 2. 素材列表区块 (1:1 复刻截图) ================= -->
            <div class="panel-section material-section-wrap">
                <div class="section-header-bar">
                    <div class="header-left">
                        <span class="drag-dots">⋮⋮</span>
                        <span class="sec-title">素材列表</span>
                        <button class="sec-link-btn" @click="triggerUpload">导入</button>
                    </div>
                    <div class="header-right-tools">
                        <button class="tool-icon-btn">—</button>
                        <button class="tool-icon-btn">⤢</button>
                    </div>
                </div>

                <!-- 搜索素材输入框 -->
                <div class="material-search-row">
                    <input
                        type="text"
                        placeholder="搜索素材 / 引用 Motif..."
                        class="material-search-input"
                    />
                </div>

                <!-- 导入后树状展开结构 (对应截图 4、5 官方真实树) -->
                <div v-if="materials && materials.length > 0" class="material-tree-tree">
                    <!-- 父级文件夹节点 -->
                    <div class="folder-group-header" @click="isFolderExpanded = !isFolderExpanded">
                        <div class="group-left">
                            <span class="folder-arrow">{{ isFolderExpanded ? '▼' : '▶' }}</span>
                            <span class="folder-icon">📁</span>
                            <span class="folder-title" :title="primaryMaterial?.groupName || primaryMaterial?.name || '线稿素材组'">
                                {{ primaryMaterial?.groupName || primaryMaterial?.name || '线稿_1790074780864.p...' }}
                            </span>
                        </div>
                        <div class="group-right" @click.stop>
                            <button
                                class="icon-btn"
                                :class="{ muted: !isGroupVisible }"
                                @click="toggleGroupVisibility"
                            >
                                {{ isGroupVisible ? '👁' : '⌀' }}
                            </button>
                            <button
                                class="icon-btn"
                                :class="{ locked: isGroupLocked }"
                                @click="isGroupLocked = !isGroupLocked"
                            >
                                {{ isGroupLocked ? '🔒' : '🔓' }}
                            </button>
                        </div>
                    </div>

                    <!-- 子节点树列表 (原图、预处理图、中间图) -->
                    <div v-show="isFolderExpanded" class="material-sub-tree">
                        <div
                            v-for="(mat, idx) in materials"
                            :key="mat.id"
                            class="material-leaf-item"
                            :class="{ active: activeMaterialId === mat.id }"
                            @click="emit('select-material', mat.id)"
                        >
                            <div class="tree-branch-line"></div>
                            <!-- 棋盘格缩略图 -->
                            <div class="checkered-thumb-box">
                                <span class="thumb-mini"></span>
                            </div>
                            <span class="leaf-name">{{ mat.name }}</span>
                            <span class="leaf-badge">▶ +{{ idx + 1 }}</span>

                            <div class="leaf-actions" @click.stop>
                                <button
                                    class="icon-btn"
                                    :class="{ muted: !mat.visible }"
                                    title="显隐"
                                    @click="emit('toggle-material-visible', mat)"
                                >
                                    {{ mat.visible ? '👁' : '⌀' }}
                                </button>
                                <button
                                    class="icon-btn"
                                    :class="{ locked: mat.locked }"
                                    title="锁定"
                                    @click="emit('toggle-material-lock', mat)"
                                >
                                    {{ mat.locked ? '🔒' : '🔓' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 空素材状态: 官方 4 个大功能操作按钮 (对应截图 1) -->
                <div v-else class="empty-material-actions">
                    <button class="mat-action-btn" @click="triggerUpload">
                        <span class="btn-icon">⚡</span>
                        <span>从图片一键生成</span>
                    </button>
                    <button class="mat-action-btn primary-import" @click="triggerUpload">
                        <span class="btn-icon">🖼️</span>
                        <span>导入图片</span>
                    </button>
                    <button class="mat-action-btn" @click="triggerUpload">
                        <span class="btn-icon">☁️</span>
                        <span>导入云端素材</span>
                    </button>
                    <button class="mat-action-btn" @click="triggerUpload">
                        <span class="btn-icon">✨</span>
                        <span>AI 图像生成</span>
                    </button>
                </div>
            </div>
        </div>
    </aside>
</template>

<script setup>
/**
 * ========================================================================
 * 官方 SwarmStudio 1:1 左侧阵型与素材树面板
 * ========================================================================
 */
import { ref, computed } from 'vue';

const props = defineProps({
    layers: {
        type: Array,
        default: () => [],
    },
    selectedLayerId: {
        type: String,
        default: '',
    },
    maxDrones: {
        type: Number,
        default: 800,
    },
    materials: {
        type: Array,
        default: () => [],
    },
    activeMaterialId: {
        type: String,
        default: '',
    },
});

const emit = defineEmits([
    'select-layer',
    'update-layer',
    'add-layer',
    'delete-layer',
    'select-material',
    'toggle-material-visible',
    'toggle-material-lock',
    'update-material-opacity',
    'delete-material',
    'reopen-wizard',
    'trigger-import-click',
]);

const isCollapsed = ref(false);
const isFolderExpanded = ref(true);
const isGroupVisible = ref(true);
const isGroupLocked = ref(false);

const primaryMaterial = computed(() => {
    return props.materials && props.materials.length > 0 ? props.materials[0] : null;
});

function selectLayer(id) {
    emit('select-layer', id);
}

function toggleVisibility(layer) {
    layer.visible = !layer.visible;
    emit('update-layer', layer);
}

function toggleLock(layer) {
    layer.locked = !layer.locked;
    emit('update-layer', layer);
}

function handleLayerColorChange(layer) {
    emit('update-layer', layer);
}

function toggleGroupVisibility() {
    isGroupVisible.value = !isGroupVisible.value;
    props.materials.forEach((mat) => {
        mat.visible = isGroupVisible.value;
        emit('toggle-material-visible', mat);
    });
}

function triggerUpload() {
    // 触发全局隐藏的文件上传 input
    const fileInput = document.querySelector('.upload-btn input[type="file"]');
    if (fileInput) {
        fileInput.click();
    }
}
</script>

<style scoped>
/* 🌟 1:1 官方 SwarmStudio 深色左侧栏 (对标真机截图 1、2、4、5) */
.swarm-official-left-panel {
    width: 240px;
    flex: 0 0 240px;
    height: 100%;
    background: #181b20;
    border-right: 1px solid #282c35;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif;
    font-size: 12px;
    color: #e5e7eb;
    transition: width 0.25s ease, flex-basis 0.25s ease;
    z-index: 10;
}

.swarm-official-left-panel.collapsed {
    width: 36px;
    flex-basis: 36px;
}

/* 顶部标题栏: 未命名 2D 工程 */
.panel-top-bar {
    height: 38px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #262932;
    background: #14161a;
}

.panel-main-title {
    font-size: 12px;
    font-weight: 500;
    color: #f3f4f6;
}

.collapse-toggle-btn {
    background: transparent;
    border: none;
    color: #8c92a0;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
}

.collapse-toggle-btn:hover {
    color: #ffffff;
}

/* 面板主体内容 */
.panel-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.panel-section {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
}

/* 区域小标题栏 (阵型列表 / 素材列表) */
.section-header-bar {
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 6px;
}

.drag-dots {
    color: #555b68;
    font-size: 11px;
    letter-spacing: -1px;
}

.sec-title {
    font-size: 12px;
    font-weight: 500;
    color: #f3f4f6;
}

.sec-link-btn {
    background: transparent;
    border: none;
    color: #2f80ed;
    font-size: 11px;
    cursor: pointer;
    padding: 0 2px;
}

.header-right-tools {
    display: flex;
    align-items: center;
    gap: 6px;
}

.tool-icon-btn {
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 11px;
    padding: 0 2px;
}

.tool-icon-btn:hover {
    color: #ffffff;
}

/* 官方深色选项卡: [ 本地 ] [ 资产库 ] */
.source-segmented-tab {
    display: flex;
    background: #20232b;
    border: 1px solid #2c313c;
    border-radius: 4px;
    padding: 2px;
    margin: 6px 0 8px 0;
    gap: 2px;
}

.source-tab-btn {
    flex: 1;
    height: 26px;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: #8c92a0;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
}

.source-tab-btn.active {
    background: #2e333e;
    color: #ffffff;
    font-weight: 500;
}

/* 图层树容器 */
.layer-tree-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 180px;
    overflow-y: auto;
}

.layer-tree-card {
    background: #1e2128;
    border: 1px solid #292d37;
    border-radius: 4px;
    padding: 6px 8px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.layer-tree-card:hover {
    background: #232730;
    border-color: #353b47;
}

.layer-tree-card.active {
    background: #262a34;
    border-color: #2f80ed;
}

.card-main-line {
    display: flex;
    align-items: center;
    gap: 8px;
}

.color-badge {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
}

.layer-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.layer-name {
    font-size: 11px;
    color: #f3f4f6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.layer-sub-count {
    font-size: 10px;
    color: #6b7280;
    font-family: monospace;
}

.card-actions, .leaf-actions {
    display: flex;
    align-items: center;
    gap: 4px;
}

.icon-btn {
    background: transparent;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    font-size: 12px;
    padding: 0 2px;
}

.icon-btn.muted {
    opacity: 0.35;
}

.icon-btn.locked {
    color: #eab308;
}

.layer-quick-expand {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed #2d323e;
}

.expand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.exp-label {
    font-size: 10px;
    color: #8c92a0;
}

.text-danger-btn {
    background: transparent;
    border: none;
    color: #ef4444;
    font-size: 11px;
    cursor: pointer;
}

/* ================= 素材列表 ================= */
.material-section-wrap {
    flex: 1;
    min-height: 0;
    border-top: 1px solid #262932;
    display: flex;
    flex-direction: column;
}

.material-search-row {
    margin: 4px 0 8px 0;
}

.material-search-input {
    width: 100%;
    height: 26px;
    background: #20232b;
    border: 1px solid #2a2f3a;
    border-radius: 4px;
    padding: 0 8px;
    color: #f3f4f6;
    font-size: 11px;
    box-sizing: border-box;
}

.material-search-input::placeholder {
    color: #5c6270;
}

.material-search-input:focus {
    outline: none;
    border-color: #2f80ed;
}

/* 素材列表树状结构 (1:1 复刻截图 4、5) */
.material-tree-tree {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.folder-group-header {
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
    cursor: pointer;
    background: #1e2128;
    border-radius: 4px;
}

.folder-group-header:hover {
    background: #242831;
}

.group-left {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    flex: 1;
}

.folder-arrow {
    font-size: 9px;
    color: #8c92a0;
}

.folder-icon {
    font-size: 12px;
}

.folder-title {
    font-size: 11px;
    color: #f3f4f6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.material-sub-tree {
    display: flex;
    flex-direction: column;
    padding-left: 14px;
    margin-top: 2px;
    border-left: 1px solid #282c35;
    margin-left: 8px;
}

.material-leaf-item {
    height: 28px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 6px;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.15s;
}

.material-leaf-item:hover {
    background: #22262f;
}

.material-leaf-item.active {
    background: #272d38;
}

.checkered-thumb-box {
    width: 14px;
    height: 14px;
    background: #3b4252;
    border-radius: 2px;
    background-image: linear-gradient(45deg, #4c566a 25%, transparent 25%),
                      linear-gradient(-45deg, #4c566a 25%, transparent 25%);
    background-size: 6px 6px;
    flex-shrink: 0;
}

.leaf-name {
    font-size: 11px;
    color: #d1d5db;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.leaf-badge {
    font-size: 10px;
    color: #2f80ed;
    font-family: monospace;
}

/* 空素材操作按钮组 (对应截图 1 底部 4 个按钮) */
.empty-material-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: auto;
    padding-bottom: 8px;
}

.mat-action-btn {
    height: 32px;
    background: #20242c;
    border: 1px solid #2b303b;
    border-radius: 4px;
    color: #d1d5db;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.15s;
}

.mat-action-btn:hover {
    background: #282d37;
    border-color: #383f4d;
    color: #ffffff;
}

.mat-action-btn.primary-import {
    background: #2f80ed;
    border-color: #2f80ed;
    color: #ffffff;
    font-weight: 500;
}

.mat-action-btn.primary-import:hover {
    background: #3b8bf5;
}

.btn-icon {
    font-size: 13px;
}
</style>
