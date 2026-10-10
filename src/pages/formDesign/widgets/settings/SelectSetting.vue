<!-- 
  ========================================================================
  文件名称: SelectSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 下拉选择 (select)、单选框组 (radio)、多选框组 (checkbox)
  功能说明:
    提供数据选项类组件的专属属性配置界面，支持：
    1. 静态选项管理：动态添加、编辑、删除【标签 (label)】与【值 (value)】；
    2. 动态数据源集成：配置后端 API 请求地址 (apiUrl)，在渲染器运行时自动拉取数据字典；
    3. 交互特性：支持多选 (multiple)、拼音/关键字搜索过滤 (filterable)、一键清除 (clearable)。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <!-- 1. 静态选项管理列表 -->
        <el-form-item label="静态选项">
            <div class="options-wrapper">
                <div v-for="(option, idx) in propsData.options" :key="idx" class="option-row">
                    <el-input 
                        v-model="option.label" 
                        placeholder="选项标签 (如: 男)" 
                        size="small" 
                        class="opt-input" 
                    />
                    <el-input 
                        v-model="option.value" 
                        placeholder="选项值 (如: 1)" 
                        size="small" 
                        class="opt-input" 
                    />
                    <el-button 
                        @click="removeOption(idx)" 
                        type="danger" 
                        size="small" 
                        circle
                        title="删除该项"
                    >
                        <el-icon><Delete /></el-icon>
                    </el-button>
                </div>
                <el-button 
                    @click="addOption" 
                    type="primary" 
                    size="small" 
                    plain 
                    style="width: 100%; margin-top: 6px"
                >
                    + 添加静态选项
                </el-button>
            </div>
        </el-form-item>

        <!-- 2. 动态后端接口配置 -->
        <el-form-item label="动态数据源">
            <el-input 
                v-model="propsData.apiUrl" 
                placeholder="例如: /api/enums/leaveType" 
                clearable
            />
            <div class="field-hint">
                说明：留空则使用上述静态选项；配置 API 地址后，渲染器在打开时将自动请求该接口填充选项列表。
            </div>
        </el-form-item>

        <!-- 2.1 自动回填当前登录用户 (申请人专用特性) -->
        <el-form-item label="默认当前人">
            <el-switch v-model="propsData.defaultCurrentUser" />
            <div class="field-hint">
                说明：开启后，新建填单时自动调用 /internalusers/getUserInfo 回显登录人自己；审批时根据历史 ID 反查姓名。
            </div>
        </el-form-item>

        <!-- 3. 下拉框与多选专属配置项 -->
        <!-- 单选框 (radio) 天然不支持多选，故过滤隐藏 -->
        <el-form-item label="支持多选" v-if="type !== 'radio'">
            <el-switch v-model="propsData.multiple" />
        </el-form-item>

        <!-- 下拉框专属：是否支持在下拉面板中输入搜索过滤 -->
        <el-form-item label="支持搜索" v-if="type === 'select'">
            <el-switch v-model="propsData.filterable" />
        </el-form-item>

        <!-- 下拉框专属：是否展示快速清除按钮 -->
        <el-form-item label="可清除" v-if="type === 'select'">
            <el-switch v-model="propsData.clearable" />
        </el-form-item>
    </div>
</template>

<script setup>
import { Delete } from '@element-plus/icons-vue';

const props = defineProps({
    // 当前选中组件的 props 数据对象
    propsData: {
        type: Object,
        required: true,
    },
    // 当前组件的具体类型 ('select' | 'radio' | 'checkbox')
    type: {
        type: String,
        default: 'select',
    },
});

// 新增一行静态选项
const addOption = () => {
    if (!Array.isArray(props.propsData.options)) {
        props.propsData.options = [];
    }
    const idx = props.propsData.options.length + 1;
    props.propsData.options.push({ label: `选项${idx}`, value: `opt_${idx}` });
};

// 移除指定索引的静态选项
const removeOption = idx => {
    props.propsData.options.splice(idx, 1);
};
</script>

<style scoped>
.options-wrapper {
    width: 100%;
}
.option-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
}
.opt-input {
    flex: 1;
}
.field-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    line-height: 1.4;
}
</style>
