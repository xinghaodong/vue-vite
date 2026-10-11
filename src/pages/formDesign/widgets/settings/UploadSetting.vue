<!-- 
  ========================================================================
  文件名称: UploadSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings) Setter （右侧配置上传格式、大小限制）
  适用组件: 附件/发票凭证上传 (upload)
  功能说明:
    提供文件与凭据上传类组件的专属属性配置界面，包括：
    1. 允许上传格式 (accept)：支持的后缀白名单（如 .jpg,.jpeg,.png,.pdf）；
    2. 最大上传数量 (limit)：用户最多可以上传的附件总张数；
    3. 单文件大小上限 (maxSize)：防止超大文件上传造成后端存储或网络阻塞（单位：MB）；
    4. 提示文字 (tip)：展示在上传按钮下方的操作指引文案。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <!-- 允许上传的文件类型/后缀白名单 -->
        <el-form-item label="允许格式">
            <el-input 
                v-model="propsData.accept" 
                placeholder="如: .jpg,.jpeg,.png,.pdf" 
            />
            <div class="field-hint">
                说明：逗号分隔的扩展名，例如 .jpg,.png,.pdf。
            </div>
        </el-form-item>

        <!-- 允许上传的最大文件个数 -->
        <el-form-item label="最大张数">
            <el-input-number 
                v-model="propsData.limit" 
                :min="1" 
                :max="50" 
                controls-position="right"
            />
        </el-form-item>

        <!-- 单个文件的容量限制 (MB) -->
        <el-form-item label="大小限制">
            <el-input-number 
                v-model="propsData.maxSize" 
                :min="1" 
                :max="100" 
                controls-position="right"
            />
            <span style="margin-left: 8px; font-size: 13px; color: #606266">MB</span>
        </el-form-item>

        <!-- 按钮下方引导文案 -->
        <el-form-item label="提示文字">
            <el-input 
                v-model="propsData.tip" 
                type="textarea"
                :rows="2"
                placeholder="展示在上传按钮下方的操作引导文案" 
            />
        </el-form-item>
    </div>
</template>

<script setup>
defineProps({
    // 接收当前选中上传组件的 props 属性对象
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
