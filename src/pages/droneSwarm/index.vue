<template>
    <div class="drone-swarm-workbench">
        <!-- 1. 顶部应用栏：文档身份 + 全局状态 + 视图模式 -->
        <header class="swarm-header">
            <div class="header-brand">
                <div class="brand-logo">
                    <el-icon :size="19"><Compass /></el-icon>
                </div>
                <div class="brand-titles">
                    <div class="title-row">
                        <span class="main-title">SwarmStudio</span>
                        <span class="title-divider">/</span>
                        <span class="main-title-sub">无人机编队设计平台</span>
                        <span class="version-chip">SHOW · V1</span>
                    </div>
                    <span class="sub-title">2D 创意点阵 · 3D 夜空预演 · 分镜时间轴 · 工程数据导出</span>
                </div>
            </div>

            <div class="header-actions">
                <div
                    class="safety-header-pill"
                    :class="safetyReport.isSafe ? 'safe' : 'danger'"
                    :title="safetyReport.isSafe ? `2D 设计态最小间距 ${Number.isFinite(safetyReport.minObservedDistance) ? safetyReport.minObservedDistance.toFixed(2) + 'm' : '—'}（非飞行安全认证）` : `存在 ${safetyReport.collisionCount} 对点位间距小于 1.5m`"
                >
                    <span class="pill-dot"></span>
                    <span class="pill-text">{{ safetyReport.isSafe ? '间距校验通过' : `${safetyReport.collisionCount} 对过密` }}</span>
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
                    <span class="label">架数</span>
                    <el-select v-model="droneCount" size="small" style="width: 92px" @change="handleCountChange">
                        <el-option :value="400" label="400 架" />
                        <el-option :value="800" label="800 架" />
                        <el-option :value="1600" label="1600 架" />
                    </el-select>
                </div>

                <div class="color-picker-box" title="统一调节当前图层无人机 LED 颜色">
                    <span class="color-label">LED</span>
                    <el-color-picker
                        v-model="currentLedColor"
                        size="small"
                        :show-alpha="false"
                        @change="handleLedColorChange"
                    />
                </div>

                <el-button
                    size="small"
                    :type="rightRailOpen ? 'primary' : 'default'"
                    @click="rightRailOpen = !rightRailOpen"
                >
                    📐 分布 · 上色
                </el-button>

                <div class="view-switch">
                    <el-segmented
                        v-model="viewMode"
                        :options="[
                            { label: '2D 编辑', value: '2d' },
                            { label: '3D 预演', value: '3d' },
                        ]"
                        size="small"
                    />
                </div>
            </div>
        </header>

        <!-- 2. 工具条：几何基元与图像转构型入口 -->
        <div class="swarm-toolbar">
            <div class="toolbar-group">
                <span class="preset-label">几何基元</span>
                <el-button-group class="preset-group">
                    <el-button
                        size="small"
                        :type="currentMotif === 'heart' ? 'primary' : 'default'"
                        @click="applyPreset('heart')"
                    >
                        爱心
                    </el-button>
                    <el-button
                        size="small"
                        :type="currentMotif === 'star' ? 'primary' : 'default'"
                        @click="applyPreset('star')"
                    >
                        星芒
                    </el-button>
                    <el-button
                        size="small"
                        :type="currentMotif === 'galaxy' ? 'primary' : 'default'"
                        @click="applyPreset('galaxy')"
                    >
                        祥龙星系
                    </el-button>
                    <el-button
                        size="small"
                        :type="currentMotif === 'rings' ? 'primary' : 'default'"
                        @click="applyPreset('rings')"
                    >
                        光环
                    </el-button>
                    <el-button
                        v-if="currentMotif === 'custom'"
                        size="small"
                        type="success"
                    >
                        自定义构型
                    </el-button>
                </el-button-group>

                <span class="toolbar-sep"></span>

                <el-upload
                    action=""
                    :auto-upload="false"
                    :show-file-list="false"
                    accept="image/*"
                    :on-change="handleImageUpload"
                    class="upload-btn"
                >
                    <el-button class="import-btn" size="small" type="warning" plain>
                        <el-icon><Upload /></el-icon>
                        <span>导入图片构型</span>
                    </el-button>
                </el-upload>
            </div>

            <div class="toolbar-right">
                <div class="toolbar-meta">
                    <span class="meta-item"><span class="meta-dot"></span>{{ droneCount }} 架 · {{ showProject.scenes.length }} 分镜</span>
                    <span class="meta-item meta-item--muted">设计态工作台</span>
                </div>
                <el-button class="export-btn" size="small" @click="handleExportProject">
                    <el-icon><Download /></el-icon>
                    <span>导出工程</span>
                </el-button>
            </div>
        </div>

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
                    ref="editor2dStage"
                    v-show="viewMode === '2d'"
                    :agents="visibleAgents"
                    :danger-ids="safetyReport.dangerIds"
                    :locked-layer-ids="lockedLayerIds"
                    :can-undo="undoStack.length > 0"
                    :can-redo="redoStack.length > 0"
                    @select-agent="handleSelectAgent"
                    @auto-relax="handleAutoRelax"
                    @move-agents="handleMoveAgents"
                    @nudge-agents="handleNudgeAgents"
                    @delete-agents="handleDeleteAgents"
                    @assign-layer="handleAssignSelectionToLayer"
                    @undo="handleUndo"
                    @redo="handleRedo"
                    @lasso-complete="handleLassoComplete"
                    @gradient-axis-change="handleGradientAxisChange"
                    @gradient-axis-commit="handleGradientAxisCommit"
                />

                <!-- 3D Three.js 夜空发光无人机全景播放器 -->
                <Player3D
                    v-if="viewMode === '3d'"
                    :agents="currentScene.agents"
                    :drone-count="droneCount"
                />
            </div>

            <!-- 右侧统一属性工具栏 (分布 / 上色) -->
            <RightToolRail
                v-if="rightRailOpen && viewMode === '2d'"
                v-model="rightRailTab"
                @close="rightRailOpen = false"
            >
                <template #distribution>
                    <DistributionPanel
                        :target-label="distributionTargetInfo.label"
                        :target-count="distributionTargetInfo.count"
                        :lasso-count="lassoPathIds.length"
                        :lasso-recording="isLassoRecording"
                        @activate-lasso="handleActivateLasso"
                        @execute-curve-resample="handleCurveResample"
                        @apply-geometry="handleApplyGeometry"
                        @apply-fill="handleApplyFill"
                    />
                </template>
                <template #color>
                    <ColorPanel
                        :target-label="distributionTargetInfo.label"
                        :selection-count="distributionTargetInfo.count"
                        :axis-angle="liveAxisAngle"
                        :canvas-axis-active="canvasAxisActive"
                        @apply-single="handleApplySingleColor"
                        @apply-gradient="handleApplyGradientStatic"
                        @apply-random="handleApplyRandomColor"
                        @toggle-canvas-axis="handleToggleCanvasAxis"
                        @angle-sync="handleAngleSync"
                        @stops-change="handleStopsChange"
                        @toggle-hide-selection="handleToggleHideSelection"
                    />
                </template>
            </RightToolRail>
        </main>

        <!-- 3. 底部分镜时间轴控制栏 -->
        <TimelineBar
            :scenes="showProject.scenes"
            :active-scene-index="activeSceneIndex"
            @select-scene="handleSelectScene"
            @add-scene="handleAddScene"
            @export-sdf="handleExportProject"
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
import { Compass, Download, Upload } from '@element-plus/icons-vue';

