<template>
    <!-- 🌟 1:1 官方 SwarmStudio 右侧属性与工具栏面板 -->
    <aside class="swarm-official-right-rail">
        <!-- 1. 左侧垂直图标条 (Tab Strip) - 纯矢量微型工业图标 -->
        <div class="rail-icon-strip">
            <!-- 属性 Tab -->
            <button
                class="strip-btn"
                :class="{ active: modelValue === 'property' }"
                title="专有/通用属性"
                @click="emit('update:modelValue', 'property')"
            >
                <svg class="strip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                </svg>
            </button>

            <!-- 定格整体与灯光 Tab -->
            <button
                class="strip-btn"
                :class="{ active: modelValue === 'lighting' }"
                title="定格整体与灯光属性"
                @click="emit('update:modelValue', 'lighting')"
            >
                <svg class="strip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18h6"/>
                    <path d="M10 22h4"/>
                    <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/>
                </svg>
            </button>

            <!-- 几何分布 Tab -->
            <button
                class="strip-btn"
                :class="{ active: modelValue === 'distribution' }"
                title="布点与几何分布"
                @click="emit('update:modelValue', 'distribution')"
            >
                <svg class="strip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="5" cy="5" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                    <circle cx="19" cy="5" r="1.5" fill="currentColor"/>
                    <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="5" cy="19" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                    <circle cx="19" cy="19" r="1.5" fill="currentColor"/>
                </svg>
            </button>

            <!-- 无人机 LED 上色 Tab -->
            <button
                class="strip-btn"
                :class="{ active: modelValue === 'color' }"
                title="无人机 LED 上色"
                @click="emit('update:modelValue', 'color')"
            >
                <svg class="strip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5.5-4.5-9.8-10-9.8z"/>
                    <circle cx="8" cy="8" r="1" fill="currentColor"/>
                    <circle cx="12" cy="6.5" r="1" fill="currentColor"/>
                    <circle cx="16" cy="8.5" r="1" fill="currentColor"/>
                </svg>
            </button>

            <!-- 快捷锁定 -->
            <button class="strip-btn" title="图层锁定" @click="handleToggleLock">
                <svg class="strip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="5" y="11" width="14" height="10" rx="2"/>
                    <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                </svg>
            </button>

            <!-- 历史记录 -->
            <button class="strip-btn" title="历史记录">
                <svg class="strip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"/>
                    <polyline points="12 7 12 12 15 14"/>
                </svg>
            </button>
        </div>

        <!-- 2. 右侧主体属性面板 (对标截图 1、6) -->
        <div class="rail-main-body">
            <!-- 顶栏: 动态标题与窗口控制 -->
            <div class="rail-top-bar">
                <div class="top-bar-left">
                    <span class="drag-dots">⋮⋮</span>
                    <span class="bar-title">{{ currentTabTitle }}</span>
                </div>
                <div class="top-bar-right">
                    <button class="tool-icon-btn" title="收起面板" @click="emit('close')">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                    <button class="tool-icon-btn" title="独立窗口">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none">
                            <path d="M15 3h6v6"/>
                            <path d="M9 21H3v-6"/>
                            <line x1="21" y1="3" x2="14" y2="10"/>
                            <line x1="3" y1="21" x2="10" y2="14"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Tab 1: 属性面板 (素材 / 定格) -->
            <div v-show="modelValue === 'property' || modelValue === 'lighting'" class="rail-scroll-content">
                <!-- 🌟 A. 素材专有属性 (当激活选中底图素材时呈现，1:1 对标截图 6) -->
                <div v-if="activeMaterial" class="inspector-section">
                    <div class="section-sub-header">
                        <span class="arrow-down">▼</span>
                        <span class="sub-title">类型专有属性</span>
                    </div>

                    <div class="prop-form-group">
                        <!-- 图片名称 -->
                        <div class="form-item-row">
                            <span class="item-label">图片</span>
                            <div class="item-input-wrap">
                                <input
                                    type="text"
                                    :value="activeMaterial.groupName || activeMaterial.name || '线稿素材.png'"
                                    readonly
                                    class="official-cad-input readonly"
                                    :title="activeMaterial.groupName || activeMaterial.name"
                                />
                            </div>
                        </div>

                        <!-- 原始分辨率 (宽 / 高) -->
                        <div class="form-item-row dual-inputs">
                            <div class="sub-input-col">
                                <span class="sub-label">宽</span>
                                <input
                                    type="number"
                                    :value="activeMaterial.originalW || 2464"
                                    readonly
                                    class="official-cad-input readonly"
                                />
                            </div>
                            <div class="sub-input-col">
                                <span class="sub-label">高</span>
                                <input
                                    type="number"
                                    :value="activeMaterial.originalH || 1600"
                                    readonly
                                    class="official-cad-input readonly"
                                />
                            </div>
                        </div>

                        <!-- 透明度 -->
                        <div class="form-item-row">
                            <span class="item-label">透明度</span>
                            <div class="opacity-input-group">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    :value="Math.round((activeMaterial.opacity ?? 1.0) * 100)"
                                    class="official-cad-input num-box"
                                    @input="handleOpacityInput"
                                />
                                <span class="input-unit">%</span>
                            </div>
                        </div>
                    </div>

                    <!-- 🌟 B. 通用属性 (对齐 / 位置 / 旋转 / 尺寸，1:1 对标截图 6) -->
                    <div class="section-divider-bar">
                        <div class="top-bar-left">
                            <span class="drag-dots">⋮⋮</span>
                            <span class="bar-title">通用属性</span>
                        </div>
                        <div class="top-bar-right">
                            <button class="tool-icon-btn">+</button>
                            <button class="tool-icon-btn">⤢</button>
                        </div>
                    </div>

                    <div class="prop-form-group">
                        <!-- 对齐快捷栏 (微型矢量对齐) -->
                        <div class="form-item-col">
                            <span class="item-label">对齐</span>
                            <div class="cad-align-bar">
                                <button class="align-btn" title="左对齐" @click="handleAlign('left')">
                                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="2" y1="2" x2="2" y2="14"/><rect x="5" y="4" width="9" height="3" rx="0.5"/><rect x="5" y="9" width="6" height="3" rx="0.5"/></svg>
                                </button>
                                <button class="align-btn" title="水平居中" @click="handleAlign('center-x')">
                                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="8" y1="2" x2="8" y2="14"/><rect x="3" y="4" width="10" height="3" rx="0.5"/><rect x="4.5" y="9" width="7" height="3" rx="0.5"/></svg>
                                </button>
                                <button class="align-btn" title="右对齐" @click="handleAlign('right')">
                                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="14" y1="2" x2="14" y2="14"/><rect x="2" y="4" width="9" height="3" rx="0.5"/><rect x="5" y="9" width="6" height="3" rx="0.5"/></svg>
                                </button>
                                <button class="align-btn" title="顶对齐" @click="handleAlign('top')">
                                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="2" y1="2" x2="14" y2="2"/><rect x="4" y="5" width="3" height="9" rx="0.5"/><rect x="9" y="5" width="3" height="6" rx="0.5"/></svg>
                                </button>
                                <button class="align-btn" title="垂直居中" @click="handleAlign('center-y')">
                                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="2" y1="8" x2="14" y2="8"/><rect x="4" y="3" width="3" height="10" rx="0.5"/><rect x="9" y="4.5" width="3" height="7" rx="0.5"/></svg>
                                </button>
                                <button class="align-btn" title="底对齐" @click="handleAlign('bottom')">
                                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="2" y1="14" x2="14" y2="14"/><rect x="4" y="2" width="3" height="9" rx="0.5"/><rect x="9" y="5" width="3" height="6" rx="0.5"/></svg>
                                </button>
                            </div>
                        </div>

                        <!-- 位置 X / Y (米) -->
                        <div class="form-item-col">
                            <span class="item-label">位置</span>
                            <div class="form-item-row dual-inputs">
                                <div class="sub-input-col">
                                    <span class="sub-label">X</span>
                                    <input
                                        type="number"
                                        step="0.5"
                                        :value="activeMaterial.x || 0"
                                        class="official-cad-input"
                                        @input="handlePositionXInput"
                                    />
                                    <span class="inner-unit">m</span>
                                </div>
                                <div class="sub-input-col">
                                    <span class="sub-label">Y</span>
                                    <input
                                        type="number"
                                        step="0.5"
                                        :value="activeMaterial.y || 0"
                                        class="official-cad-input"
                                        @input="handlePositionYInput"
                                    />
                                    <span class="inner-unit">m</span>
                                </div>
                            </div>
                        </div>

                        <!-- 旋转角度与翻转 -->
                        <div class="form-item-col">
                            <span class="item-label">旋转</span>
                            <div class="form-item-row dual-inputs">
                                <div class="sub-input-col">
                                    <span class="sub-label">R</span>
                                    <input
                                        type="text"
                                        value="0°"
                                        readonly
                                        class="official-cad-input readonly"
                                    />
                                </div>
                                <div class="rotate-btn-group">
                                    <button class="cad-mini-btn" title="逆时针旋转 90°" @click="handleRotate(-90)">
                                        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7a5 5 0 1 1 1 3.5"/><polyline points="4 3 4 7 8 7"/></svg>
                                    </button>
                                    <button class="cad-mini-btn" title="顺时针旋转 90°" @click="handleRotate(90)">
                                        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 7a5 5 0 1 0-1 3.5"/><polyline points="12 3 12 7 8 7"/></svg>
                                    </button>
                                    <button class="cad-mini-btn" title="水平翻转">
                                        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="8" y1="2" x2="8" y2="14" stroke-dasharray="2 2"/><path d="M5 5L2 8l3 3"/><path d="M11 5l3 3-3 3"/></svg>
                                    </button>
                                    <button class="cad-mini-btn" title="垂直翻转">
                                        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="2" y1="8" x2="14" y2="8" stroke-dasharray="2 2"/><path d="M5 5L8 2l3 3"/><path d="M5 11l3 3 3-3"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 尺寸 W / H (米) 带等比锁定链条 -->
                        <div class="form-item-col">
                            <span class="item-label">尺寸</span>
                            <div class="dimension-row">
                                <div class="dim-col">
                                    <span class="sub-label">W</span>
                                    <input
                                        type="number"
                                        step="1"
                                        :value="Math.round((activeMaterial.widthM || 200) * 10) / 10"
                                        class="official-cad-input"
                                        @input="handleWidthInput"
                                    />
                                    <span class="inner-unit">m</span>
                                </div>

                                <!-- 等比锁定链条按钮 (矢量 SVG) -->
                                <button
                                    class="chain-lock-btn"
                                    :class="{ active: isAspectLocked }"
                                    :title="isAspectLocked ? '已锁定宽高比' : '自由缩放'"
                                    @click="isAspectLocked = !isAspectLocked"
                                >
                                    <svg v-if="isAspectLocked" viewBox="0 0 24 24" class="chain-svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                    </svg>
                                    <svg v-else viewBox="0 0 24 24" class="chain-svg chain-unlocked" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M9 17H7A5 5 0 0 1 7 7h2"/>
                                        <path d="M15 7h2a5 5 0 1 1 0 10h-2"/>
                                        <line x1="9" y1="12" x2="15" y2="12" stroke-dasharray="2 2"/>
                                    </svg>
                                </button>

                                <div class="dim-col">
                                    <span class="sub-label">H</span>
                                    <input
                                        type="number"
                                        step="1"
                                        :value="Math.round((activeMaterial.heightM || 129.87) * 100) / 100"
                                        class="official-cad-input"
                                        @input="handleHeightInput"
                                    />
                                    <span class="inner-unit">m</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- C. 定格整体属性 (无素材或选中无人机编队时呈现，对标截图 1) -->
                <div v-else class="inspector-section">
                    <div class="section-sub-header">
                        <span class="arrow-down">▼</span>
                        <span class="sub-title">定格整体属性</span>
                    </div>

                    <div class="prop-form-group">
                        <div class="form-item-col">
                            <span class="item-label">全局无人机直径</span>
                            <div class="form-item-row">
                                <div class="cad-segmented-wrap">
                                    <button class="seg-btn">0.6m</button>
                                    <button class="seg-btn active">0.9m (标准)</button>
                                </div>
                            </div>
                        </div>

                        <div class="form-item-row switch-row">
                            <span class="item-label">安全间距红线</span>
                            <input type="checkbox" checked class="cad-switch" />
                        </div>

                        <div class="form-item-row switch-row">
                            <span class="item-label">轨道校准</span>
                            <input type="checkbox" checked class="cad-switch" />
                        </div>
                    </div>

                    <div class="section-divider-bar">
                        <div class="top-bar-left">
                            <span class="drag-dots">⋮⋮</span>
                            <span class="bar-title">通用属性</span>
                        </div>
                        <div class="top-bar-right">
                            <button class="tool-icon-btn">+</button>
                            <button class="tool-icon-btn">⤢</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab 2: 分布工具槽 -->
            <div v-show="modelValue === 'distribution'" class="rail-scroll-content">
                <slot name="distribution" />
            </div>

            <!-- Tab 3: 上色工具槽 -->
            <div v-show="modelValue === 'color'" class="rail-scroll-content">
                <slot name="color" />
            </div>
        </div>
    </aside>
