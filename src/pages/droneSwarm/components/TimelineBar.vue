<template>
    <div class="timeline-bar-container">
        <!-- 1. 播放与时间控制区 -->
        <div class="playback-controls">
            <button
                class="play-toggle-btn"
                :class="{ 'is-playing': isPlaying }"
                :title="isPlaying ? '暂停' : '播放整场表演'"
                @click="togglePlay"
            >
                <svg v-if="isPlaying" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
            </button>

            <!-- 时间读数 -->
            <div class="time-display">
                <span class="current-time">{{ formatTime(currentTime) }}</span>
                <span class="slash">/</span>
                <span class="total-time">{{ formatTime(totalDuration) }}</span>
            </div>
        </div>

        <!-- 2. 中央分镜时序与动力学进度轨道 -->
        <div class="timeline-center-track">
            <!-- 连续时间滑块轨道 (Scrubber Bar) -->
            <div
                ref="scrubberBarRef"
                class="global-scrubber-bar"
                @mousedown="handleScrubberMouseDown"
            >
                <div class="scrubber-fill" :style="{ width: `${progressPercent}%` }"></div>
                <div class="scrubber-thumb" :style="{ left: `${progressPercent}%` }">
                    <span class="thumb-tip">{{ currentTime.toFixed(1) }}s</span>
                </div>
            </div>

            <!-- 分镜序列胶囊轨道 -->
            <div class="scenes-track">
                <div
                    v-for="(scene, index) in scenes"
                    :key="scene.id || index"
                    class="scene-capsule"
                    :class="{ 'is-active': activeSceneIndex === index }"
                    @click="handleCapsuleClick(index)"
                >
                    <!-- 极简矢量类型图标 -->
                    <div class="capsule-icon">
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6">
                            <rect v-if="scene.motifType === 'custom'" x="3" y="3" width="10" height="10" rx="1"/>
                            <polygon v-else-if="scene.motifType === 'star'" points="8 1 10 6 15 6 11 10 13 15 8 12 3 15 5 10 1 6 6 6 8 1"/>
                            <circle v-else cx="8" cy="8" r="6"/>
                        </svg>
                    </div>

                    <div class="capsule-content">
                        <div class="capsule-title-row">
                            <span class="capsule-name">{{ scene.name }}</span>
                            <span v-if="activeSceneIndex === index && isTransitioning" class="status-tag transition">
                                变轨航行 {{ (transitionRatio * 100).toFixed(0) }}%
                            </span>
                            <span v-else-if="activeSceneIndex === index" class="status-tag hold">
                                构型定格
                            </span>
                        </div>

                        <!-- 驻留 + 航行 分段刻度 -->
                        <div class="capsule-phases">
                            <span class="phase-badge hold">定格 {{ scene.duration || 5 }}s</span>
                            <span class="phase-arrow">➔</span>
                            <span class="phase-badge morph">航行 {{ scene.transitionTime || 3 }}s</span>
                        </div>
                    </div>

                    <span v-if="activeSceneIndex === index" class="active-indicator"></span>
                </div>

                <!-- 新增分镜按钮 -->
                <button class="add-scene-btn" @click="$emit('add-scene')">
                    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="8" y1="2" x2="8" y2="14"/>
                        <line x1="2" y1="8" x2="14" y2="8"/>
                    </svg>
                    <span>新增分镜</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
/**
 * 商业级无人机编队分镜时序与动力学进度控制栏 (CAD 工业级)
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue';

const props = defineProps({
    scenes: {
        type: Array,
        default: () => [],
    },
    activeSceneIndex: {
        type: Number,
        default: 0,
    },
});

const emit = defineEmits([
    'select-scene',
    'add-scene',
    'time-update',
    'export-sdf',
]);

const scrubberBarRef = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const isTransitioning = ref(false);
const transitionRatio = ref(0);

let animFrameId = null;
let lastTickTime = 0;
let isDraggingScrubber = false;

// 整场表演总时长 (秒)
const totalDuration = computed(() => {
    return props.scenes.reduce((acc, cur) => acc + (cur.duration || 5) + (cur.transitionTime || 3), 0) || 10;
});

// 全局播放进度百分比 (0 ~ 100)
const progressPercent = computed(() => {
    if (totalDuration.value <= 0) return 0;
    return Math.min(100, Math.max(0, (currentTime.value / totalDuration.value) * 100));
});

function togglePlay() {
    isPlaying.value = !isPlaying.value;
    if (isPlaying.value) {
        lastTickTime = performance.now();
        playLoop();
    } else {
        stopPlayLoop();
    }
}

function playLoop() {
    if (!isPlaying.value) return;

    const now = performance.now();
    const dt = (now - lastTickTime) / 1000;
    lastTickTime = now;

    let nextTime = currentTime.value + dt;
    if (nextTime >= totalDuration.value) {
        nextTime = 0; // 循环播放
    }
    seekTime(nextTime);

    animFrameId = requestAnimationFrame(playLoop);
}

function stopPlayLoop() {
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
}

/**
 * 核心：精确计算任意时间点 t 所处的分镜与变轨进度
 */
