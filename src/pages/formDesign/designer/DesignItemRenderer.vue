<template>
    <!-- 
      重点：最外层必须维持严格的单根 DOM 元素！
      杜绝 Vue 3 Fragment 多根节点现象，确保 Sortable.js / vuedraggable 追踪挂载 DOM 稳如磐石
    -->
    <div class="design-item-root">
        <!-- 1. 容器组件：栅格布局 -->
        <div
            v-if="element.type === 'grid'"
            class="design-item-wrapper grid-container"
            :class="{ active: currentItem?.id === element.id }"
            @click.stop="$emit('select', element)"
        >
            <div class="drag-handle" title="按住此处拖拽移动栅格">
                <el-icon><Rank /></el-icon>
            </div>

            <el-row :gutter="element.props?.gutter || 0" style="width: 100%">
                <el-col
                    v-for="(col, colIndex) in element.props?.columns || []"
                    :key="colIndex"
                    :span="col.span"
                >
                    <div class="grid-col-box">
                        <draggable
                            v-model="col.list"
                            item-key="id"
                            :group="{ name: 'form-items', pull: true, put: true }"
                            ghost-class="ghost-canvas-item"
                            :animation="200"
                            handle=".drag-handle"
                            class="col-draggable-area"
                        >
                            <template #item="{ element: colElement, index: colElementIndex }">
                                <div class="col-item-slot-wrapper">
                                    <DesignItemRenderer
                                        :element="colElement"
                                        :current-item="currentItem"
                                        :form-data="formData"
                                        @select="item => $emit('select', item)"
                                        @delete="() => $emit('delete-child', { colIndex, index: colElementIndex, parent: element })"
                                        @delete-child="args => $emit('delete-child', args)"
                                    />
                                </div>
                            </template>

                            <template #footer>
                                <div v-if="!col.list || col.list.length === 0" class="empty-col-tip">
                                    拖拽组件到此分栏
                                </div>
                            </template>
                        </draggable>
                    </div>
                </el-col>
            </el-row>

            <div class="item-actions">
                <el-icon class="action-btn delete-btn" title="删除整个栅格" @click.stop="$emit('delete', element)">
                    <Delete />
                </el-icon>
            </div>
        </div>

        <!-- 2. 普通表单字段项 -->
        <div
            v-else
            class="design-item-wrapper field-container"
            :class="{ active: currentItem?.id === element.id }"
            @click.stop="$emit('select', element)"
        >
            <div class="drag-handle" title="按住此处拖拽移动组件">
                <el-icon><Rank /></el-icon>
            </div>

            <el-form-item
                :label="element.props?.label"
                :required="element.props?.required"
                style="width: 100%; margin-bottom: 0"
            >
                <!-- 附件上传预览 -->
                <template v-if="element.type === 'upload'">
                    <div class="upload-preview-box">
                        <el-button type="primary" plain size="small">
                            <el-icon style="margin-right: 4px"><UploadFilled /></el-icon>
                            上传附件
                        </el-button>
                        <div class="upload-tip">{{ element.props?.tip || '支持jpg/png/pdf格式发票附件' }}</div>
                    </div>
                </template>

                <!-- 下拉选择预览 -->
                <template v-else-if="element.type === 'select'">
                    <el-select
                        :model-value="formData[element.id]"
                        v-bind="element.props"
                        :placeholder="element.props?.placeholder"
                        disabled
                        style="width: 100%"
                    >
                        <el-option
                            v-for="opt in element.props?.options || []"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                        />
                    </el-select>
                </template>

                <!-- 单选框组预览 -->
                <template v-else-if="element.type === 'radio'">
                    <el-radio-group :model-value="formData[element.id]" disabled>
                        <el-radio
                            v-for="opt in element.props?.options || []"
                            :key="opt.value"
                            :label="opt.value"
                        >
                            {{ opt.label }}
                        </el-radio>
                    </el-radio-group>
                </template>

                <!-- 多选框组预览 -->
                <template v-else-if="element.type === 'checkbox'">
                    <el-checkbox-group :model-value="formData[element.id] || []" disabled>
                        <el-checkbox
                            v-for="opt in element.props?.options || []"
                            :key="opt.value"
                            :label="opt.value"
                        >
                            {{ opt.label }}
                        </el-checkbox>
                    </el-checkbox-group>
                </template>

                <!-- 其他基础组件（input / number / textarea / switch / date-picker 等） -->
                <component
                    v-else
                    :is="element.component || 'el-input'"
                    :model-value="formData[element.id]"
                    v-bind="element.props"
                    :controls-position="element.component === 'el-input-number' ? 'right' : undefined"
                    disabled
                    style="width: 100%"
                />
            </el-form-item>

            <div class="item-actions">
                <el-icon class="action-btn delete-btn" title="删除该字段" @click.stop="$emit('delete', element)">
                    <Delete />
                </el-icon>
            </div>
        </div>
    </div>
</template>

<script setup>
import draggable from 'vuedraggable/src/vuedraggable';
import { Rank, Delete, UploadFilled } from '@element-plus/icons-vue';

defineOptions({
    name: 'DesignItemRenderer',
});

defineProps({
    element: {
        type: Object,
        required: true,
    },
    currentItem: {
        type: Object,
        default: null,
    },
    formData: {
        type: Object,
        default: () => ({}),
    },
});

defineEmits(['select', 'delete', 'delete-child']);
</script>

<style scoped>
.design-item-root {
    width: 100%;
}

.design-item-wrapper {
    position: relative;
    padding: 14px 16px;
    margin-bottom: 12px;
    background: #ffffff;
    border: 1px dashed #dcdfe6;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.design-item-wrapper:hover {
    border-color: #409eff;
    background: #fdfdfd;
}

.design-item-wrapper.active {
    border: 1px solid #409eff;
    background: #f0f7ff;
    box-shadow: 0 0 0 1px #409eff inset;
}

/* 拖拽手柄图标 */
.drag-handle {
    position: absolute;
    top: 6px;
    left: 6px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #909399;
    cursor: move;
    font-size: 14px;
    z-index: 10;
}

.drag-handle:hover {
    color: #409eff;
    background: #e6f1fc;
    border-radius: 3px;
}

.item-actions {
    position: absolute;
    right: 6px;
    bottom: 6px;
    display: flex;
    gap: 4px;
    z-index: 10;
}

.action-btn {
    cursor: pointer;
    font-size: 14px;
    color: #909399;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.action-btn:hover {
    color: #f56c6c;
    background: #fef0f0;
}

/* 栅格容器样式 */
.grid-container {
    background: #fafbfc;
    border-style: solid;
    padding-top: 26px;
}

.grid-col-box {
    border: 1px dashed #dcdfe6;
    background: #ffffff;
    border-radius: 4px;
    min-height: 64px;
    padding: 8px;
}

.col-draggable-area {
    min-height: 52px;
    height: 100%;
}

.col-item-slot-wrapper {
    width: 100%;
}

.empty-col-tip {
    text-align: center;
    color: #c0c4cc;
    font-size: 12px;
    padding: 16px 0;
    user-select: none;
}

.upload-preview-box {
    padding: 4px 0;
}

.upload-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
}

.ghost-canvas-item {
    border: 2px dashed #409eff !important;
    background: #ecf5ff !important;
    opacity: 0.7;
}
</style>
