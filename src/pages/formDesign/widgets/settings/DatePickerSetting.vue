<!-- 
  ========================================================================
  文件名称: DatePickerSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 日期选择器 (date-picker)
  功能说明:
    提供日期时间类组件的专属属性配置界面，包括：
    1. 页面展示格式 (format)：用户在前端界面中看到的日期文本样式（如 YYYY-MM-DD 或 YYYY年MM月DD日）；
    2. 字段绑定值格式 (valueFormat)：提交给后端 API 或参与计算时的真实时间格式（如 YYYY-MM-DD 或时间戳）。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <!-- 页面呈现的日期格式 -->
        <el-form-item label="显示格式">
            <el-input 
                v-model="propsData.format" 
                placeholder="例如: YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss" 
            />
            <div class="field-hint">
                说明：控制在输入框内展示的日期文本格式。
            </div>
        </el-form-item>

        <!-- 实际存储/绑定的日期数据格式 -->
        <el-form-item label="绑定格式">
            <el-input 
                v-model="propsData.valueFormat" 
                placeholder="例如: YYYY-MM-DD" 
            />
            <div class="field-hint">
                说明：控制实际提交给后端 formData 的字符串格式。
            </div>
        </el-form-item>
    </div>
</template>

<script setup>
defineProps({
    // 接收当前选中日期选择器组件的 props 属性对象
    propsData: {
        type: Object,
        required: true,
    },
});
</script>

<style scoped>
.setting-group {
    width: 100%;
}
.field-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    line-height: 1.4;
}
</style>
