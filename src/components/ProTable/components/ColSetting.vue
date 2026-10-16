<template>
    <el-drawer
        v-model="drawerVisible"
        title="列设置"
        size="320px"
        append-to-body
        class="pro-col-setting-drawer"
    >
        <div class="col-setting-header">
            <span class="setting-tip">勾选控制表格列的显示与隐藏</span>
            <el-button link type="primary" size="small" @click="resetColumns">
                重置为默认
            </el-button>
        </div>

        <div class="col-setting-list">
            <el-scrollbar max-height="calc(100vh - 160px)">
                <div
                    v-for="item in filterColumns"
                    :key="item.prop || item.label"
                    class="col-setting-item"
                >
                    <el-checkbox
                        v-model="item.isShow"
                        :disabled="item.fixed != null && item.fixed !== false"
                    >
                        {{ item.label }}
                    </el-checkbox>
                    <span v-if="item.fixed" class="fixed-tag">固定列</span>
                </div>
            </el-scrollbar>
        </div>
    </el-drawer>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    columns: {
        type: Array,
        default: () => []
    }
});

const drawerVisible = ref(false);

// 过滤掉不可设置的特殊列（如多选框列、展开列、序号列）
const filterColumns = computed(() => {
    return props.columns.filter(
        item => !['selection', 'index', 'expand'].includes(item.type) && item.label
    );
});

// 重置所有列为默认显示
const resetColumns = () => {
    props.columns.forEach(col => {
        col.isShow = true;
    });
};

const openColSetting = () => {
    drawerVisible.value = true;
};

defineExpose({
    openColSetting
});
</script>

<style scoped>
.col-setting-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.setting-tip {
    font-size: 13px;
    color: var(--el-text-color-secondary);
}

.col-setting-list {
    display: flex;
    flex-direction: column;
}

.col-setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    margin-bottom: 6px;
    background-color: var(--el-fill-color-lighter);
    border-radius: 6px;
    transition: background-color 0.2s;
}

.col-setting-item:hover {
    background-color: var(--el-fill-color);
}

.fixed-tag {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background-color: var(--el-fill-color-dark);
    color: var(--el-text-color-secondary);
}
</style>
