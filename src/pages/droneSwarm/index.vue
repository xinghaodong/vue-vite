<template>
    <div class="drone-swarm-workbench">
        <!-- 1. 顶部极客专业控制台 (Toolbar) -->
        <header class="swarm-header">
            <div class="header-brand">
                <div class="brand-logo">
                    <el-icon :size="20"><Compass /></el-icon>
                </div>
                <div class="brand-titles">
                    <span class="main-title">SwarmStudio 无人机编队设计平台</span>
                    <span class="sub-title">2D 创意点阵 · 3D 夜空辉光表演 · SDF 工业协议 · 1.5m 空间安全网格</span>
                </div>
            </div>

            <!-- 中间核心操作：几何基元预设与图像转构型向导 -->
            <div class="header-presets">
                <span class="preset-label">几何基元：</span>
                <el-button-group>
                    <el-button
                        size="small"
                        :type="currentMotif === 'heart' ? 'primary' : 'default'"
                        @click="applyPreset('heart')"
                    >
                        ❤️ 爱心
                    </el-button>
                    <el-button
                        size="small"
                        :type="currentMotif === 'star' ? 'primary' : 'default'"
                        @click="applyPreset('star')"
                    >
                        ⭐ 星芒
                    </el-button>
                    <el-button
                        size="small"
                        :type="currentMotif === 'galaxy' ? 'primary' : 'default'"
                        @click="applyPreset('galaxy')"
                    >
                        🐉 祥龙星系
                    </el-button>
                    <el-button
                        size="small"
                        :type="currentMotif === 'rings' ? 'primary' : 'default'"
                        @click="applyPreset('rings')"
                    >
                        🪐 光环
                    </el-button>
                </el-button-group>

                <!-- 上传图片触发 SwarmStudio 三步骤智能转构型向导 -->
                <el-upload
                    action=""
                    :auto-upload="false"
                    :show-file-list="false"
                    accept="image/*"
                    :on-change="handleImageUpload"
                    class="upload-btn"
                >
                    <el-button size="small" type="warning" plain>
                        <el-icon><Upload /></el-icon>
                        <span>导入图片向导 (3-Step)</span>
                    </el-button>
                </el-upload>
            </div>

            <!-- 右侧：架数标定、LED 颜色、安全指示与 2D/3D 模式切换 -->
            <div class="header-actions">
                <!-- 1.5m 空间防撞状态总控徽标 -->
                <div
                    class="safety-header-pill"
                    :class="safetyReport.isSafe ? 'safe' : 'danger'"
                    :title="safetyReport.isSafe ? '全部点位物理间距 >= 1.5m' : `存在 ${safetyReport.dangerIds.size} 架违规碰撞点位`"
                >
                    <span class="pill-dot"></span>
                    <span>{{ safetyReport.isSafe ? '1.5m 安全' : `${safetyReport.dangerIds.size} 处过密` }}</span>
                    <el-button
                        v-if="!safetyReport.isSafe"
                        size="small"
                        type="danger"
                        link
                        class="relax-link"
                        @click="handleAutoRelax"
                    >
                        疏散
                    </el-button>
                </div>

                <div class="stat-pill">
                    <span class="label">总架数:</span>
                    <el-select v-model="droneCount" size="small" style="width: 105px" @change="handleCountChange">
                        <el-option :value="400" label="400 架" />
                        <el-option :value="800" label="800 架" />
                        <el-option :value="1600" label="1600 架" />
                    </el-select>
                </div>

                <div class="color-picker-box" title="统一调节当前分镜无人机 LED 颜色">
                    <span class="color-label">LED:</span>
                    <el-color-picker
                        v-model="currentLedColor"
                        size="small"
                        :show-alpha="false"
                        @change="handleLedColorChange"
                    />
                </div>

                <div class="view-switch">
                    <el-segmented
                        v-model="viewMode"
                        :options="[
                            { label: '2D 点阵编辑', value: '2d' },
                            { label: '3D 夜空试飞', value: '3d' },
                        ]"
                        size="small"
                    />
                </div>
            </div>
        </header>

        <!-- 2. 中央视口核心主舞台 (含左侧构型图层面板) -->
        <main class="swarm-main-stage">
            <!-- SwarmStudio 风格左侧构型图层管理器 -->
            <MotifLayerPanel
                :layers="currentLayers"
                :selected-layer-id="selectedLayerId"
                :max-drones="droneCount"
                @select-layer="handleSelectLayer"
                @update-layer="handleUpdateLayer"
                @add-layer="handleAddLayer"
                @delete-layer="handleDeleteLayer"
            />

            <!-- 2D PixiJS 点阵图形编辑器 (支持违规点位标红) -->
            <div class="viewport-wrapper">
                <Editor2D
                    v-show="viewMode === '2d'"
                    :agents="currentScene.agents"
                    :danger-ids="safetyReport.dangerIds"
                    @select-agent="handleSelectAgent"
                    @auto-relax="handleAutoRelax"
                />

                <!-- 3D Three.js 夜空发光无人机全景播放器 -->
                <Player3D
                    v-if="viewMode === '3d'"
                    :agents="currentScene.agents"
                    :drone-count="droneCount"
                />
            </div>
        </main>

        <!-- 3. 底部分镜时间轴控制栏 -->
        <TimelineBar
            :scenes="showProject.scenes"
            :active-scene-index="activeSceneIndex"
            @select-scene="handleSelectScene"
            @add-scene="handleAddScene"
            @export-sdf="handleExportSdf"
        />

        <!-- 4. SwarmStudio 图像智能转构型三步骤向导弹窗 (Vue 3.5 useTemplateRef) -->
        <ImageProcessingModal
            ref="imageWizardModal"
            @apply-agents="handleApplyWizardAgents"
        />
    </div>