</template>

<script setup>
/**
 * ========================================================================
 * 官方 SwarmStudio 1:1 右侧属性检查器与工具栏面板
 * ========================================================================
 */
import { ref, computed } from 'vue';

const props = defineProps({
    modelValue: {
        type: String,
        default: 'property', // 'property' | 'lighting' | 'distribution' | 'color'
    },
    activeMaterial: {
        type: Object,
        default: () => null,
    },
});

const emit = defineEmits([
    'update:modelValue',
    'update-material-transform',
    'close',
]);

const tabTitleMap = {
    property: '专有属性',
    lighting: '定格整体属性',
    distribution: '几何与布点分布',
    color: '无人机 LED 上色',
};

const currentTabTitle = computed(() => {
    return tabTitleMap[props.modelValue] || '专有属性';
});

const isAspectLocked = ref(true);

function handleToggleLock() {
    // 快捷图层锁定
}

function handleOpacityInput(e) {
    const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
    emit('update-material-transform', { opacity: val / 100 });
}

function handlePositionXInput(e) {
    const val = Number(e.target.value) || 0;
    emit('update-material-transform', { x: val });
}

function handlePositionYInput(e) {
    const val = Number(e.target.value) || 0;
    emit('update-material-transform', { y: val });
}

function handleWidthInput(e) {
    const newW = Math.max(5, Number(e.target.value) || 10);
    const updates = { width: newW };

    if (isAspectLocked.value && props.activeMaterial) {
        const origW = props.activeMaterial.originalW || 2464;
        const origH = props.activeMaterial.originalH || 1600;
        updates.height = Math.round(newW * (origH / origW) * 100) / 100;
    }
    emit('update-material-transform', updates);
}

