<!-- 设计态画布 -->
<template>
    <!-- 
      重点：最外层必须维持严格的单根 DOM 元素！
      杜绝 Vue 3 Fragment 多根节点现象，确保 Sortable.js / vuedraggable 追踪挂载 DOM 稳如磐石
    -->
    <div class="design-item-root">
        <!-- 1. 🌟 所有容器物料统合渲染 (基于统一 slots 协议，零 if/else 判断) -->
        <div
            v-if="element.slots"
            class="design-item-wrapper container-item-wrapper"
            :class="{ active: currentItem?.id === element.id }"
            @click.stop="$emit('select', element)"
        >
            <div class="drag-handle" title="按住此处拖拽移动容器">
                <el-icon><Rank /></el-icon>
            </div>

            <!-- 动态挂载对应容器排版组件 (Grid / Card / Tabs / 任意未来容器) -->
            <component
                :is="getContainerComponent(element.type)"
                :props-data="element.props"
            >
                <template v-for="(slotList, slotKey) in element.slots" :key="slotKey" #[slotKey]>
                    <div class="slot-draggable-box">
                        <draggable
                            v-model="element.slots[slotKey]"
                            item-key="id"
                            :group="{ name: 'form-items', pull: true, put: true }"
                            ghost-class="ghost-canvas-item"
                            :animation="200"
                            handle=".drag-handle"
                            class="slot-draggable-area"
                        >
                            <template #item="{ element: childElement, index: childIndex }">
                                <div class="col-item-slot-wrapper">
                                    <DesignItemRenderer
                                        :element="childElement"
                                        :current-item="currentItem"
                                        :form-data="formData"
                                        @select="item => $emit('select', item)"
                                        @copy="() => $emit('copy-child', { parent: element, slotKey, index: childIndex })"
                                        @copy-child="args => $emit('copy-child', args)"
                                        @delete="() => $emit('delete-child', { parent: element, slotKey, index: childIndex })"
                                        @delete-child="args => $emit('delete-child', args)"
                                    />
                                </div>
                            </template>

                            <template #footer>
                                <div v-if="!slotList || slotList.length === 0" class="empty-col-tip">
                                    拖拽组件到此区域
                                </div>
                            </template>
                        </draggable>
                    </div>
                </template>
            </component>

            <div class="item-actions">
                <el-icon class="action-btn copy-btn" title="复制整个容器" @click.stop="$emit('copy', element)">
                    <CopyDocument />
                </el-icon>
                <el-icon class="action-btn delete-btn" title="删除整个容器" @click.stop="$emit('delete', element)">
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
                <component
                    :is="getFieldComponent(element.type)"
                    :model-value="formData[element.id] ?? element.props?.defaultValue ?? (element.type === 'slider' ? (element.props?.min ?? 0) : undefined)"
                    v-bind="element.props"
                    :options="element.props?.options || []"
                    :placeholder="element.props?.placeholder"
                    :disabled="true"
                    :is-design="true"
                    :props-config="element.props"
                    :controls-position="element.component === 'el-input-number' ? 'right' : undefined"
                />
            </el-form-item>

            <div class="item-actions">
                <el-icon class="action-btn copy-btn" title="复制该字段" @click.stop="$emit('copy', element)">
                    <CopyDocument />
                </el-icon>
                <el-icon class="action-btn delete-btn" title="删除该字段" @click.stop="$emit('delete', element)">
                    <Delete />
                </el-icon>
            </div>
        </div>
    </div>
</template>

<script setup>
import draggable from 'vuedraggable/src/vuedraggable';
import { Rank, Delete, UploadFilled, CopyDocument } from '@element-plus/icons-vue';
import { getContainerComponent, getFieldComponent } from '../widgets/index.js';

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

defineEmits(['select', 'copy', 'copy-child', 'delete', 'delete-child']);
</script>

<style scoped>
.design-item-root {
    width: 100%;
}

.design-item-wrapper {
    position: relative;
    padding: 14px 16px;
    margin-bottom: 12px;
    /* background: #ffffff; */
    border: 1px dashed #dcdfe6;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.design-item-wrapper:hover {
    border-color: #409eff;
    /* background: #fdfdfd; */
}

.design-item-wrapper.active {
    border: 1px solid #409eff;
    /* background: #f0f7ff; */
    box-shadow: 0 0 0 1px #409eff inset;
}

/* 拖拽手柄图标 (默认隐藏，仅在鼠标悬停或当前组件激活时显现) */
.drag-handle {
    position: absolute;
    top: 6px;
    left: 6px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #909399;
    cursor: move;
    font-size: 14px;
    z-index: 10;
    opacity: 0;
    pointer-events: none;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
}

.drag-handle:hover {
    color: #409eff;
    border-color: #b3d8ff;
    background: #ecf5ff;
}

/* 操作按钮组 (复制/删除，默认隐藏) */
.item-actions {
    position: absolute;
    right: 6px;
    bottom: 6px;
    display: flex;
    gap: 4px;
    z-index: 10;
    opacity: 0;
    pointer-events: none;
    transform: translateY(2px);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 🌟 核心优化：直接子选择器实现仅当前悬浮(hover)或选中聚焦(active)的组件才显示操作手柄与按钮 */
.design-item-wrapper:hover > .drag-handle,
.design-item-wrapper.active > .drag-handle {
    opacity: 1;
    pointer-events: auto;
}

.design-item-wrapper:hover > .item-actions,
.design-item-wrapper.active > .item-actions {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
}

.action-btn {
    cursor: pointer;
    font-size: 13px;
    color: #909399;
    padding: 3px 5px;
    border-radius: 4px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
}

.copy-btn:hover {
    color: #409eff;
    border-color: #b3d8ff;
    background: #ecf5ff;
}

.delete-btn:hover {
    color: #f56c6c;
    border-color: #fde2e2;
    background: #fef0f0;
}

/* 容器统一样式 */
.container-item-wrapper {
    /* background: #fafbfc; */
    border-style: solid;
    padding-top: 28px;
}

.slot-draggable-box {
    border: 1px dashed #dcdfe6;
    /* background: #ffffff; */
    border-radius: 4px;
    min-height: 56px;
    padding: 6px;
    margin: 4px 0;
}

.slot-draggable-area {
    min-height: 48px;
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
    /* background: #ecf5ff !important; */
    opacity: 0.7;
}

/* 统一保证设计态画布所有输入控件撑满栅格容器，使用 :not 排除滑块内置附属输入框 */
.field-container :deep(.el-cascader),
.field-container :deep(.el-date-editor),
.field-container :deep(.el-select),
.field-container :deep(.el-slider),
.field-container :deep(.el-input-number:not(.el-slider__input)) {
    width: 100% !important;
}
</style>