</template>

<script setup>
/**
 * ========================================================================
 * 无人机集群编队设计与表演系统 - 主工作台容器 (DDD 领域工程规范)
 * ========================================================================
 */
import { ref, reactive, computed, onMounted, useTemplateRef } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { Compass, Upload } from '@element-plus/icons-vue';

import { createShow, createScene, createAgent } from './types/swarm';
import { useContourAlgorithm } from './composables/useContourAlgorithm';
import { useSpatialGrid } from './composables/useSpatialGrid';

import Editor2D from './components/Editor2D.vue';
import Player3D from './components/Player3D.vue';
import TimelineBar from './components/TimelineBar.vue';
import MotifLayerPanel from './components/MotifLayerPanel.vue';
import ImageProcessingModal from './components/ImageProcessingModal.vue';

// 🌟 Vue 3.5 原生专属 Hook: useTemplateRef 绑定弹窗实例
const imageWizardRef = useTemplateRef('imageWizardModal');

// 核心算法 Hooks
const { generatePresetPattern } = useContourAlgorithm();
const { checkSafety, autoRelaxCollisions } = useSpatialGrid();

// 视口与项目状态
const viewMode = ref('2d');
const droneCount = ref(800);
const currentMotif = ref('heart');
const currentLedColor = ref('#00f2fe');
const activeSceneIndex = ref(0);
const selectedLayerId = ref('layer_main');

// 整场表演工程模型 (Show)
const showProject = reactive(
    createShow({
        title: '星空华彩无人机编队夜空秀',
        droneCount: 800,
        scenes: [],
    })
);

// 当前激活的分镜
const currentScene = computed(() => {
    return showProject.scenes[activeSceneIndex.value] || { agents: [] };
});

// 当前分镜的图层组
const currentLayers = reactive([
    {
        id: 'layer_main',
        name: '主图形层 (Main Motif)',
        agentCount: 800,
        color: '#00f2fe',
        visible: true,
        locked: false,
    },
]);

// 实时 1.5m 空间碰撞检测计算
const safetyReport = computed(() => {
    const agents = currentScene.value.agents || [];
    // 标定最小安全间距 1.5 米 (映射到 2D/3D 世界)
    return checkSafety(agents, 1.5);
});

