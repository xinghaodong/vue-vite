<!-- 
  ========================================================================
  文件名称: SliderSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 滑块组件 (slider) - 基于 el-slider
  功能说明:
    提供数值滑块类组件的专属属性配置界面，包括：
    1. 最小值 (min) 与 最大值 (max)：滑块拖拽的数值区间；
    2. 增减步长 (step)：滑动时的刻度步进距离；
    3. 显示输入框 (showInput)：滑块右侧附带精细数字输入框；
    4. 显示间断点 (showStops)：在滑动轨道上是否渲染各个步长分割点。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <!-- 最小值限制 -->
        <el-form-item label="最小值">
            <el-input-number 
                v-model="propsData.min" 
                controls-position="right"
                placeholder="0"
            />
            <div class="field-hint">滑块滑动区间的起始下限</div>
        </el-form-item>

        <!-- 最大值限制 -->
        <el-form-item label="最大值">
            <el-input-number 
                v-model="propsData.max" 
                controls-position="right"
                placeholder="100"
            />
            <div class="field-hint">滑块滑动区间的终止上限</div>
        </el-form-item>

        <!-- 增减步长 -->
        <el-form-item label="增减步长">
            <el-input-number 
                v-model="propsData.step" 
                :min="1" 
                :step="1"
                controls-position="right"
            />
            <div class="field-hint">拖拽滑块时的数值增减步长</div>
        </el-form-item>

        <!-- 是否显示右侧数字输入框 -->
        <el-form-item label="显示输入框">
            <el-switch v-model="propsData.showInput" />
            <div class="field-hint">开启后，滑块右侧带数字输入框，支持手动精准敲入数值</div>
        </el-form-item>

        <!-- 是否显示间断点 -->
        <el-form-item label="显示间断点">
            <el-switch v-model="propsData.showStops" />
            <div class="field-hint">开启后，在滑块轨道上直观展示每个步长分界小圆点</div>
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
        default: 'slider',
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