function handleHeightInput(e) {
    const newH = Math.max(5, Number(e.target.value) || 10);
    const updates = { height: newH };

    if (isAspectLocked.value && props.activeMaterial) {
        const origW = props.activeMaterial.originalW || 2464;
        const origH = props.activeMaterial.originalH || 1600;
        updates.width = Math.round(newH * (origW / origH) * 100) / 100;
    }
    emit('update-material-transform', updates);
}

function handleRotate(deg) {
    // 旋转增量
}

function handleAlign(type) {
    // 快捷对齐
}
</script>

<style scoped>
/* 官方 SwarmStudio 风格暗色工业右侧面板 */
.swarm-official-right-rail {
    position: absolute;
    right: 0;
    top: 48px;
    bottom: 0;
    width: 290px;
    background: #181b20;
    border-left: 1px solid #282c35;
    display: flex;
    z-index: 20;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif;
    color: #e5e7eb;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.4);
}

/* 左侧垂直图标条 (38px 宽) - 纯矢量微型设计 */
.rail-icon-strip {
    width: 38px;
    flex: 0 0 38px;
    background: #14161a;
    border-right: 1px solid #232730;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;
    gap: 6px;
}

.strip-btn {
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #8c92a0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
}

.strip-btn:hover {
    color: #ffffff;
    background: #232730;
}