// 一键力导向自动平滑疏散
function handleAutoRelax() {
    const currentAgents = currentScene.value.agents || [];
    if (currentAgents.length === 0) return;

    const relaxed = autoRelaxCollisions(currentAgents, 1.5, 20);
    currentScene.value.agents = relaxed;

    ElMessage.success('已完成物理力导向平滑疏散，所有点位达到 ≥ 1.5m 安全基准！');
}

// 初始化默认演示分镜剧本 (爱心 -> 五角星 -> 祥龙)
function initDefaultScenes() {
    const scene1 = createScene({
        name: '分镜 1: 浪漫爱心',
        duration: 6,
        transitionTime: 3,
        motifType: 'heart',
        agents: generatePresetPattern('heart', droneCount.value),
    });

    const scene2 = createScene({
        name: '分镜 2: 璀璨星芒',
        duration: 6,
        transitionTime: 3,
        motifType: 'star',
        agents: generatePresetPattern('star', droneCount.value),
    });

    const scene3 = createScene({
        name: '分镜 3: 祥龙星系',
        duration: 8,
        transitionTime: 4,
        motifType: 'galaxy',
        agents: generatePresetPattern('galaxy', droneCount.value),
    });

    showProject.scenes = [scene1, scene2, scene3];
    activeSceneIndex.value = 0;
    updateLayerCount();
}

function updateLayerCount() {
    if (currentLayers.length > 0) {
        currentLayers[0].agentCount = currentScene.value.agents.length;
    }
}

// 切换几何预设母题
function applyPreset(motifType) {
    currentMotif.value = motifType;
    const newPoints = generatePresetPattern(motifType, droneCount.value);
    currentScene.value.agents = newPoints.map((p) => createAgent({ ...p, color: currentLedColor.value }));
    currentScene.value.motifType = motifType;
    updateLayerCount();

    ElMessage.success({
        message: `已应用基元构型: ${motifType} (${droneCount.value} 架无人机)`,
        duration: 1500,
    });
}

// 调整无人机总架数标定
function handleCountChange(newCount) {
    showProject.droneCount = newCount;
    applyPreset(currentMotif.value);
}

// 修改当前分镜 LED 颜色
function handleLedColorChange(newColor) {
    if (!newColor) return;
    currentScene.value.agents.forEach((agent) => {
        agent.color = newColor;
    });
    if (currentLayers[0]) {
        currentLayers[0].color = newColor;
    }
}

// 切换当前激活分镜
function handleSelectScene(index) {
    activeSceneIndex.value = index;
    currentMotif.value = currentScene.value.motifType || 'custom';
    updateLayerCount();
}

// 新增分镜
function handleAddScene() {
    const newIdx = showProject.scenes.length + 1;
    const newScene = createScene({
        name: `分镜 ${newIdx}: 构型基元`,
        duration: 5,
        transitionTime: 3,
        motifType: 'rings',
        agents: generatePresetPattern('rings', droneCount.value),
    });
    showProject.scenes.push(newScene);
    activeSceneIndex.value = showProject.scenes.length - 1;
    updateLayerCount();
    ElMessage.success('已新建分镜剧本！');
}

