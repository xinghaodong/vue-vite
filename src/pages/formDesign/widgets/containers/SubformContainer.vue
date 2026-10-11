<!-- 
  ========================================================================
  文件名称: SubformContainer.vue
  所属模块: 表单设计器容器物料库 (widgets/containers)
  适用组件: 子表单容器 (subform)
  功能说明:
    在设计态画布中以直观逼真的“卡片式动态表单块”呈现子表单容器：
    1. 遵循统一 slots 协议: 通过 slots.default 接收内部拖入的任意物料（包括栅格 Grid、卡片 Card 与基础录入物料）；
    2. 所见即所得排版: 内部作为一个完整的微型表单画布，真实呈现用户的排版结构（如左侧费用类型、右侧发票）；
    3. 仿真明细块标识: 底部展示序号 #1 与 [+ -] 仿真控制按钮，直观契合大厂/开源表单设计器（如 FcDesigner）标准体感。
  ========================================================================
-->
<template>
    <div class="subform-design-card">
        <!-- 1. 表格标题栏 -->
        <div class="subform-header-bar">
            <div class="subform-title-box">
                <el-icon class="title-icon"><Tickets /></el-icon>
                <span class="subform-title-text">{{ propsData.label || '子表单' }}</span>
                <el-tag size="small" type="primary" effect="plain" class="badge-tag">
                    {{ propsData.layoutMode === 'table' ? '表格表单' : '动态子表单' }}
                </el-tag>
            </div>
            <div class="subform-tips">
                💡 内部可自由拖入栅格布局、多列或普通字段，运行时每项将动态循环增减
            </div>
        </div>

        <!-- 2. 核心模板插槽区 (映射 slots.default，支持自由拖入栅格布局或任意物料) -->
        <div class="subform-body-wrapper">
            <div class="template-canvas-area">
                <slot name="default" />
            </div>

            <!-- 3. 仿真底栏：序号与 [+ -] 增减操作示意 -->
            <div class="subform-footer-bar">
                <div class="footer-left">
                    <span class="mock-index-badge">1</span>
                    <span class="mock-desc-tip">（运行态将根据数据动态增减此表单块）</span>
                </div>
                <div class="footer-right-actions">
                    <el-button-group size="small">
                        <el-button :icon="Plus" disabled type="primary" plain />
                        <el-button :icon="Minus" disabled type="danger" plain />
                    </el-button-group>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { Tickets, Plus, Minus } from '@element-plus/icons-vue';

defineProps({
    propsData: {
        type: Object,
        required: true,
    },
});
</script>

<style scoped>
.subform-design-card {
    width: 100%;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 12px 14px;
    box-sizing: border-box;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.subform-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #e2e8f0;
}

.subform-title-box {
    display: flex;
    align-items: center;
    gap: 8px;
}

.title-icon {
    font-size: 16px;
    color: #409eff;
}

.subform-title-text {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
}

.badge-tag {
    font-size: 11px;
}

.subform-tips {
    font-size: 12px;
    color: #64748b;
}

.subform-body-wrapper {
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    padding: 10px;
}

.template-canvas-area {
    min-height: 60px;
    background: #ffffff;
    border-radius: 4px;
    padding: 6px;
    box-sizing: border-box;
}

.template-canvas-area :deep(.slot-draggable-box) {
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
}

.template-canvas-area :deep(.slot-draggable-area) {
    min-height: 56px;
}

.subform-footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed #e2e8f0;
}

.footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.mock-index-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #eff6ff;
    color: #3b82f6;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid #bfdbfe;
}

.mock-desc-tip {
    font-size: 12px;
    color: #94a3b8;
}

.footer-right-actions {
    display: flex;
    align-items: center;
}
</style>
