<template>
    <div class="distribution-panel">
        <!-- 目标点位状态信息条 -->
        <div class="target-info-card">
            <div class="info-row">
                <span class="info-label">操作目标</span>
                <span class="info-badge">{{ targetLabel }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">作用架数</span>
                <span class="info-count">{{ targetCount }} 架</span>
            </div>
        </div>

        <!-- 1. 连续曲线等距重排 (Ordered Lasso: 对标 SwarmStudio 视频 C) -->
        <div class="panel-section">
            <div class="section-title">
                <span class="title-tag">01</span>
                <span>连续曲线等距 (Ordered Lasso)</span>
            </div>
            <div class="section-desc">
                按时序划过连续点位，沿向心 Catmull-Rom 样条等距下放，彻底消解密集堆积与局部松散。
            </div>

            <div class="param-row">
                <div class="param-label">
                    <span>曲线平滑度 (Smoothness)</span>
                    <span class="val">{{ smoothness }}</span>
                </div>
                <el-slider v-model="smoothness" :min="0.1" :max="1.0" :step="0.05" size="small" />
            </div>

            <div class="lasso-actions">
                <el-button
                    size="small"
                    :type="lassoRecording ? 'danger' : lassoCount > 0 ? 'success' : 'primary'"
                    :plain="lassoCount > 0 && !lassoRecording"
                    class="lasso-btn"
                    @click="toggleLasso"
                >
                    <span v-if="lassoRecording">🔴 正在圈选 (拖动画布)...</span>
                    <span v-else-if="lassoCount > 0">✓ 圈选就绪 ({{ lassoCount }} 点)</span>
                    <span v-else>✏️ 按顺序圈选</span>
                </el-button>

                <el-button
                    size="small"
                    type="primary"
                    :disabled="lassoCount < 2"
                    class="resample-btn"
                    @click="executeCurveResample"
                >
                    🚀 执行等距重排
                </el-button>
            </div>
        </div>

        <!-- 2. 基础几何等距 -->
        <div class="panel-section">
            <div class="section-title">
                <span class="title-tag">02</span>
                <span>基础几何等距 (Parametric Geometries)</span>
            </div>
            <div class="geo-buttons-grid">
                <el-button size="small" @click="emit('apply-geometry', { type: 'line' })">
                    直线
                </el-button>
                <el-button size="small" @click="emit('apply-geometry', { type: 'polyline' })">
                    折线
                </el-button>
                <el-button size="small" @click="emit('apply-geometry', { type: 'rect' })">
                    矩形
                </el-button>
                <el-button size="small" @click="emit('apply-geometry', { type: 'circle' })">
                    圆周
                </el-button>
                <el-button size="small" @click="emit('apply-geometry', { type: 'arc', params: { startDeg: 0, sweepDeg: 180 } })">
                    圆弧
                </el-button>
                <el-button size="small" @click="emit('apply-geometry', { type: 'cross' })">
                    十字
                </el-button>
            </div>
        </div>

        <!-- 3. 图形等距 (正多边形 / 五角星) -->
        <div class="panel-section">
            <div class="section-title">
                <span class="title-tag">03</span>
                <span>图形等距 (Polygons & Stars)</span>
            </div>
            <div class="geo-buttons-grid">
                <el-button size="small" @click="emit('apply-geometry', { type: 'polygon', params: { sides: 6 } })">
                    正六边形
                </el-button>
                <el-button size="small" @click="emit('apply-geometry', { type: 'polygon', params: { sides: 8 } })">
                    正八边形
                </el-button>
                <el-button size="small" @click="emit('apply-geometry', { type: 'star', params: { pointsCount: 5, innerRatio: 0.5 } })">
                    五角星 (0.5内径)
                </el-button>
                <el-button size="small" @click="emit('apply-geometry', { type: 'star', params: { pointsCount: 6, innerRatio: 0.58 } })">
                    六角星芒
                </el-button>
            </div>
        </div>

        <!-- 4. 区域填充 (包围盒密排) -->
        <div class="panel-section">
            <div class="section-title">
                <span class="title-tag">04</span>
                <span>区域密排 (Packing)</span>
            </div>
            <div class="geo-buttons-grid">
                <el-button size="small" type="warning" plain @click="emit('apply-fill', 'hexagonal')">
                    六边形蜂窝最密充填
                </el-button>
                <el-button size="small" type="default" @click="emit('apply-fill', 'grid')">
                    笛卡尔正交网格
                </el-button>
            </div>
        </div>
    </div>
</template>

<script setup>
/**
 * 2D 编队分布与等距排列控制面板
 */
import { ref } from 'vue';

const props = defineProps({
    targetLabel: {
        type: String,
        default: '当前选中',
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

const smoothness = ref(0.5);

function toggleLasso() {
    emit('activate-lasso');
}

function executeCurveResample() {
    emit('execute-curve-resample', { smoothness: smoothness.value });
}
</script>

<style scoped>
.distribution-panel {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--el-text-color-primary);
}

.target-info-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.info-label {
    font-size: 11px;
    color: var(--el-text-color-secondary);
}

.info-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    padding: 2px 7px;
    border-radius: 4px;
}

.info-count {
    font-size: 13px;
    font-weight: 700;
    color: var(--el-text-color-primary);
}

.panel-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--el-bg-color-overlay);
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--el-border-color-lighter);
}

.section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.title-tag {
    font-size: 10px;
    font-weight: 700;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    padding: 1px 4px;
    border-radius: 3px;
}

.section-desc {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    line-height: 1.4;
}

.param-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.param-label {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--el-text-color-secondary);
}

.param-label .val {
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.lasso-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
}

.lasso-btn {
    flex: 1;
}

.resample-btn {
    flex: 1;
}

.geo-buttons-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.geo-buttons-grid :deep(.el-button) {
    margin-left: 0 !important;
    justify-content: center;
}
</style>
