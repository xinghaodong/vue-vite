<!-- 
  ========================================================================
  文件名称: SubformSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 子表单专属属性配置面板 (subform)
  功能说明:
    提供子表单专属属性配置界面，包括：
    1. 排版展示形态 (layoutMode): 卡片/块级模式 (默认子表单) vs 紧凑表格模式 (表格表单)；
    2. 添加按钮文案: 自定义增行按钮文字（如“添加费用明细”、“新增出差信息”）；
    3. 自动合计汇总行 (showSummary): 开启后底部自动聚合数值列求和；
    4. 行数上下限控制: 最小行数 (minRows) 与 最大行数 (maxRows)。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <!-- 子表单标题 -->
        <el-form-item label="子表单标题">
            <el-input v-model="propsData.label" placeholder="例如: 报销明细、出差行程" clearable />
        </el-form-item>

        <!-- 排版展示形态 -->
        <el-form-item label="展示形态">
            <el-radio-group v-model="propsData.layoutMode" size="small">
                <el-radio-button value="card">子表单(卡片)</el-radio-button>
                <el-radio-button value="table">表格表单</el-radio-button>
            </el-radio-group>
            <div class="field-hint">
                {{ propsData.layoutMode === 'table' ? '类似 Excel 紧凑表格，每列一个原子字段' : '卡片块级排版，支持栅格布局、多列与带 Label 丰富表单' }}
            </div>
        </el-form-item>

        <!-- 增行按钮文案 -->
        <el-form-item label="添加按钮文字">
            <el-input v-model="propsData.addButtonText" placeholder="例如: 添加一项" clearable />
            <div class="field-hint">增行按钮的显示文案</div>
        </el-form-item>

        <!-- 表格模式下才显示的序号列配置 -->
        <el-form-item v-if="propsData.layoutMode === 'table'" label="显示序号列">
            <el-switch v-model="propsData.showIndex" />
            <div class="field-hint">是否在表格最左侧展示行号 (1, 2, 3...)</div>
        </el-form-item>

        <!-- 开启底部合计汇总 -->
        <el-form-item label="自动合计">
            <el-switch v-model="propsData.showSummary" />
            <div class="field-hint">开启后，将自动检测内部所有数值并实时输出合计总和</div>
        </el-form-item>

        <!-- 最小行数限制 -->
        <el-form-item label="最少行数">
            <el-input-number
                v-model="propsData.minRows"
                :min="0"
                :max="10"
                controls-position="right"
            />
            <div class="field-hint">新建填单时预先填充的初始行数</div>
        </el-form-item>

        <!-- 最大行数限制 -->
        <el-form-item label="最大行数">
            <el-input-number
                v-model="propsData.maxRows"
                :min="1"
                :max="200"
                controls-position="right"
            />
            <div class="field-hint">允许录入的明细条数上限</div>
        </el-form-item>
    </div>
</template>

<script setup>
defineProps({
    propsData: {
        type: Object,
        required: true,
    },
    type: {
        type: String,
        default: 'subform',
    },
});
</script>

<style scoped>
.setting-group {
    padding: 0 4px;
}
.field-hint {
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.4;
    margin-top: 4px;
}
</style>
