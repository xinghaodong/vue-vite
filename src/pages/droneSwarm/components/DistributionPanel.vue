<template>
    <div class="distribution-panel">
        <!-- 1. 目标点位状态条 (极简 CAD 单行状态) -->
        <div class="target-status-bar">
            <span class="status-item">
                <span class="status-label">目标:</span>
                <span class="status-val highlight">{{ targetLabel }}</span>
            </span>
            <span class="status-sep">/</span>
            <span class="status-item">
                <span class="status-label">架数:</span>
                <span class="status-val">{{ targetCount }} 架</span>
            </span>
        </div>

        <!-- 2. 连续曲线等距重排 (样条等距) -->
        <div class="cad-group-section">
            <div class="group-header">
                <span class="group-arrow">▼</span>
                <span class="group-title">样条曲线等距重排</span>
            </div>

            <div class="group-body">
                <div class="param-row">
                    <div class="param-label">
                        <span>曲线平滑度</span>
                        <span class="param-val">{{ smoothness }}</span>
                    </div>
                    <el-slider v-model="smoothness" :min="0.1" :max="1.0" :step="0.05" size="small" />
                </div>

                <div class="action-grid">
                    <button
                        class="cad-action-btn"
                        :class="{
                            'recording': lassoRecording,
                            'ready': lassoCount > 0 && !lassoRecording
                        }"
                        @click="toggleLasso"
                    >
                        <span v-if="lassoRecording" class="pulse-dot"></span>
                        <svg v-else-if="lassoCount === 0" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" class="btn-icon">
                            <path d="M12 2a2 2 0 1 1 2 2l-7 7-3 1 1-3 7-7z"/>
                        </svg>
                        <span>{{ lassoRecording ? '正在圈选 (拖动画布)...' : lassoCount > 0 ? `圈选就绪 (${lassoCount} 点)` : '按顺序圈选' }}</span>
                    </button>

                    <button
                        class="cad-action-btn primary"
                        :disabled="lassoCount < 2"
                        @click="executeCurveResample"
                    >
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" class="btn-icon">
                            <polygon points="5 3 13 8 5 13 5 3"/>
                        </svg>
                        <span>执行等距</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 3. 基础几何等距 -->
        <div class="cad-group-section">
            <div class="group-header">
                <span class="group-arrow">▼</span>
                <span class="group-title">基础几何等距</span>
            </div>
            <div class="group-body">
                <div class="geo-buttons-grid">
                    <button class="cad-geo-btn" @click="emit('apply-geometry', { type: 'line' })">直线</button>
                    <button class="cad-geo-btn" @click="emit('apply-geometry', { type: 'polyline' })">折线</button>
                    <button class="cad-geo-btn" @click="emit('apply-geometry', { type: 'rect' })">矩形</button>
                    <button class="cad-geo-btn" @click="emit('apply-geometry', { type: 'circle' })">圆周</button>
                    <button class="cad-geo-btn" @click="emit('apply-geometry', { type: 'arc', params: { startDeg: 0, sweepDeg: 180 } })">圆弧</button>
                    <button class="cad-geo-btn" @click="emit('apply-geometry', { type: 'cross' })">十字</button>
                </div>
            </div>
        </div>

        <!-- 4. 图形等距 (正多边形 / 五角星) -->
        <div class="cad-group-section">
            <div class="group-header">
                <span class="group-arrow">▼</span>
                <span class="group-title">多边形与星芒等距</span>
            </div>
            <div class="group-body">
                <div class="geo-buttons-grid">
                    <button class="cad-geo-btn" @click="emit('apply-geometry', { type: 'polygon', params: { sides: 6 } })">正六边形</button>
                    <button class="cad-geo-btn" @click="emit('apply-geometry', { type: 'polygon', params: { sides: 8 } })">正八边形</button>
                    <button class="cad-geo-btn" @click="emit('apply-geometry', { type: 'star', params: { pointsCount: 5, innerRatio: 0.5 } })">五角星</button>
                    <button class="cad-geo-btn" @click="emit('apply-geometry', { type: 'star', params: { pointsCount: 6, innerRatio: 0.58 } })">六角星芒</button>
                </div>
            </div>
        </div>

        <!-- 5. 区域填充 (包围盒密排) -->
        <div class="cad-group-section">
            <div class="group-header">
                <span class="group-arrow">▼</span>
                <span class="group-title">区域密排填充</span>
            </div>
            <div class="group-body">
                <div class="geo-buttons-grid">
                    <button class="cad-geo-btn highlight" @click="emit('apply-fill', 'hexagonal')">蜂窝最密填充</button>
                    <button class="cad-geo-btn" @click="emit('apply-fill', 'grid')">正交网格填充</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
