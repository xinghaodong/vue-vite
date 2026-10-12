<!-- 
  ========================================================================
  文件名称: RichTextSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 富文本编辑器专属属性配置面板 (richtext)
  功能说明:
    提供富文本编辑器专属属性配置界面，包括：
    1. 编辑器高度 (height): 自定义编辑区像素高度；
    2. 工具栏模式 (toolbarMode): 完整模式 (default) vs 紧凑模式 (simple)；
    3. 占位提示文案 (placeholder): 空白时的提示文字。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <!-- 编辑器高度设置 -->
        <el-form-item label="编辑区高度">
            <el-input-number
                v-model="propsData.height"
                :min="150"
                :max="800"
                :step="50"
                controls-position="right"
                style="width: 100%"
            />
            <div class="field-hint">单位 px，默认 300px，建议在 200~600 之间</div>
        </el-form-item>

        <!-- 工具栏模式 -->
        <el-form-item label="工具栏模式">
            <el-radio-group v-model="propsData.toolbarMode" size="small">
                <el-radio-button value="default">完整模式</el-radio-button>
                <el-radio-button value="simple">紧凑模式</el-radio-button>
            </el-radio-group>
            <div class="field-hint">
                {{ propsData.toolbarMode === 'simple' ? '精简常用排版，适合短篇批注' : '包含全量字体、颜色、对齐、表格与多媒体功能' }}
            </div>
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
        default: 'richtext',
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
