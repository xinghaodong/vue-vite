<!-- 
  ========================================================================
  文件名称: GridSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 栅格布局容器 (grid)
  功能说明:
    提供布局容器类组件的专属属性配置界面，包括：
    1. 栅格间距 (gutter)：各列之间的像素间隔；
    2. 分栏管理：支持动态增加或删除栅格栏目；
    3. 栏目宽度占比 (span)：基于 Element 24 栅格体系，通过滑块直观微调每栏的宽度比例。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <!-- 栅格各列之间的左右间距 (px) -->
        <el-form-item label="栅格间隔">
            <el-input-number 
                v-model="propsData.gutter" 
                :min="0" 
                :max="40" 
                :step="5" 
                controls-position="right"
            />
            <span style="margin-left: 6px; font-size: 12px; color: #909399">px</span>
        </el-form-item>

        <!-- 分栏列表与比例滑动条 -->
        <el-form-item label="分栏配置">
            <div class="col-list-wrapper">
                <div v-for="(col, idx) in propsData.columns" :key="idx" class="col-item-box">
                    <div class="col-header">
                        <span class="col-title">第 {{ idx + 1 }} 栏</span>
                        <!-- 至少保留一栏，多于一栏时允许删除 -->
                        <el-button
                            v-if="propsData.columns.length > 1"
                            @click="removeColumn(idx)"
                            type="danger"
                            size="small"
                            circle
                            title="删除此栏"
                        >
                            <el-icon><Delete /></el-icon>
                        </el-button>
                    </div>
                    <!-- 24 栅格比例滑块 -->
                    <div class="col-slider">
                        <el-slider 
                            v-model="col.span" 
                            :min="1" 
                            :max="24" 
                            :step="1" 
                            show-stops 
                        />
                        <span class="span-badge">{{ col.span }}/24 占比</span>
                    </div>
                </div>

                <!-- 增加一栏，限制最多 6 栏以防界面拥挤 -->
                <el-button
                    @click="addColumn"
                    type="primary"
                    size="small"
                    plain
                    style="width: 100%; margin-top: 8px"
                    :disabled="propsData.columns.length >= 6"
                >
                    + 添加分栏
                </el-button>
            </div>
        </el-form-item>
    </div>
</template>

<script setup>
import { Delete } from '@element-plus/icons-vue';

const props = defineProps({
    // 接收当前选中栅格容器组件的 props 属性对象 (内含 gutter 与 columns)
    propsData: {
        type: Object,
        required: true,
    },
});

// 新增一栏（默认分配 12/24 占比，自带空 children 列表）
const addColumn = () => {
    props.propsData.columns.push({ span: 12, list: [] });
};

// 移除指定栏目
const removeColumn = idx => {
    props.propsData.columns.splice(idx, 1);
};
</script>

<style scoped>
.col-list-wrapper {
    width: 100%;
}
.col-item-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 8px;
}
.col-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}
.col-title {
    font-size: 13px;
    font-weight: 500;
    color: #475569;
}
.col-slider {
    display: flex;
    align-items: center;
    gap: 10px;
}
.span-badge {
    font-size: 12px;
    color: #64748b;
    white-space: nowrap;
}
</style>