.strip-btn.active {
    background: #262c38;
    color: #3b82f6;
    box-shadow: inset 0 0 0 1px #3b82f6;
}

.strip-svg {
    width: 15px;
    height: 15px;
}

/* 右侧主体面板内容区 (252px 宽) */
.rail-main-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.rail-top-bar, .section-divider-bar {
    height: 32px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #1c1f26;
    border-bottom: 1px solid #282c35;
}

.section-divider-bar {
    border-top: 1px solid #282c35;
    margin-top: 14px;
}

.top-bar-left {
    display: flex;
    align-items: center;
    gap: 6px;
}

.drag-dots {
    color: #555b68;
    font-size: 11px;
}

.bar-title {
    font-size: 11px;
    font-weight: 500;
    color: #f3f4f6;
}

.top-bar-right {
    display: flex;
    align-items: center;
    gap: 6px;
}

.tool-icon-btn {
    background: transparent;
    border: none;
    color: #8c92a0;
    cursor: pointer;
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tool-icon-btn:hover {
    color: #ffffff;
    background: #282c35;
}

.rail-scroll-content {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
}

/* 属性折叠分组 */
.inspector-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.section-sub-header {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #9ca3af;
    font-size: 11px;
    padding-bottom: 4px;
    border-bottom: 1px solid #232730;
}

.arrow-down {
    font-size: 9px;
    color: #6b7280;
}

.sub-title {
    font-weight: 500;
}

.prop-form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 0;
}

