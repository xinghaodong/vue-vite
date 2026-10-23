<template>
    <aside class="motif-layer-panel" :class="{ collapsed: isCollapsed }">
        <!-- 头部折叠与标题 -->
        <div class="panel-header">
            <div class="header-left">
                <el-icon :size="16"><Files /></el-icon>
                <span v-show="!isCollapsed" class="panel-title">构型图层管理</span>
            </div>
            <div class="header-actions">
                <el-button
                    size="small"
                    text
                    :icon="isCollapsed ? Expand : Fold"
                    @click="isCollapsed = !isCollapsed"
                />
            </div>
        </div>

        <div v-show="!isCollapsed" class="panel-content">
            <!-- 配额进度条 -->
            <div class="quota-box">
                <div class="quota-meta">
                    <span class="quota-label">编队架数占用</span>
                    <span class="quota-numbers">{{ totalAllocatedDrones }} / {{ maxDrones }} 架</span>
                </div>
                <el-progress
                    :percentage="Math.min(100, Math.round((totalAllocatedDrones / maxDrones) * 100))"
                    :status="totalAllocatedDrones > maxDrones ? 'exception' : 'success'"
                    :stroke-width="6"
                    :show-text="false"
                />
            </div>

            <!-- 图层树列表 -->
            <div class="layer-list-container">
                <div
                    v-for="(layer, index) in layers"
                    :key="layer.id"
                    class="layer-item-card"
                    :class="{ active: selectedLayerId === layer.id }"
                    @click="selectLayer(layer.id)"
                >
                    <div class="layer-main-row">
                        <!-- 颜色徽标 -->
                        <div class="layer-color-indicator" :style="{ backgroundColor: layer.color || '#00f2fe' }"></div>

                        <!-- 图层名称与占用点数 -->
                        <div class="layer-title-box">
                            <span class="layer-name" :title="layer.name">{{ layer.name }}</span>
                            <span class="layer-count-badge">{{ layer.agentCount }} 架</span>
                        </div>

                        <!-- 快捷操作：可见性与锁定 -->
                        <div class="layer-quick-actions" @click.stop>
                            <el-button
                                size="small"
                                text
                                :icon="layer.visible ? View : Hide"
                                :class="{ 'is-muted': !layer.visible }"
                                @click="toggleVisibility(layer)"
                            />
                            <el-button
                                size="small"
                                text
                                :icon="layer.locked ? Lock : Unlock"
                                :class="{ 'is-locked': layer.locked }"
                                @click="toggleLock(layer)"
                            />
                        </div>
                    </div>

                    <!-- 选中图层时的展开微调器 -->
                    <div v-if="selectedLayerId === layer.id" class="layer-expanded-controls" @click.stop>
                        <div class="control-row">
                            <span class="ctrl-label">图层主色:</span>
                            <el-color-picker
                                v-model="layer.color"
                                size="small"
                                :show-alpha="false"
                                :disabled="layer.locked"
                                @change="handleLayerColorChange(layer)"
                            />
                            <el-button
                                size="small"
                                type="danger"
                                text
                                :disabled="layer.locked"
                                @click="emit('delete-layer', layer.id)"
                            >
                                删除
                            </el-button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 底部新增图层操作 -->
            <div class="panel-bottom-toolbar">
                <el-button size="small" type="primary" plain class="add-layer-btn" @click="emit('add-layer')">
                    <el-icon><Plus /></el-icon>
                    <span>新建构型图层</span>
                </el-button>
            </div>
        </div>
    </aside>
</template>

<script setup>
/**
 * ========================================================================
 * SwarmStudio 构型图层管理器组件 (Layer Tree Manager)
 * ========================================================================
 */
import { ref, computed } from 'vue';
import { Files, Fold, Expand, View, Hide, Lock, Unlock, Plus } from '@element-plus/icons-vue';

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
});

const emit = defineEmits([
    'select-layer',
    'update-layer',
    'add-layer',
    'delete-layer',
]);

const isCollapsed = ref(false);

const totalAllocatedDrones = computed(() => {
    return props.layers.reduce((sum, layer) => sum + (layer.agentCount || 0), 0);
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
</script>

<style scoped>
.motif-layer-panel {
    width: 240px;
    flex: 0 0 240px;
    height: 100%;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 32px -24px rgba(15, 23, 42, 0.5);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), flex-basis 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        background-color 0.3s ease, border-color 0.3s ease;
    z-index: 10;
    user-select: none;
}

.motif-layer-panel.collapsed {
    width: 52px;
    flex-basis: 52px;
}

.panel-header {
    height: 44px;
    flex-shrink: 0;
    padding: 0 10px 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-lighter);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 600;
}

.panel-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 12px;
}

.quota-box {
    background: linear-gradient(180deg, var(--el-fill-color-lighter), var(--el-fill-color-blank));
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 12px;
}

.quota-meta {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin-bottom: 6px;
}

.quota-label {
    color: var(--el-text-color-secondary);
}

.quota-numbers {
    color: var(--el-color-primary);
    font-family: var(--app-font-family-mono, monospace);
    font-weight: 600;
}

.layer-list-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 2px;
    scrollbar-width: thin;
    scrollbar-color: var(--el-border-color) transparent;
}

.layer-list-container::-webkit-scrollbar {
    width: 4px;
}

.layer-list-container::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: var(--el-border-color);
}

.layer-item-card {
    background: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 9px 10px;
    cursor: pointer;
    transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.layer-item-card:hover {
    border-color: var(--el-border-color);
    background: var(--el-fill-color);
}

.layer-item-card.active {
    border-color: var(--el-color-primary);
    background: linear-gradient(180deg, var(--el-color-primary-light-9), var(--el-fill-color-blank));
    box-shadow: inset 3px 0 0 var(--el-color-primary), 0 0 12px -6px var(--el-color-primary);
}

.layer-main-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.layer-color-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    box-shadow: 0 0 6px currentColor;
    flex-shrink: 0;
}

.layer-name {
    width: 100%;
    font-size: 12px;
    color: var(--el-text-color-primary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.layer-title-box {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.layer-count-badge {
    align-self: flex-start;
    padding: 0;
    font-size: 10px;
    font-family: var(--app-font-family-mono, monospace);
    color: var(--el-text-color-secondary);
    background: transparent;
}

.layer-quick-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
}

.layer-quick-actions :deep(.el-button) {
    width: 22px;
    height: 22px;
    padding: 0;
}

.is-muted {
    opacity: 0.35;
}

.is-locked {
    color: var(--el-color-warning) !important;
}

.layer-expanded-controls {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--el-border-color-lighter);
}

.control-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
}

.ctrl-label {
    color: var(--el-text-color-secondary);
}

.panel-bottom-toolbar {
    margin-top: 12px;
}

.add-layer-btn {
    width: 100%;
    height: 30px;
    border-radius: 7px;
    font-size: 12px;
}
</style>
