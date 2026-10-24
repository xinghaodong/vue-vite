<template>
    <aside class="right-tool-rail">
        <!-- 顶部 Tab 切换与关闭按钮 -->
        <div class="rail-header">
            <div class="rail-tabs">
                <button
                    class="rail-tab"
                    :class="{ active: modelValue === 'distribution' }"
                    @click="emit('update:modelValue', 'distribution')"
                >
                    <span class="tab-icon">📐</span>
                    <span>分布</span>
                </button>
                <button
                    class="rail-tab"
                    :class="{ active: modelValue === 'color' }"
                    @click="emit('update:modelValue', 'color')"
                >
                    <span class="tab-icon">🎨</span>
                    <span>上色</span>
                </button>
            </div>
            <button class="rail-close-btn" title="收起工具栏" @click="emit('close')">
                ✕
            </button>
        </div>

        <!-- 主体内容滚动区 -->
        <div class="rail-content">
            <div v-show="modelValue === 'distribution'">
                <slot name="distribution" />
            </div>
            <div v-show="modelValue === 'color'">
                <slot name="color" />
            </div>
        </div>
    </aside>
</template>

<script setup>
/**
 * 2D 工作台右侧统一属性工具栏 (分布 / 上色)
 */
defineProps({
    modelValue: {
        type: String,
        default: 'distribution', // 'distribution' | 'color'
    },
});

const emit = defineEmits(['update:modelValue', 'close']);
</script>

<style scoped>
.right-tool-rail {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 320px;
    background: var(--el-bg-color);
    border-left: 1px solid var(--el-border-color);
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.18);
    display: flex;
    flex-direction: column;
    z-index: 20;
    animation: slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
    }
    to {
        transform: translateX(0);
    }
}

.rail-header {
    height: 42px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-light);
    flex-shrink: 0;
}

.rail-tabs {
    display: flex;
    gap: 4px;
}

.rail-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 6px;
    border: none;
    background: transparent;
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
}

.rail-tab:hover {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color);
}

.rail-tab.active {
    color: var(--el-color-primary);
    background: var(--el-bg-color);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.tab-icon {
    font-size: 13px;
}

.rail-close-btn {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s ease;
}

.rail-close-btn:hover {
    background: var(--el-fill-color-darker);
    color: var(--el-text-color-primary);
}

.rail-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
}
</style>