function seekTime(time) {
    currentTime.value = Math.max(0, Math.min(time, totalDuration.value));

    let accumulated = 0;
    let foundIndex = 0;
    let inTrans = false;
    let ratio = 0;
    let nextIndex = 0;

    for (let i = 0; i < props.scenes.length; i++) {
        const scene = props.scenes[i];
        const holdDuration = scene.duration || 5;
        const transDuration = scene.transitionTime || 3;
        const sceneTotal = holdDuration + transDuration;

        if (currentTime.value >= accumulated && currentTime.value < accumulated + sceneTotal) {
            foundIndex = i;
            const timeInScene = currentTime.value - accumulated;
            if (timeInScene <= holdDuration) {
                // 处于构型驻留态
                inTrans = false;
                ratio = 0;
                nextIndex = i;
            } else {
                // 处于两幕之间的变轨航行态
                inTrans = true;
                const transTime = timeInScene - holdDuration;
                ratio = transDuration > 0 ? Math.min(1, transTime / transDuration) : 1;
                nextIndex = (i + 1) % props.scenes.length;
            }
            break;
        }
        accumulated += sceneTotal;
    }

    isTransitioning.value = inTrans;
    transitionRatio.value = ratio;

    // 向上通知时间帧与状态
    emit('time-update', {
        currentTime: currentTime.value,
        activeSceneIndex: foundIndex,
        nextSceneIndex: nextIndex,
        isTransitioning: inTrans,
        transitionRatio: ratio,
    });
}

// 点击分镜胶囊快速定位
function handleCapsuleClick(index) {
    let accumulated = 0;
    for (let i = 0; i < index && i < props.scenes.length; i++) {
        accumulated += (props.scenes[i].duration || 5) + (props.scenes[i].transitionTime || 3);
    }
    seekTime(accumulated);
    emit('select-scene', index);
}

// 鼠标拖拽时间滑块
function handleScrubberMouseDown(e) {
    isDraggingScrubber = true;
    updateTimeFromMouse(e);

    const onMouseMove = (moveEvent) => {
        if (!isDraggingScrubber) return;
        updateTimeFromMouse(moveEvent);
    };

    const onMouseUp = () => {
        isDraggingScrubber = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

function updateTimeFromMouse(e) {
    if (!scrubberBarRef.value) return;
    const rect = scrubberBarRef.value.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTime(ratio * totalDuration.value);
}

watch(
    () => props.activeSceneIndex,
    (newIndex) => {
        if (isPlaying.value || isDraggingScrubber) return;
        handleCapsuleClick(newIndex);
    }
);

onBeforeUnmount(stopPlayLoop);

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${ms}`;
}
</script>

<style scoped>
.timeline-bar-container {
    position: absolute;
    bottom: 12px;
    left: 280px;
    right: 300px;
    height: 72px;
    background: #181b20;
    border: 1px solid #282c35;
    border-radius: 6px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 12px;
    user-select: none;
    z-index: 15;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #e5e7eb;
}

/* 1. 播放与时间控制区 */
.playback-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.play-toggle-btn {
    width: 32px;
    height: 32px;
    background: #2563eb;
    border: none;
    border-radius: 4px;
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
}

.play-toggle-btn:hover {
    background: #1d4ed8;
}

.play-toggle-btn.is-playing {
    background: #d97706;
}

.time-display {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: #9ca3af;
    background: #14161a;
    border: 1px solid #232730;
    padding: 4px 8px;
    border-radius: 3px;
    white-space: nowrap;
}

.current-time {
    color: #3b82f6;
    font-weight: 600;
}

.slash {
    margin: 0 3px;
    color: #4b5563;
}

/* 2. 中央分镜时序与动力学进度轨道 */
.timeline-center-track {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    justify-content: center;
}

/* 连续时间指针轨道 (Scrubber) */
.global-scrubber-bar {
    width: 100%;
    height: 6px;
    background: #14161a;
    border: 1px solid #282c35;
    border-radius: 3px;
    position: relative;
    cursor: pointer;
}

.scrubber-fill {
    height: 100%;
    background: linear-gradient(90deg, #1d4ed8, #3b82f6);
    border-radius: 3px;
    pointer-events: none;
}

.scrubber-thumb {
    position: absolute;
    top: -4px;
    width: 14px;
    height: 14px;
    background: #ffffff;
    border: 2px solid #3b82f6;
    border-radius: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.6);
    pointer-events: none;
}

.thumb-tip {
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 9px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    background: #1f2937;
    border: 1px solid #374151;
    padding: 1px 4px;
    border-radius: 2px;
    color: #93c5fd;
    white-space: nowrap;
}

/* 分镜胶囊轨道 */
.scenes-track {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
}

.scenes-track::-webkit-scrollbar {
    display: none;
}

.scene-capsule {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #14161a;
    border: 1px solid #282c35;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    position: relative;
    transition: all 0.15s;
    flex-shrink: 0;
}

.scene-capsule:hover {
    border-color: #3b82f6;
    background: #1c2027;
}

.scene-capsule.is-active {
    background: #1b2230;
    border-color: #3b82f6;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
}

.capsule-icon {
    color: #9ca3af;
    display: flex;
    align-items: center;
}

.capsule-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.capsule-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.capsule-name {
    font-size: 11px;
    font-weight: 500;
    color: #e5e7eb;
}

.status-tag {
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 2px;
}

.status-tag.hold {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.3);
}

.status-tag.transition {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
}

.capsule-phases {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 9px;
    color: #6b7280;
    font-family: ui-monospace, SFMono-Regular, monospace;
}

.phase-arrow {
    color: #4b5563;
    font-size: 8px;
}

.phase-badge {
    color: #9ca3af;
}

.active-indicator {
    position: absolute;
    left: 4px;
    right: 4px;
    bottom: 0;
    height: 2px;
    background: #3b82f6;
    border-radius: 1px;
}

.add-scene-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px dashed #374151;
    border-radius: 4px;
    padding: 6px 10px;
    color: #9ca3af;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
}

.add-scene-btn:hover {
    border-color: #3b82f6;
    color: #ffffff;
    background: #1c2027;
}
</style>
