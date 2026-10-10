<!-- 
  ========================================================================
  文件名称: InputSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 单行文本 (input)、多行文本 (textarea)
  功能说明:
    提供文本输入类组件的专属属性配置界面，包括：
    1. 最大输入字数 (maxlength)、实时计数器开关 (showWordLimit)、一键清除图标开关 (clearable)；
    2. 数据格式校验规则 (ruleType)：支持纯数字、正整数、手机号、邮箱、身份证等预设正则校验。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <!-- 格式校验类型 (仅单行文本支持) -->
        <el-form-item label="格式校验" v-if="type !== 'textarea'">
            <el-select v-model="propsData.ruleType" placeholder="选择预设校验规则" clearable style="width: 100%">
                <el-option label="无限制 (任意文本)" value="none" />
                <el-option label="纯数字 (仅允许 0-9)" value="number" />
                <el-option label="正整数 (大于0的整数)" value="positiveInteger" />
                <el-option label="手机号码 (11位大陆号码)" value="phone" />
                <el-option label="电子邮箱 (Email)" value="email" />
                <el-option label="身份证号 (18位大陆号码)" value="idCard" />
            </el-select>
            <div class="field-hint">
                说明：配置后提交时将自动校验格式，若不匹配将弹出友好错误提示。
            </div>
        </el-form-item>

        <!-- 最大输入字符长度 -->
        <el-form-item label="最大长度">
            <el-input-number 
                v-model="propsData.maxlength" 
                :min="1" 
                :max="1000" 
                controls-position="right"
                placeholder="字符上限"
            />
        </el-form-item>

        <!-- 是否在输入框右侧或下方显示当前字数统计 (如: 0/100) -->
        <el-form-item label="显示计数">
            <el-switch v-model="propsData.showWordLimit" />
        </el-form-item>

        <!-- 是否允许用户点击输入框右侧的小叉号一键清空输入内容 -->
        <el-form-item label="可清除">
            <el-switch v-model="propsData.clearable" />
        </el-form-item>
    </div>
</template>

<script setup>
/**
 * 接收父级传递的当前被选中组件的 props 引用对象与组件类型
 */
defineProps({
    propsData: {
        type: Object,
        required: true,
    },
    type: {
        type: String,
        default: 'input',
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