.form-item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 24px;
}

.form-item-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.item-label {
    font-size: 11px;
    color: #9ca3af;
    flex: 0 0 52px;
}

.item-input-wrap {
    flex: 1;
    min-width: 0;
}

/* 官方紧凑暗色输入框规范 */
.official-cad-input {
    width: 100%;
    height: 22px;
    background: #14161a;
    border: 1px solid #2c313a;
    border-radius: 2px;
    color: #f3f4f6;
    font-size: 11px;
    padding: 0 6px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s;
}

.official-cad-input:focus {
    border-color: #3b82f6;
}

.official-cad-input.readonly {
    color: #8c92a0;
    cursor: default;
    background: #181b20;
}

.dual-inputs {
    display: flex;
    gap: 6px;
    flex: 1;
}

.sub-input-col {
    flex: 1;
    display: flex;
    align-items: center;
    background: #14161a;
    border: 1px solid #2c313a;
    border-radius: 2px;
    padding: 0 4px;
    height: 22px;
    box-sizing: border-box;
}

.sub-input-col .sub-label {
    font-size: 10px;
    color: #6b7280;
    margin-right: 4px;
    user-select: none;
}

.sub-input-col .official-cad-input {
    border: none;
    background: transparent;
    padding: 0;
    height: 100%;
    flex: 1;
}

.sub-input-col .inner-unit {
    font-size: 10px;
    color: #6b7280;
    margin-left: 2px;
}

