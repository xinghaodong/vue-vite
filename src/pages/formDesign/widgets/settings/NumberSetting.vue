<!-- 
  ========================================================================
  文件名称: NumberSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 数字输入框 (number) - 基于 el-input-number
  功能说明:
    提供数值/数字类组件的专属属性配置界面，包括：
    1. 最小值 (min) 与 最大值 (max)：例如年龄范围 0 ~ 150，数量不能小于 1；
    2. 步长 (step)：点击上下箭头或键盘操作时的增减单位；
    3. 数值精度 (precision)：保留的小数点位数（0 为纯整数，如年龄；2 为货币金额）；
    4. 控制按钮开关 (controls)：是否显示右侧/两侧的加减箭头按钮。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <!-- 最小值限制 -->
        <el-form-item label="最小值">
            <el-input-number 
                v-model="propsData.min" 
                controls-position="right"
                placeholder="无限制"
            />
            <div class="field-hint">数值下限，例如年龄可设为 0</div>
        </el-form-item>

        <!-- 最大值限制 -->
        <el-form-item label="最大值">
            <el-input-number 
                v-model="propsData.max" 
                controls-position="right"
                placeholder="无限制"
            />
            <div class="field-hint">数值上限，例如年龄可设为 150</div>
        </el-form-item>

        <!-- 增减步长 -->
        <el-form-item label="增减步长">
            <el-input-number 
                v-model="propsData.step" 
                :min="0.01" 
                :step="1"
                controls-position="right"
            />
        </el-form-item>

        <!-- 数值精度 (保留小数位数) -->
        <el-form-item label="数值精度">
            <el-input-number 
                v-model="propsData.precision" 
                :min="0" 
                :max="5"
                controls-position="right"
            />
            <div class="field-hint">保留的小数位数：0 为纯整数，2 为两位小数</div>
        </el-form-item>

        <!-- 是否显示增减控制按钮 -->
        <el-form-item label="控制按钮">
            <el-switch v-model="propsData.controls" />
            <div class="field-hint">关闭后将以纯数字输入框呈现，不显示加减箭头</div>
        </el-form-item>
    </div>
</template>

<script setup>
/**
 * 接收当前选中数字输入框的 props 配置对象
 */
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
.field-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    line-height: 1.4;
}
</style>
