<!-- 
  ========================================================================
  文件名称: CardSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 分组卡片容器 (card)
  功能说明:
    提供分组卡片容器的专属属性配置界面，包括：
    1. 卡片标题 (title)：自定义分组标题；
    2. 卡片阴影 (shadow)：常驻 (always) / 悬浮 (hover) / 从不 (never)；
    3. 卡片边框 (bordered)：是否显示外边框。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <el-form-item label="卡片标题">
            <el-input v-model="propsData.title" placeholder="请输入卡片标题" clearable />
        </el-form-item>

        <el-form-item label="卡片阴影">
            <el-radio-group v-model="propsData.shadow" size="small">
                <el-radio-button label="always">常驻</el-radio-button>
                <el-radio-button label="hover">悬停</el-radio-button>
                <el-radio-button label="never">无阴影</el-radio-button>
            </el-radio-group>
        </el-form-item>

        <el-form-item label="显示边框">
            <el-switch v-model="propsData.bordered" />
        </el-form-item>
    </div>
</template>

<script setup>
defineProps({
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