import { createShow, createScene, createAgent } from './types/swarm';
import { useContourAlgorithm } from './composables/useContourAlgorithm';
import { useSpatialGrid } from './composables/useSpatialGrid';

import Editor2D from './components/Editor2D.vue';
import Player3D from './components/Player3D.vue';
import TimelineBar from './components/TimelineBar.vue';
import MotifLayerPanel from './components/MotifLayerPanel.vue';
import ImageProcessingModal from './components/ImageProcessingModal.vue';
import RightToolRail from './components/RightToolRail.vue';
import DistributionPanel from './components/DistributionPanel.vue';
import ColorPanel from './components/ColorPanel.vue';

import {
    catmullRomEquidistantResample,
    generateGeometryCurves,
    sampleCurvesExact,
    generateFillPoints,
    calculatePrincipalAxis,
} from './composables/useDistributionEngine';
import { computeGradientColors, defaultGradientStops } from './composables/useLedSafety';

// 🌟 Vue 3.5 原生专属 Hook: useTemplateRef 绑定组件实例
const imageWizardRef = useTemplateRef('imageWizardModal');
const editor2DRef = useTemplateRef('editor2dStage');

// 核心算法 Hooks
const { generatePresetPattern, resampleToTargetCount } = useContourAlgorithm();
const { checkSafety, relaxCollisions } = useSpatialGrid();

// 视口与项目状态
const viewMode = ref('2d');
const droneCount = ref(800);
const currentMotif = ref('heart');
const currentLedColor = ref('#00f2fe');
const activeSceneIndex = ref(0);
const selectedLayerId = ref('layer_main');

// 右侧属性工具栏 (分布 / 上色) 状态
const rightRailOpen = ref(false);
const rightRailTab = ref('distribution');
const lassoPathIds = ref([]);
const isLassoRecording = ref(false);
const canvasAxisActive = ref(false);
const liveAxisAngle = ref(90);
const currentGradientStops = ref(defaultGradientStops);

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
        name: '主图形层',
        agentCount: 800,
        color: '#00f2fe',
        visible: true,
        locked: false,
    },
]);

// 实时 1.5m 设计态间距校验（含隐藏图层，校验对象始终是完整分镜）
const safetyReport = computed(() => {
    const agents = currentScene.value.agents || [];
    return checkSafety(agents, 1.5);
});

// 图层的可见/锁定状态现在真实参与渲染与编辑
const visibleAgents = computed(() => {
    const visibleLayerIds = new Set(currentLayers.filter((layer) => layer.visible).map((layer) => layer.id));
    return (currentScene.value.agents || []).filter((agent) =>
        visibleLayerIds.has(agent.layerId || 'layer_main')
    );
});

const lockedLayerIds = computed(() =>
    currentLayers.filter((layer) => layer.locked).map((layer) => layer.id)
);

// ------------------------------------------------------------------------
// 命令式撤销/重做：点位编辑记录增量，结构性替换记录分镜快照
// ------------------------------------------------------------------------
const undoStack = ref([]);
const redoStack = ref([]);
const HISTORY_LIMIT = 80;

function cloneAgent(agent) {
    return {
        id: agent.id,
        x: agent.x,
        y: agent.y,
        z: agent.z,
        color: agent.color,
        layerId: agent.layerId || 'layer_main',
        group: agent.group,
        size: agent.size,
        alpha: agent.alpha,
    };
}