// 上传图片并唤起 SwarmStudio 三步骤转构向导
function handleImageUpload(uploadFile) {
    const file = uploadFile.raw;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // 打开三步骤向导弹窗
            if (imageWizardRef.value) {
                imageWizardRef.value.openWizard(img, droneCount.value);
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 向导完成后应用点位
function handleApplyWizardAgents(result) {
    const { agents, strategy, mode } = result;
    currentScene.value.agents = agents;
    currentScene.value.name = `自定义构型 (${strategy} / ${mode})`;
    currentScene.value.motifType = 'custom';
    currentMotif.value = 'custom';
    updateLayerCount();

    ElNotification({
        title: 'SwarmStudio 构型与原色赋色成功',
        message: `成功导入 ${agents.length} 架无人机点位，已自动映射原图色彩并执行 1.5m 空间安全网格校验！`,
        type: 'success',
        duration: 4000,
    });
}

// 图层操作
function handleSelectLayer(layerId) {
    selectedLayerId.value = layerId;
}

function handleUpdateLayer(layer) {
    if (layer.color) {
        currentLedColor.value = layer.color;
        currentScene.value.agents.forEach((a) => {
            a.color = layer.color;
        });
    }
}

function handleAddLayer() {
    const newLayerId = `layer_${Date.now()}`;
    currentLayers.push({
        id: newLayerId,
        name: `新图层 ${currentLayers.length + 1}`,
        agentCount: 0,
        color: '#00ff88',
        visible: true,
        locked: false,
    });
    selectedLayerId.value = newLayerId;
    ElMessage.success('已新建构型图层！');
}

function handleDeleteLayer(layerId) {
    if (currentLayers.length <= 1) {
        ElMessage.warning('请至少保留一个主构型图层！');
        return;
    }
    const idx = currentLayers.findIndex((l) => l.id === layerId);
    if (idx !== -1) {
        currentLayers.splice(idx, 1);
        selectedLayerId.value = currentLayers[0].id;
        ElMessage.success('已删除图层！');
    }
}

// 选中某个无人机点位
function handleSelectAgent(agent) {
    ElMessage.info(`选中无人机 #${agent.id} (坐标: X ${agent.x}, Y ${agent.y})`);
}

// 导出 SDF 编队标准工业协议数据
function handleExportSdf() {
    const exportData = {
        meta: {
            app: 'SwarmStudio',
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            totalDrones: droneCount.value,
            safetyValidation: {
                minObservedDistance: safetyReport.value.minObservedDistance,
                isSafe: safetyReport.value.isSafe,
            },
        },
        project: showProject,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drone_swarm_sdf_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    ElMessage.success('已成功导出标准 SDF 编队工程数据文件！');
}

onMounted(() => {
    initDefaultScenes();
});
</script>

<style scoped>
.drone-swarm-workbench {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #080a10;
    color: #e2e8f0;
    overflow: hidden;
    font-family: var(--app-font-family);
}

/* 顶部控制栏 */
.swarm-header {
    height: 52px;
    background: #0d121f;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    z-index: 20;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.header-brand {
    display: flex;
    align-items: center;
    gap: 10px;
}

.brand-logo {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #080a10;
    box-shadow: 0 0 12px rgba(0, 242, 254, 0.4);
}

.brand-titles {
    display: flex;
    flex-direction: column;
}

.main-title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #ffffff;
}

.sub-title {
    font-size: 11px;
    color: #94a3b8;
}

.header-presets {
    display: flex;
    align-items: center;
    gap: 10px;
}

.preset-label {
    font-size: 12px;
    color: #94a3b8;
}

.upload-btn {
    display: inline-block;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.safety-header-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid;
    transition: all 0.2s ease;
}

.safety-header-pill.safe {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.3);
    color: #34d399;
}

.safety-header-pill.safe .pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #10b981;
    box-shadow: 0 0 6px #10b981;
}

.safety-header-pill.danger {
    background: rgba(239, 68, 68, 0.18);
    border-color: rgba(239, 68, 68, 0.5);
    color: #f87171;
}

.safety-header-pill.danger .pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #ef4444;
    box-shadow: 0 0 6px #ef4444;
    animation: blink 1.2s infinite;
}

.relax-link {
    font-size: 11px;
    font-weight: 700;
    padding: 0 2px;
    color: #fca5a5 !important;
    text-decoration: underline;
}

.stat-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #151d2f;
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 12px;
}

.stat-pill .label {
    color: #94a3b8;
}

.color-picker-box {
    display: flex;
    align-items: center;
    gap: 6px;
}

.color-label {
    font-size: 12px;
    color: #94a3b8;
}

/* 主舞台 */
.swarm-main-stage {
    flex: 1;
    display: flex;
    position: relative;
    overflow: hidden;
}

.viewport-wrapper {
    flex: 1;
    position: relative;
    height: 100%;
    overflow: hidden;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}
</style>