/* 透明度输入组 */
.opacity-input-group {
    display: flex;
    align-items: center;
    background: #14161a;
    border: 1px solid #2c313a;
    border-radius: 2px;
    padding: 0 4px;
    height: 22px;
    width: 70px;
    box-sizing: border-box;
}

.opacity-input-group .official-cad-input {
    border: none;
    background: transparent;
    padding: 0;
    height: 100%;
    flex: 1;
    text-align: right;
}

.input-unit {
    font-size: 10px;
    color: #6b7280;
    margin-left: 2px;
}

/* 官方对齐栏 (6 按钮) */
.cad-align-bar {
    display: flex;
    background: #14161a;
    border: 1px solid #2c313a;
    border-radius: 2px;
    overflow: hidden;
    height: 22px;
}

.align-btn {
    flex: 1;
    background: transparent;
    border: none;
    border-right: 1px solid #232730;
    color: #9ca3af;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s;
    padding: 0;
}

.align-btn:last-child {
    border-right: none;
}

.align-btn:hover {
    background: #232730;
    color: #ffffff;
}

/* 旋转与翻转按钮组 */
.rotate-btn-group {
    display: flex;
    background: #14161a;
    border: 1px solid #2c313a;
    border-radius: 2px;
    overflow: hidden;
    height: 22px;
}

.cad-mini-btn {
    width: 22px;
    height: 22px;
    background: transparent;
    border: none;
    border-right: 1px solid #232730;
    color: #9ca3af;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s;
    padding: 0;
}

.cad-mini-btn:last-child {
    border-right: none;
}

.cad-mini-btn:hover {
    background: #232730;
    color: #ffffff;
}

/* 尺寸 W / H 与等比锁定链条 */
.dimension-row {
    display: flex;
    align-items: center;
    gap: 4px;
}

.dim-col {
    flex: 1;
    display: flex;
    align-items: center;
    background: #14161a;
    border: 1px solid #2c313a;
    border-radius: 2px;
    padding: 0 4px;
    height: 22px;
    box-sizing: border-box;
}

.dim-col .sub-label {
    font-size: 10px;
    color: #6b7280;
    margin-right: 4px;
}

.dim-col .official-cad-input {
    border: none;
    background: transparent;
    padding: 0;
    height: 100%;
    flex: 1;
}

.dim-col .inner-unit {
    font-size: 10px;
    color: #6b7280;
    margin-left: 2px;
}

.chain-lock-btn {
    width: 20px;
    height: 22px;
    background: #14161a;
    border: 1px solid #2c313a;
    border-radius: 2px;
    color: #6b7280;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: all 0.15s;
}

.chain-lock-btn.active {
    color: #3b82f6;
    border-color: #3b82f6;
    background: #1c2331;
}

.chain-svg {
    width: 12px;
    height: 12px;
}

.chain-unlocked {
    opacity: 0.6;
}

/* 定格控件 */
.cad-segmented-wrap {
    display: flex;
    background: #14161a;
    border: 1px solid #2c313a;
    border-radius: 2px;
    padding: 1px;
    flex: 1;
}

.seg-btn {
    flex: 1;
    height: 20px;
    background: transparent;
    border: none;
    border-radius: 2px;
    color: #8c92a0;
    font-size: 10px;
    cursor: pointer;
}

.seg-btn.active {
    background: #232730;
    color: #3b82f6;
    font-weight: 500;
}

.switch-row {
    padding: 2px 0;
}

.cad-switch {
    appearance: none;
    width: 28px;
    height: 15px;
    background: #282c35;
    border-radius: 8px;
    position: relative;
    cursor: pointer;
    outline: none;
    transition: background 0.2s;
}

.cad-switch:checked {
    background: #3b82f6;
}

.cad-switch::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 11px;
    height: 11px;
    background: #ffffff;
    border-radius: 50%;
    transition: transform 0.2s;
}

.cad-switch:checked::before {
    transform: translateX(13px);
}
</style>
