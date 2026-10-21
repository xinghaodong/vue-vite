<template>
    <el-config-provider :locale="zhCn" :size="componentSize">
        <div id="app">
            <router-view></router-view>
            <!-- AI 智能助手悬浮触发入口 (支持任意自由拖拽与点击防误触) -->
            <div
                class="ai-float-trigger"
                :class="{ 'is-dragging': isDragging }"
                :style="{
                    left: `${floatPos.x}px`,
                    top: `${floatPos.y}px`,
                }"
                @mousedown="onMouseDown"
                @click="handleClick"
                title="按住可自由拖拽，点击打开 AI 助手"
            >
                <el-icon :size="16"><ChatDotRound /></el-icon>
                <span>AI 助手</span>
            </div>

            <!-- 升级为高级抽屉 ProDrawer -->
            <ProDrawer
                v-model="drawer"
                title="AI 智能助手"
                sub-title="微前端实时交互"
                size="55%"
                :show-fullscreen="true"
                :show-footer="false"
                body-padding="0"
                :body-style="{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }"
                :destroy-on-close="true"
                @close="hclose"
            >
                <!-- 嵌入子应用 (保活无界微前端) -->
                <div v-if="drawer" style="width: 100%; height: 100%; flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column">
                    <WujieVue
                        v-if="drawer"
                        name="ai-chat-drawer"
                        :url="VITE_WUJIE_AI_URL"
                        :sync="true"
                        :alive="true"
                        :props="microProps"
                        style="width: 100%; height: 100%; flex: 1; border: none"
                    />
                </div>
            </ProDrawer>
        </div>
    </el-config-provider>
</template>
<script setup>
import WujieVue from 'wujie-vue3';
import { ref, watch, computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import useLayoutStore from '@/stores/layout.js';
import { initTheme } from '@/composables/useTheme';

// 应用首屏初始化主题与主色色阶
initTheme();

const layoutStore = useLayoutStore();
const componentSize = computed(() => layoutStore.componentSize);
const { VITE_WUJIE_AI_URL } = import.meta.env;
const drawer = ref(false);
defineProps({
    name: String,
    url: String,
});
const hclose = () => {};

// 向子应用传递数据（如 token、用户信息）
const microProps = {
    token: sessionStorage.getItem('token') || '',
    refreshToken: sessionStorage.getItem('refreshToken') || '',
    userInfo: sessionStorage.getItem('piniaStore') || '',
};
const jq = () => {
    drawer.value = true;
};

// =========================================================================
// 🌟 悬浮球自由拖拽与点击防误触体系 (Apple 级柔顺手感)
// =========================================================================
const floatPos = reactive({
    x: typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 120) : 100,
    y: typeof window !== 'undefined' ? Math.max(20, window.innerHeight - 70) : 100,
});
const isDragging = ref(false);
let startX = 0;
let startY = 0;
let initX = 0;
let initY = 0;
let hasMoved = false;

const onMouseDown = (e) => {
    // 仅支持鼠标左键拖拽
    if (e.button !== 0) return;
    isDragging.value = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    initX = floatPos.x;
    initY = floatPos.y;

    const onMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
        }

        // 视口安全边界限制：防止拖到屏幕外
        const maxX = window.innerWidth - 105;
        const maxY = window.innerHeight - 45;
        floatPos.x = Math.min(Math.max(10, initX + dx), maxX);
        floatPos.y = Math.min(Math.max(10, initY + dy), maxY);
    };

    const onMouseUp = () => {
        isDragging.value = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
};

// 点击触发（如果拖拽移动过，则自动拦截，防止松手误开抽屉）
const handleClick = () => {
    if (hasMoved) return;
    jq();
};

// 窗口 resize 自动修正位置，防止缩放后掉出屏幕
const handleWindowResize = () => {
    const maxX = window.innerWidth - 105;
    const maxY = window.innerHeight - 45;
    floatPos.x = Math.min(Math.max(10, floatPos.x), maxX);
    floatPos.y = Math.min(Math.max(10, floatPos.y), maxY);
};

onMounted(() => {
    window.addEventListener('resize', handleWindowResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleWindowResize);
});
</script>

<style>
.ai-float-trigger {
    position: fixed;
    z-index: 2000;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: var(--el-color-primary);
    color: #ffffff;
    border-radius: 9999px;
    /* 采用轻盈清爽的现代微阴影，彻底消除厚重感 */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 1px rgba(0, 0, 0, 0.12);
    cursor: grab;
    user-select: none;
    font-size: 13px;
    font-weight: 500;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.ai-float-trigger:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
}
.ai-float-trigger.is-dragging {
    cursor: grabbing;
    transition: none !important; /* 拖拽过程中严禁过渡动画，确保 1:1 零延迟紧随光标 */
    transform: scale(1.04);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
html,
body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
}

#app {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
}
.mb-4 {
    margin-bottom: 16px;
}
.table {
    display: block !important;
}
/* ========================================================================
 * 🌟 NProgress 路由加载进度条：全量联动系统品牌色 (无论暗黑还是换色盘)
 * ======================================================================== */
#nprogress .bar {
    background: var(--el-color-primary) !important;
    height: 2.5px !important;
    z-index: 99999 !important;
}

#nprogress .peg {
    box-shadow: 0 0 10px var(--el-color-primary), 0 0 5px var(--el-color-primary) !important;
}

#nprogress .spinner-icon {
    border-top-color: var(--el-color-primary) !important;
    border-left-color: var(--el-color-primary) !important;
}
</style>