/**
 * 2D 编队分布与等距排列控制面板 (CAD 工业级精简重构版)
 */
import { ref } from 'vue';

const props = defineProps({
    targetLabel: {
        type: String,
        default: '当前分镜',
    },
    targetCount: {
        type: Number,
        default: 0,
    },
    lassoCount: {
        type: Number,
        default: 0,
    },
    lassoRecording: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits([
    'activate-lasso',
    'execute-curve-resample',
    'apply-geometry',
    'apply-fill',
]);

const smoothness = ref(0.55);

function toggleLasso() {
    emit('activate-lasso');
}

function executeCurveResample() {
    emit('execute-curve-resample', {
        smoothness: smoothness.value,
    });
}
</script>

<style scoped>
.distribution-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: #e5e7eb;
    font-size: 11px;
}

/* 单行极简状态条 */
.target-status-bar {
    display: flex;
    align-items: center;
    background: #14161a;
    border: 1px solid #232730;
    border-radius: 2px;
    padding: 5px 8px;
    gap: 8px;
    font-size: 11px;
}

.status-item {
    display: flex;
    align-items: center;
    gap: 4px;
}

.status-label {
    color: #6b7280;
}

.status-val {
    color: #d1d5db;
    font-weight: 500;
}

.status-val.highlight {
    color: #3b82f6;
}

.status-sep {
    color: #374151;
}

/* CAD 分组 (去卡片化，采用极细边线折叠) */
.cad-group-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.group-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #232730;
    color: #9ca3af;
    font-size: 11px;
    font-weight: 500;
}

.group-arrow {
    font-size: 9px;
    color: #6b7280;
}

.group-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 2px 0;
}

.param-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.param-label {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #9ca3af;
}

.param-val {
    color: #f3f4f6;
    font-weight: 500;
}

/* 操作按钮网格 */
.action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.cad-action-btn {
    height: 26px;
    background: #1c2027;
    border: 1px solid #2d3340;
    border-radius: 2px;
    color: #d1d5db;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 0 8px;
    transition: all 0.15s ease;
}

.cad-action-btn:hover:not(:disabled) {
    background: #282f3d;
    color: #ffffff;
    border-color: #3b82f6;
}

.cad-action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.cad-action-btn.primary {
    background: #1e293b;
    border-color: #3b82f6;
    color: #60a5fa;
}

.cad-action-btn.primary:hover:not(:disabled) {
    background: #2563eb;
    color: #ffffff;
}

.cad-action-btn.recording {
    background: #3b1d24;
    border-color: #ef4444;
    color: #fca5a5;
}

.cad-action-btn.ready {
    background: #142e2b;
    border-color: #10b981;
    color: #6ee7b7;
}

.pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ef4444;
    animation: pulse 1s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
}

.btn-icon {
    flex-shrink: 0;
}

/* 几何按钮高密度微型栅格 */
.geo-buttons-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
}

.cad-geo-btn {
    height: 24px;
    background: #14161a;
    border: 1px solid #232730;
    border-radius: 2px;
    color: #9ca3af;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s;
    padding: 0 4px;
}

.cad-geo-btn:hover {
    background: #232730;
    color: #ffffff;
    border-color: #3b82f6;
}

.cad-geo-btn.highlight {
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.3);
}

.cad-geo-btn.highlight:hover {
    background: rgba(245, 158, 11, 0.15);
    border-color: #f59e0b;
}
</style>
