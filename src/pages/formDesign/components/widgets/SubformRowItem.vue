<!-- 
  ========================================================================
  文件名称: SubformRowItem.vue
  所属模块: 表单渲染器业务物料库 (components/widgets)
  适用组件: 子表单 (Subform) 块级动态行渲染单元
  功能说明:
    负责渲染子表单中单条明细数据块（卡片/分组表单）：
    1. 局部上下文就近遮蔽 (Context Shadowing): 针对当前行独立 provide('formContext')，
       使得该行内部无论嵌套多少层栅格布局 (Grid)、分组卡片 (Card) 都能天然隔离数据；
    2. 全模板递归渲染: 调用 FormItemRenderer 递归渲染模板内部的所有组件，完美保留字段 Label 与复杂排版；
    3. 行内快捷操作: 提供行序号、复制当前行、删除当前行按钮。
  ========================================================================
-->
<template>
    <div class="subform-row-card">
        <!-- 行顶栏：序号徽标与操作按钮 -->
        <div class="row-card-header">
            <div class="row-header-left">
                <span class="row-index-pill">{{ rowIndex + 1 }}</span>
                <span class="row-index-label">第 {{ rowIndex + 1 }} 项</span>
            </div>
            <div v-if="!isDisabled && !isReadOnly" class="row-header-actions">
                <el-tooltip content="复制此项" placement="top">
                    <el-button
                        link
                        type="primary"
                        size="small"
                        :icon="CopyDocument"
                        class="action-icon-btn"
                        @click="$emit('copy', rowIndex)"
                    />
                </el-tooltip>
                <el-tooltip content="删除此项" placement="top">
                    <el-button
                        link
                        type="danger"
                        size="small"
                        :icon="Delete"
                        class="action-icon-btn"
                        @click="$emit('remove', rowIndex)"
                    />
                </el-tooltip>
            </div>
        </div>

        <!-- 行表单内容渲染区 (递归支持栅格布局、多列与任意普通物料) -->
        <div class="row-card-body">
            <FormItemRenderer
                v-for="subItem in templateItems"
                :key="subItem.id"
                :item="subItem"
            />
        </div>
    </div>
</template>

<script setup>
import { computed, provide } from 'vue';
import { CopyDocument, Delete } from '@element-plus/icons-vue';
import FormItemRenderer from '../FormItemRenderer.vue';

const props = defineProps({
    templateItems: {
        type: Array,
        default: () => [],
    },
    rowData: {
        type: Object,
        required: true,
    },
    rowIndex: {
        type: Number,
        required: true,
    },
    isDisabled: {
        type: Boolean,
        default: false,
    },
    isReadOnly: {
        type: Boolean,
        default: false,
    },
    parentContext: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['update-cell', 'copy', 'remove']);

// 🌟 核心软件工程设计：依赖注入就近遮蔽 (Context Shadowing)
// 为当前行的所有子孙节点提供局部的表单上下文，使得内部嵌套的 Grid 与原子物料天然读取与更新当前行数据
provide('formContext', {
    formData: computed(() => props.rowData),
    updateFieldValue: (fieldId, val) => {
        emit('update-cell', {
            rowIndex: props.rowIndex,
            fieldId,
            value: val,
        });
    },
    disabled: computed(() => props.isDisabled),
    noApproval: computed(() => props.isReadOnly),
    optionsMap: props.parentContext?.optionsMap || {},
    loadingMap: props.parentContext?.loadingMap || {},
    isSubformRow: true, // 🌟 显式声明当前处于子表单明细行上下文
});
</script>

<style scoped>
/* ========================================================================
 * 🎨 子表单明细行卡片：Design Tokens 规范重构
 * 彻底消除硬编码 Hex 颜色，自动响应全局暗黑/亮色主题切换
 * ======================================================================== */
.subform-row-card {
    position: relative;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 12px 16px 16px;
    margin-bottom: 12px;
    transition: all 0.2s ease;
    /* box-shadow: var(--el-box-shadow-lighter); */
}

.subform-row-card:hover {
    border-color: var(--el-border-color);
    /* box-shadow: var(--el-box-shadow-light); */
}

.row-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    margin-bottom: 12px;
    border-bottom: 1px dashed var(--el-border-color-lighter);
}

.row-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.row-index-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 700;
    font-size: 12px;
    border-radius: 50%;
    border: 1px solid var(--el-color-primary-light-8);
}

.row-index-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-regular);
}

.row-header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.action-icon-btn {
    padding: 4px;
    font-size: 15px;
}

.row-card-body {
    width: 100%;
}
</style>