function pushCommand(command) {
    if (!command) return;
    undoStack.value.push(command);
    if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift();
    redoStack.value = [];
}

function getSceneById(sceneId) {
    return showProject.scenes.find((scene) => scene.id === sceneId);
}

function focusScene(sceneId) {
    const sceneIndex = showProject.scenes.findIndex((scene) => scene.id === sceneId);
    if (sceneIndex >= 0) {
        activeSceneIndex.value = sceneIndex;
        currentMotif.value = showProject.scenes[sceneIndex].motifType || 'custom';
    }
    updateLayerCount();
}

function applyChangeSet(sceneId, changes, direction) {
    const scene = getSceneById(sceneId) || currentScene.value;
    const agentMap = new Map((scene.agents || []).map((agent) => [agent.id, agent]));
    for (const change of changes) {
        const agent = agentMap.get(change.id);
        if (!agent) continue;
        Object.assign(agent, direction === 'undo' ? change.before : change.after);
    }
    updateLayerCount();
}

function recordReplace(label, beforeAgents, afterAgents) {
    pushCommand({
        type: 'replace',
        label,
        sceneId: currentScene.value.id,
        before: beforeAgents.map(cloneAgent),
        after: afterAgents.map(cloneAgent),
    });
}

function isAgentInLockedLayer(agent) {
    const layerId = agent?.layerId || 'layer_main';
    return currentLayers.some((layer) => layer.id === layerId && layer.locked);
}

function getLockedPopulatedLayers() {
    const populated = new Set((currentScene.value.agents || []).map((agent) => agent.layerId || 'layer_main'));
    return currentLayers.filter((layer) => layer.locked && populated.has(layer.id));
}

// 结构级替换（预设、重采样、图像构型、整体疏散）会覆盖整层点位，必须先解锁。
function guardLockedStructure(action) {
    const locked = getLockedPopulatedLayers();
    if (locked.length === 0) return false;
    ElMessage.warning(`图层「${locked.map((layer) => layer.name).join('、')}」已锁定，无法${action}。请先解锁。`);
    return true;
}

function applyAgentUpdates(updates, options = {}) {
    const { label = '编辑点位', record = true } = options;
    const agentMap = new Map((currentScene.value.agents || []).map((agent) => [agent.id, agent]));
    const changes = [];

    for (const update of updates) {
        const agent = agentMap.get(update.id);
        if (!agent) continue;
        if (isAgentInLockedLayer(agent)) continue;

        const before = cloneAgent(agent);
        const after = cloneAgent(agent);
        if (Number.isFinite(update.x)) after.x = Math.round(update.x * 100) / 100;
        if (Number.isFinite(update.y)) after.y = Math.round(update.y * 100) / 100;
        if (Number.isFinite(update.z)) after.z = Math.round(update.z * 100) / 100;
        if (update.color) after.color = update.color;
        if (update.layerId) after.layerId = update.layerId;

        const changed = ['x', 'y', 'z', 'color', 'layerId'].some((key) => before[key] !== after[key]);
        if (!changed) continue;

        Object.assign(agent, after);
        changes.push({ id: agent.id, before, after });
    }

    if (record && changes.length > 0) {
        pushCommand({ type: 'patch', label, sceneId: currentScene.value.id, changes });
    }
    updateLayerCount();
    return changes.length;
}

function handleUndo() {
    const command = undoStack.value.pop();
    if (!command) return;

    if (command.type === 'patch') {
        applyChangeSet(command.sceneId, command.changes, 'undo');
        focusScene(command.sceneId);
    } else if (command.type === 'replace') {
        const scene = showProject.scenes.find((item) => item.id === command.sceneId);
        if (scene) {
            scene.agents = command.before.map((agent) => createAgent({ ...agent }));
            const sceneIndex = showProject.scenes.indexOf(scene);
            if (sceneIndex !== activeSceneIndex.value) activeSceneIndex.value = sceneIndex;
        }
    }

    redoStack.value.push(command);
    updateLayerCount();
}

function handleRedo() {
    const command = redoStack.value.pop();
    if (!command) return;

    if (command.type === 'patch') {
        applyChangeSet(command.sceneId, command.changes, 'redo');
        focusScene(command.sceneId);
    } else if (command.type === 'replace') {
        const scene = showProject.scenes.find((item) => item.id === command.sceneId);
        if (scene) {
            scene.agents = command.after.map((agent) => createAgent({ ...agent }));
            const sceneIndex = showProject.scenes.indexOf(scene);
            if (sceneIndex !== activeSceneIndex.value) activeSceneIndex.value = sceneIndex;
        }
    }

    undoStack.value.push(command);
    updateLayerCount();
}

// 一键确定性疏散：疏散后必须重新校验，失败就明确失败
function handleAutoRelax() {
    const currentAgents = currentScene.value.agents || [];
    if (currentAgents.length === 0) return;

    if (guardLockedStructure('整体疏散')) return;

    const result = relaxCollisions(currentAgents, 1.5, 80);
    applyAgentUpdates(
        result.agents.map((agent) => ({ id: agent.id, x: agent.x, y: agent.y })),
        { label: '间距疏散' }
    );

    if (result.report.isSafe) {
        ElMessage.success(
            `疏散完成：${result.iterationsRun} 轮，最小间距 ${result.report.minObservedDistance.toFixed(2)}m`
        );
    } else {
        ElMessage.warning(
            `疏散后仍有 ${result.report.collisionCount} 对过近点位，最小间距 ${result.report.minObservedDistance.toFixed(2)}m。请增大跨度或减少架数。`
        );
    }
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
    const counts = new Map();
    for (const agent of currentScene.value.agents || []) {
        const layerId = agent.layerId || 'layer_main';
        counts.set(layerId, (counts.get(layerId) || 0) + 1);
    }
    for (const layer of currentLayers) {
        layer.agentCount = counts.get(layer.id) || 0;
    }
}

