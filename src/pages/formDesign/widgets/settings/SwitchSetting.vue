<!-- 
  ========================================================================
  文件名称: SwitchSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 开关组件 (switch)
  功能说明:
    提供布尔开关类组件的专属属性配置界面，包括：
    1. 开启时文字 (activeText)：当开关状态为 true 时显示的提示文本；
    2. 关闭时文字 (inactiveText)：当开关状态为 false 时显示的提示文本。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <!-- 开关为 true 时的描述文字 (如: "是"、"启用"、"开启") -->
        <el-form-item label="开启文字">
            <el-input 
                v-model="propsData.activeText" 
                placeholder="开启状态的说明文字 (如: 是)" 
            />
        </el-form-item>

        <!-- 开关为 false 时的描述文字 (如: "否"、"停用"、"关闭") -->
        <el-form-item label="关闭文字">
            <el-input 
                v-model="propsData.inactiveText" 
                placeholder="关闭状态的说明文字 (如: 否)" 
            />
        </el-form-item>
    </div>
</template>

<script setup>
defineProps({
    // 接收当前选中开关组件的 props 属性对象
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
</style>