// 切换几何预设母题
function applyPreset(motifType) {
    if (guardLockedStructure('应用基元覆盖构型')) return;
    currentMotif.value = motifType;
    const beforeAgents = currentScene.value.agents.map(cloneAgent);
    const newPoints = generatePresetPattern(motifType, droneCount.value);
    currentScene.value.agents = newPoints.map((point) =>
        createAgent({ ...point, color: currentLedColor.value, layerId: selectedLayerId.value || 'layer_main' })
    );
    currentScene.value.motifType = motifType;
    updateLayerCount();
    recordReplace(`应用基元 ${motifType}`, beforeAgents, currentScene.value.agents);

    ElMessage.success({
        message: `已应用基元构型: ${motifType} (${currentScene.value.agents.length} 架无人机)`,
        duration: 1500,
    });
}

// 调整无人机总架数标定
function handleCountChange(newCount) {
    const beforeAgents = currentScene.value.agents.map(cloneAgent);
    if (guardLockedStructure('重采样架数')) return;
    showProject.droneCount = newCount;
    if (currentMotif.value === 'custom') {
        // 自定义构型：确定性重采样，保留图层归属与原色。
        currentScene.value.agents = resampleToTargetCount(currentScene.value.agents, newCount).map((point, index) =>
            createAgent({
                ...point,
                id: point.id || `uav_${index + 1}`,
                layerId: point.layerId || selectedLayerId.value || 'layer_main',
            })
        );
        updateLayerCount();
        recordReplace(`重采样至 ${newCount} 架`, beforeAgents, currentScene.value.agents);
        ElMessage.success(`已确定性重采样至 ${currentScene.value.agents.length} 架无人机`);
    } else {
        applyPreset(currentMotif.value);
    }
}

// 修改当前分镜 LED 颜色
function handleLedColorChange(newColor) {
    if (!newColor) return;
    const layer = currentLayers.find((item) => item.id === selectedLayerId.value);
    if (!layer) return;
    if (layer.locked) {
        ElMessage.warning('当前图层已锁定，请先解锁再修改颜色');
        return;
    }
    layer.color = newColor;
    const updates = currentScene.value.agents
        .filter((agent) => (agent.layerId || 'layer_main') === layer.id)
        .map((agent) => ({ id: agent.id, color: newColor }));
    applyAgentUpdates(updates, { label: '修改图层 LED 颜色' });
}

// 切换当前激活分镜
function handleSelectScene(index) {
    activeSceneIndex.value = index;
    currentMotif.value = currentScene.value.motifType || 'custom';
    const layer = currentLayers.find((item) => item.id === selectedLayerId.value) || currentLayers[0];
    if (layer) {
        selectedLayerId.value = layer.id;
        currentLedColor.value = layer.color;
    }
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
        agents: generatePresetPattern('rings', droneCount.value).map((point) =>
            createAgent({ ...point, layerId: 'layer_main' })
        ),
    });
    showProject.scenes.push(newScene);
    activeSceneIndex.value = showProject.scenes.length - 1;
    updateLayerCount();
    selectedLayerId.value = 'layer_main';
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
    if (guardLockedStructure('应用图像构型')) return;
    const beforeAgents = currentScene.value.agents.map(cloneAgent);
    const layerId = selectedLayerId.value || 'layer_main';
    currentScene.value.agents = agents.map((agent) =>
        createAgent({ ...agent, layerId, group: strategy || 'default' })
    );
    currentScene.value.name = `自定义构型 (${strategy} / ${mode})`;
    currentScene.value.motifType = 'custom';
    currentMotif.value = 'custom';
    // 同步工作台总架数标定
    droneCount.value = currentScene.value.agents.length;
    showProject.droneCount = currentScene.value.agents.length;
    updateLayerCount();
    recordReplace('应用图像构型', beforeAgents, currentScene.value.agents);

    const report = checkSafety(currentScene.value.agents, 1.5);

    ElNotification({
        title: 'SwarmStudio 构型与原色赋色成功',
        message: `成功导入 ${currentScene.value.agents.length} 架无人机点位。设计态最小间距 ${Number.isFinite(report.minObservedDistance) ? report.minObservedDistance.toFixed(2) : '—'}m，${
            report.isSafe ? '间距校验通过' : `${report.collisionCount} 对点位小于 1.5m`
        }。`,
        type: report.isSafe ? 'success' : 'warning',
        duration: 4000,
    });
}

// 图层操作
function handleSelectLayer(layerId) {
    selectedLayerId.value = layerId;
    const layer = currentLayers.find((item) => item.id === layerId);
    if (layer) currentLedColor.value = layer.color;
}

function handleUpdateLayer(layer) {
    if (!layer || !layer.color) return;

    const updates = currentScene.value.agents
        .filter((agent) => (agent.layerId || 'layer_main') === layer.id && agent.color !== layer.color)
        .map((agent) => ({ id: agent.id, color: layer.color }));
    if (layer.locked && updates.length > 0) {
        ElMessage.warning('该图层已锁定，无法修改颜色。请先解锁。');
        return;
    }
    currentLedColor.value = layer.color;
    if (updates.length > 0) {
        applyAgentUpdates(updates, { label: `修改图层 ${layer.name} 颜色` });
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
    ElMessage.success('已新建空图层。在 2D 画布框选点位后点击“移入当前图层”。');
}

function handleDeleteLayer(layerId) {
    if (currentLayers.length <= 1) {
        ElMessage.warning('请至少保留一个主构型图层！');
        return;
    }
    const layer = currentLayers.find((item) => item.id === layerId);
    if (layer && layer.agentCount > 0) {
        ElMessage.warning('该图层仍有无人机点位，请先框选并移入其他图层后再删除');
        return;
    }
    const idx = currentLayers.findIndex((l) => l.id === layerId);
    if (idx !== -1) {
        currentLayers.splice(idx, 1);
        selectedLayerId.value = currentLayers[0].id;
        currentLedColor.value = currentLayers[0].color;
        updateLayerCount();
        ElMessage.success('已删除图层！');
    }
}

// 选中某个无人机点位
function handleSelectAgent(agent) {
    const layer = currentLayers.find((item) => item.id === (agent.layerId || 'layer_main'));
    ElMessage.info(
        `选中无人机 ${agent.id} · ${layer?.name || '未分组'} · X ${Number(agent.x).toFixed(2)}m / Y ${Number(agent.y).toFixed(2)}m`
    );
}

// 2D 画布移动/微移/删除/图层归属
function handleMoveAgents(updates) {
    if (!Array.isArray(updates) || updates.length === 0) return;
    applyAgentUpdates(updates, { label: '移动点位' });
}

function handleNudgeAgents(payload) {
    const { ids = [], dx = 0, dy = 0 } = payload || {};
    if (ids.length === 0 || (dx === 0 && dy === 0)) return;
    const agentMap = new Map(currentScene.value.agents.map((agent) => [agent.id, agent]));
    const updates = ids
        .map((id) => agentMap.get(id))
        .filter(Boolean)
        .map((agent) => ({ id: agent.id, x: agent.x + dx, y: agent.y + dy }));
    applyAgentUpdates(updates, { label: '微调点位' });
}

function handleDeleteAgents(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const removeIds = new Set(ids);
    const beforeAgents = currentScene.value.agents.map(cloneAgent);
    currentScene.value.agents = currentScene.value.agents.filter(
        (agent) => !removeIds.has(agent.id) || isAgentInLockedLayer(agent)
    );
    updateLayerCount();
    const removedCount = beforeAgents.length - currentScene.value.agents.length;
    if (removedCount === 0) {
        ElMessage.warning('所选点位位于锁定图层，未执行删除。请先解锁图层。');
        return;
    }
    recordReplace(`删除 ${removedCount} 个点位`, beforeAgents, currentScene.value.agents);
    ElMessage.success(`已删除 ${removedCount} 个点位，可 Ctrl+Z 撤销`);
}

function handleAssignSelectionToLayer(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const layer = currentLayers.find((item) => item.id === selectedLayerId.value);
    if (!layer) return;
    if (layer.locked) {
        ElMessage.warning('当前图层已锁定，请先解锁');
        return;
    }
    const updates = ids.map((id) => ({ id, layerId: layer.id }));
    const changed = applyAgentUpdates(updates, { label: `移入图层 ${layer.name}` });
    ElMessage.success(`已将 ${changed} 个点位移入「${layer.name}」`);
}

// ========================================================================
// 右侧工具栏：分布与等距重排 (Ordered Lasso & Geometries)
// ========================================================================
function getDistributionTargets() {
    const selected = editor2DRef.value?.selectedIds || new Set();
    const hasSelection = selected.size > 0;
    const currentList = currentScene.value.agents || [];
    const pool = hasSelection
        ? currentList.filter((a) => selected.has(a.id))
        : currentList.filter((a) => (a.layerId || 'layer_main') === selectedLayerId.value);
    const unlocked = pool.filter((a) => !isAgentInLockedLayer(a));
    const currentLayerName = currentLayers.find((l) => l.id === selectedLayerId.value)?.name || '主图形层';
    return {
        agents: unlocked,
        label: hasSelection ? `已选点位 (${unlocked.length}架)` : `${currentLayerName} (${unlocked.length}架)`,
        hasSelection,
    };
}

const distributionTargetInfo = computed(() => {
    const targets = getDistributionTargets();
    return {
        label: targets.label,
        count: targets.agents.length,
    };
});

function handleActivateLasso() {
    isLassoRecording.value = true;
    editor2DRef.value?.setToolMode('lasso');
    ElMessage.info('已开启圈选：请按连线走向划过点位');
}

function handleLassoComplete(ids) {
    lassoPathIds.value = ids;
    isLassoRecording.value = false;
    editor2DRef.value?.setToolMode('select');
    ElMessage.success(`圈选完成：按顺序捕获 ${ids.length} 架点位`);
}

function handleCurveResample({ smoothness = 0.5 }) {
    if (lassoPathIds.value.length < 2) {
        ElMessage.warning('请先点击「按顺序圈选」并划过至少 2 个点位');
        return;
    }
    const agentMap = new Map((currentScene.value.agents || []).map((a) => [a.id, a]));
    const ordered = lassoPathIds.value.map((id) => agentMap.get(id)).filter(Boolean);

    const resampled = catmullRomEquidistantResample(ordered, ordered.length, smoothness);
    const updates = ordered.map((agent, i) => ({
        id: agent.id,
        x: resampled[i].x,
        y: resampled[i].y,
    }));
    applyAgentUpdates(updates, { label: `曲线等距重排 ${updates.length} 点` });
    lassoPathIds.value = [];
    ElMessage.success(`等距重排完成：${updates.length} 架点位已沿向心样条均匀排布`);
}

function handleApplyGeometry({ type, params = {} }) {
    const { agents } = getDistributionTargets();
    if (agents.length < 2) {
        ElMessage.warning('目标点位不足 2 架，请先框选或选择有点位的图层');
        return;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const a of agents) {
        if (a.x < minX) minX = a.x;
        if (a.x > maxX) maxX = a.x;
        if (a.y < minY) minY = a.y;
        if (a.y > maxY) maxY = a.y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const spanX = Math.max(maxX - minX, 10);
    const spanY = Math.max(maxY - minY, 10);
    const axis = calculatePrincipalAxis(agents);

    let curves = [];
    if (type === 'line') {
        const half = (Math.abs(spanX * axis.ux) + Math.abs(spanY * axis.uy) || 20) * 1.1 / 2;
        curves = generateGeometryCurves('line', {
            x1: cx - axis.ux * half,
            y1: cy - axis.uy * half,
            x2: cx + axis.ux * half,
            y2: cy + axis.uy * half,
        });
    } else if (type === 'polyline') {
        curves = generateGeometryCurves('polyline', {
            points: agents.map((a) => ({ x: a.x, y: a.y })),
        });
    } else if (type === 'rect') {
        curves = generateGeometryCurves('rect', {
            cx,
            cy,
            width: spanX * 1.1,
            height: spanY * 1.1,
            angleDeg: (axis.theta * 180) / Math.PI,
        });
    } else if (type === 'circle') {
        curves = generateGeometryCurves('circle', {
            cx,
            cy,
            radius: Math.max(Math.min(spanX, spanY) / 2, 10) * 1.1,
        });
    } else if (type === 'arc') {
        curves = generateGeometryCurves('arc', {
            cx,
            cy,
            radius: Math.max(Math.min(spanX, spanY) / 2, 10) * 1.1,
            startDeg: params.startDeg ?? 0,
            sweepDeg: params.sweepDeg ?? 180,
        });
    } else if (type === 'cross') {
        curves = generateGeometryCurves('cross', {
            cx,
            cy,
            size: Math.max(spanX, spanY) * 1.1,
            angleDeg: (axis.theta * 180) / Math.PI,
        });
    } else if (type === 'polygon') {
        curves = generateGeometryCurves('polygon', {
            cx,
            cy,
            radius: Math.max(Math.min(spanX, spanY) / 2, 10) * 1.1,
            sides: params.sides || 6,
            angleDeg: (axis.theta * 180) / Math.PI,
        });
    } else if (type === 'star') {
        curves = generateGeometryCurves('star', {
            cx,
            cy,
            outerRadius: Math.max(Math.min(spanX, spanY) / 2, 10) * 1.15,
            innerRatio: params.innerRatio || 0.5,
            pointsCount: params.pointsCount || 5,
        });
    }

    const sampled = sampleCurvesExact(curves, agents.length);
    const updates = agents.map((a, i) => ({
        id: a.id,
        x: sampled[i].x,
        y: sampled[i].y,
    }));
    applyAgentUpdates(updates, { label: `几何排布「${type}」` });
    ElMessage.success(`基础几何「${type}」重排完成 (${updates.length} 架)`);
}

function handleApplyFill(mode) {
    const { agents } = getDistributionTargets();
    if (agents.length < 3) {
        ElMessage.warning('目标点位不足 3 架');
        return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const a of agents) {
        if (a.x < minX) minX = a.x;
        if (a.x > maxX) maxX = a.x;
        if (a.y < minY) minY = a.y;
        if (a.y > maxY) maxY = a.y;
    }
    const fillPoints = generateFillPoints({
        minX,
        maxX,
        minY,
        maxY,
        count: agents.length,
        mode,
    });
    const updates = agents.map((a, i) => ({
        id: a.id,
        x: fillPoints[i].x,
        y: fillPoints[i].y,
    }));
    applyAgentUpdates(updates, { label: `区域填充「${mode}」` });
    ElMessage.success(`区域${mode === 'hexagonal' ? '六边形蜂窝' : '网格'}充填完成 (${updates.length} 架)`);
}

// ========================================================================
// 右侧工具栏：LED 灯光调色与防呆 (Color & LED Safety)
// ========================================================================
function handleApplySingleColor(colorHex) {
    const { agents } = getDistributionTargets();
    if (agents.length === 0) return;
    const updates = agents.map((a) => ({ id: a.id, color: colorHex }));
    applyAgentUpdates(updates, { label: `单色上色 ${colorHex}` });
    ElMessage.success(`已为 ${updates.length} 架点位应用单色 ${colorHex.toUpperCase()}`);
}

function handleApplyGradientStatic({ stops, angleDeg = 90, repeat = false }) {
    const { agents } = getDistributionTargets();
    if (agents.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const a of agents) {
        if (a.x < minX) minX = a.x;
        if (a.x > maxX) maxX = a.x;
        if (a.y < minY) minY = a.y;
        if (a.y > maxY) maxY = a.y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rad = (angleDeg * Math.PI) / 180;
    const half = (Math.max(maxX - minX, maxY - minY, 40) * 1.1) / 2;

    const axis = {
        startX: cx - Math.cos(rad) * half,
        startY: cy - Math.sin(rad) * half,
        endX: cx + Math.cos(rad) * half,
        endY: cy + Math.sin(rad) * half,
    };

    const colorMap = computeGradientColors(agents, axis, stops, repeat);
    const updates = agents.map((a) => ({
        id: a.id,
        color: colorMap.get(a.id) || a.color,
    }));
    applyAgentUpdates(updates, { label: `正交渐变上色 (${angleDeg}°)` });
    ElMessage.success(`物理空间正交渐变上色已应用 (${updates.length} 架)`);
}

function handleApplyRandomColor() {
    const { agents } = getDistributionTargets();
    if (agents.length === 0) return;
    const palette = ['#ffffff', '#00f2fe', '#2dff6a', '#2454ff', '#ff007f', '#ffe600', '#ff5500'];
    const updates = agents.map((a) => {
        const c = palette[Math.floor(Math.random() * palette.length)];
        return { id: a.id, color: c };
    });
    applyAgentUpdates(updates, { label: '离散随机打散上色' });
    ElMessage.success(`已完成 ${updates.length} 架点位高频随机上色`);
}

function handleToggleCanvasAxis(active) {
    canvasAxisActive.value = active;
    if (active) {
        const { agents } = getDistributionTargets();
        let minX = -40, maxX = 40, minY = -40, maxY = 40;
        if (agents.length > 0) {
            minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
            for (const a of agents) {
                if (a.x < minX) minX = a.x;
                if (a.x > maxX) maxX = a.x;
                if (a.y < minY) minY = a.y;
                if (a.y > maxY) maxY = a.y;
            }
        }
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rad = (liveAxisAngle.value * Math.PI) / 180;
        const half = (Math.max(maxX - minX, maxY - minY, 50) * 1.1) / 2;

        editor2DRef.value?.setGradientAxis({
            startX: cx - Math.cos(rad) * half,
            startY: cy - Math.sin(rad) * half,
            endX: cx + Math.cos(rad) * half,
            endY: cy + Math.sin(rad) * half,
        });
        ElMessage.info('已在画布开启交互渐变轴：可直接拖拽手柄旋转或移动');
    } else {
        editor2DRef.value?.clearGradientAxis();
    }
}

function handleGradientAxisChange(axis) {
    liveAxisAngle.value = axis.angleDeg;
    const { agents } = getDistributionTargets();
    if (agents.length === 0) return;
    const colorMap = computeGradientColors(agents, axis, currentGradientStops.value, false);
    for (const a of agents) {
        const c = colorMap.get(a.id);
        if (c) a.color = c;
    }
}

function handleGradientAxisCommit(axis) {
    const { agents } = getDistributionTargets();
    if (agents.length === 0) return;
    const colorMap = computeGradientColors(agents, axis, currentGradientStops.value, false);
    const updates = agents.map((a) => ({
        id: a.id,
        color: colorMap.get(a.id) || a.color,
    }));
    applyAgentUpdates(updates, { label: `渐变轴上色 (${axis.angleDeg}°)` });
}

function handleAngleSync(deg) {
    liveAxisAngle.value = deg;
    if (canvasAxisActive.value) {
        handleToggleCanvasAxis(true);
    }
}

function handleStopsChange(stops) {
    currentGradientStops.value = stops;
}

function handleToggleHideSelection(hide) {
    editor2DRef.value?.setHideSelectionVisual(hide);
}

// 导出工程 JSON（当前格式，不是工业 SDF / 飞控协议）
function handleExportProject() {
    const exportData = {
        meta: {
            app: 'SwarmStudio',
            format: 'SwarmStudio Project JSON',
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            totalDrones: currentScene.value.agents.length,
            sceneCount: showProject.scenes.length,
            safetyValidation: {
                checkedAgents: safetyReport.value.checkedAgents,
                minObservedDistance: Number.isFinite(safetyReport.value.minObservedDistance)
                    ? safetyReport.value.minObservedDistance
                    : null,
                threshold: 1.5,
                isSafe: safetyReport.value.isSafe,
                collisionPairs: safetyReport.value.collisionCount,
            },
        },
        layers: currentLayers.map((layer) => ({ ...layer })),
        project: showProject,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swarm_project_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    ElMessage.success('编队工程数据已导出（SwarmStudio Project JSON）');
}

onMounted(() => {
    initDefaultScenes();
});
</script>

<style scoped>
.drone-swarm-workbench {
    --swarm-surface: var(--el-bg-color);
    --swarm-border: var(--el-border-color-lighter);
    --swarm-radius-lg: 12px;
    --swarm-radius-md: 8px;
    --swarm-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 32px -24px rgba(15, 23, 42, 0.5);

    width: 100%;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--el-bg-color-page);
    color: var(--el-text-color-primary);
    font-family: var(--app-font-family);
    transition: background-color 0.3s ease, color 0.3s ease;
}

/* 顶部应用栏 */
.swarm-header {
    flex: 0 0 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 16px;
    background: var(--swarm-surface);
    border-bottom: 1px solid var(--swarm-border);
    position: relative;
    z-index: 20;
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.header-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.brand-logo {
    position: relative;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    color: #ffffff;
    background: linear-gradient(140deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 62%, #22d3ee 100%);
    box-shadow: 0 8px 18px -10px var(--el-color-primary), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.brand-logo::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid rgba(255, 255, 255, 0.22);
}

.brand-titles {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.title-row {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
}

.main-title {
    font-size: 15px;
    font-weight: 750;
    letter-spacing: 0.2px;
    line-height: 1.2;
    color: var(--el-text-color-primary);
}

.title-divider {
    font-size: 12px;
    color: var(--el-border-color);
}

.main-title-sub {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-regular);
    white-space: nowrap;
}

.version-chip {
    margin-left: 2px;
    padding: 2px 6px;
    border-radius: 5px;
    font-family: var(--app-font-family-mono, monospace);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.6px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border: 1px solid var(--el-color-primary-light-8);
}

.sub-title {
    margin-top: 3px;
    font-size: 11px;
    line-height: 1.3;
    letter-spacing: 0.15px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
}

.safety-header-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid transparent;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    transition: all 0.2s ease;
}

.safety-header-pill .pill-text {
    line-height: 1;
}

.safety-header-pill.safe {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
    border-color: var(--el-color-success-light-7);
}

.safety-header-pill.danger {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
    border-color: var(--el-color-danger-light-7);
}

.pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
}

.safety-header-pill.safe .pill-dot {
    background: var(--el-color-success);
    box-shadow: 0 0 7px var(--el-color-success);
}

.safety-header-pill.danger .pill-dot {
    background: var(--el-color-danger);
    box-shadow: 0 0 7px var(--el-color-danger);
    animation: blink 1.2s infinite;
}

.relax-link {
    height: 20px;
    padding: 0 2px !important;
    font-size: 10px;
    font-weight: 700;
    color: var(--el-color-danger) !important;
    text-decoration: underline;
}

.stat-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 4px 0 10px;
    border-radius: var(--swarm-radius-md);
    border: 1px solid var(--swarm-border);
    background: var(--el-fill-color-light);
    font-size: 12px;
    white-space: nowrap;
    color: var(--el-text-color-primary);
}

.stat-pill .label {
    font-size: 11px;
    color: var(--el-text-color-secondary);
}

.stat-pill :deep(.el-select__wrapper) {
    min-height: 24px;
    padding: 0 6px;
    background: transparent;
    box-shadow: none !important;
    font-size: 12px;
}

.color-picker-box {
    display: flex;
    align-items: center;
    gap: 7px;
    height: 28px;
    padding: 0 8px;
    border-radius: var(--swarm-radius-md);
    border: 1px solid var(--swarm-border);
    background: var(--el-fill-color-lighter);
}

.color-label {
    font-size: 11px;
    color: var(--el-text-color-secondary);
}

.view-switch :deep(.el-segmented) {
    --el-segmented-item-selected-bg-color: var(--el-color-primary);
    --el-segmented-item-selected-color: #ffffff;

    padding: 2px;
    border-radius: var(--swarm-radius-md);
    background: var(--el-fill-color-light);
    font-size: 12px;
}

.view-switch :deep(.el-segmented__item) {
    height: 24px;
    line-height: 24px;
    padding: 0 10px;
}

/* 工具条 */
.swarm-toolbar {
    flex: 0 0 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 16px;
    background: var(--swarm-surface);
    border-bottom: 1px solid var(--swarm-border);
    position: relative;
    z-index: 19;
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.toolbar-group {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.preset-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.9px;
    text-transform: uppercase;
    color: var(--el-text-color-placeholder);
    white-space: nowrap;
}

.preset-group :deep(.el-button) {
    height: 28px;
    padding: 0 11px;
    border-radius: 0;
    font-size: 12px;
    font-weight: 500;
}

.preset-group :deep(.el-button:first-child) {
    border-radius: 6px 0 0 6px;
}

.preset-group :deep(.el-button:last-child) {
    border-radius: 0 6px 6px 0;
}

.preset-group :deep(.el-button--primary) {
    box-shadow: 0 4px 10px -6px var(--el-color-primary);
}

.toolbar-sep {
    width: 1px;
    height: 18px;
    flex-shrink: 0;
    background: var(--el-border-color-lighter);
}

.upload-btn {
    display: inline-flex;
}

.import-btn {
    height: 28px;
    border-radius: 6px;
    font-size: 12px;
}

.toolbar-meta {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 11px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 14px;
}

.export-btn {
    height: 28px;
    border-radius: 6px;
    font-size: 12px;
}

.meta-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.meta-item--muted {
    color: var(--el-text-color-placeholder);
}

.meta-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--el-color-success);
    box-shadow: 0 0 6px var(--el-color-success);
}

/* 主舞台 */
.swarm-main-stage {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 12px;
    position: relative;
    overflow: hidden;
    background: var(--el-bg-color-page);
}

.viewport-wrapper {
    flex: 1;
    min-width: 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--swarm-border);
    border-radius: var(--swarm-radius-lg);
    background: #080a10;
    box-shadow: var(--swarm-shadow);
}

.viewport-wrapper :deep(canvas) {
    display: block;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

@media (max-width: 1400px) {
    .sub-title { display: none; }
}

@media (max-width: 1180px) {
    .swarm-header { gap: 10px; }
    .toolbar-meta { display: none; }
    .main-title-sub,
    .title-divider { display: none; }
}

@media (max-width: 980px) {
    .preset-label,
    .version-chip,
    .color-picker-box { display: none; }
}
</style>
