<!-- 
  ========================================================================
  文件名称: CascaderSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 级联选择器 (cascader)
  功能说明:
    提供级联选择器的专属属性配置界面，支持：
    1. 静态树形层级数据管理：支持一键导入行政省市区/组织架构预设，支持快速 JSON 树编辑与校验；
    2. 动态数据源集成：配置后端 API 请求地址 (apiUrl)，在渲染器运行时自动拉取层级字典；
    3. 级联交互特性：支持选择任意一级 (checkStrictly)、多选 (multiple)、仅返回最后一级 (emitPath)、
       关键字搜索过滤 (filterable)、一键清除 (clearable)、完整层级展示 (showAllLevels)。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <!-- 1. 静态树形数据源配置 -->
        <el-form-item label="层级数据源">
            <div class="tree-options-box">
                <div class="tree-summary">
                    <span>当前共 <b>{{ countTreeNodes(propsData.options) }}</b> 个节点</span>
                    <el-button link type="primary" size="small" @click="openJsonEditor">
                        <el-icon style="margin-right: 2px"><Edit /></el-icon>
                        编辑 JSON 树
                    </el-button>
                </div>

                <!-- 快捷预设模版导入 -->
                <div class="preset-buttons">
                    <span class="preset-label">快捷预设:</span>
                    <el-button size="small" text bg type="primary" @click="loadPreset('region')">
                        省市区
                    </el-button>
                    <el-button size="small" text bg type="success" @click="loadPreset('org')">
                        部门组织
                    </el-button>
                </div>
            </div>
        </el-form-item>

        <!-- 2. 动态后端接口配置 -->
        <el-form-item label="动态数据源">
            <el-input 
                v-model="propsData.apiUrl" 
                placeholder="例如: /api/enums/regionTree" 
                clearable
            />
            <div class="field-hint">
                说明：留空则使用上述静态选项；配置 API 地址后，渲染器在打开时将自动请求该接口填充层级树。
            </div>
        </el-form-item>

        <!-- 3. 级联核心行为特性 -->
        <div class="sub-divider">级联行为设置</div>

        <el-form-item label="任意一级可选">
            <el-switch v-model="safeCascaderProps.checkStrictly" />
            <div class="field-hint">开启后，点击非叶子节点（如省、市）也可直接选中，无需强制选到最底层。</div>
        </el-form-item>

        <el-form-item label="支持多选">
            <el-switch v-model="safeCascaderProps.multiple" />
        </el-form-item>

        <el-form-item label="返回完整路径">
            <el-switch v-model="safeCascaderProps.emitPath" />
            <div class="field-hint">
                开启后绑定值为数组（如 ['zhejiang', 'hangzhou']）；关闭后仅返回最后一级的值。
            </div>
        </el-form-item>

        <el-form-item label="显示完整路径">
            <el-switch v-model="propsData.showAllLevels" />
            <div class="field-hint">输入框中是否显示所有父级名称（如“浙江省 / 杭州市”）。</div>
        </el-form-item>

        <el-form-item label="支持搜索">
            <el-switch v-model="propsData.filterable" />
        </el-form-item>

        <el-form-item label="可清除">
            <el-switch v-model="propsData.clearable" />
        </el-form-item>

        <!-- JSON 树编辑弹窗 -->
        <el-dialog
            v-model="jsonDialogVisible"
            title="编辑级联树形 JSON 数据"
            width="560px"
            append-to-body
            :close-on-click-modal="false"
        >
            <div class="json-editor-content">
                <div class="editor-tips">
                    节点需包含 <code>value</code>、<code>label</code> 属性，子节点在 <code>children</code> 数组中。
                </div>
                <el-input
                    v-model="rawJsonText"
                    type="textarea"
                    :rows="12"
                    placeholder="请输入符合 JSON 规范的树形数组..."
                    class="code-textarea"
                />
                <div v-if="jsonError" class="json-error-tip">
                    {{ jsonError }}
                </div>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <el-button size="small" @click="formatJson">格式化</el-button>
                    <el-button size="small" @click="jsonDialogVisible = false">取消</el-button>
                    <el-button size="small" type="primary" @click="saveJsonTree">确认保存</el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Edit } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
    propsData: {
        type: Object,
        required: true,
    },
    type: {
        type: String,
        default: 'cascader',
    },
});

// 安全确保 Element Plus 原生级联 props 配置对象存在
const safeCascaderProps = computed(() => {
    if (!props.propsData.props) {
        props.propsData.props = {
            checkStrictly: false,
            multiple: false,
            emitPath: true,
        };
    }
    return props.propsData.props;
});

// 统计树节点数量
const countTreeNodes = list => {
    if (!Array.isArray(list)) return 0;
    let count = 0;
    const dfs = nodes => {
        nodes.forEach(node => {
            count++;
            if (node.children && Array.isArray(node.children)) {
                dfs(node.children);
            }
        });
    };
    dfs(list);
    return count;
};

// 预设数据源
const presets = {
    region: [
        {
            value: 'zhejiang',
            label: '浙江省',
            children: [
                {
                    value: 'hangzhou',
                    label: '杭州市',
                    children: [
                        { value: 'xihu', label: '西湖区' },
                        { value: 'binjiang', label: '滨江区' },
                        { value: 'yuhang', label: '余杭区' },
                    ],
                },
                {
                    value: 'ningbo',
                    label: '宁波市',
                    children: [
                        { value: 'haishu', label: '海曙区' },
                        { value: 'jiangbei', label: '江北区' },
                    ],
                },
            ],
        },
        {
            value: 'guangdong',
            label: '广东省',
            children: [
                {
                    value: 'guangzhou',
                    label: '广州市',
                    children: [
                        { value: 'tianhe', label: '天河区' },
                        { value: 'yuexiu', label: '越秀区' },
                    ],
                },
                {
                    value: 'shenzhen',
                    label: '深圳市',
                    children: [
                        { value: 'nanshan', label: '南山区' },
                        { value: 'futian', label: '福田区' },
                    ],
                },
            ],
        },
    ],
    org: [
        {
            value: 'exec',
            label: '总经办',
            children: [
                { value: 'sec', label: '秘书处' },
                { value: 'audit', label: '内审部' },
            ],
        },
        {
            value: 'rd',
            label: '研发中心',
            children: [
                {
                    value: 'fe',
                    label: '前端架构组',
                    children: [
                        { value: 'fe_pc', label: 'PC 团队' },
                        { value: 'fe_mobile', label: '移动团队' },
                    ],
                },
                {
                    value: 'be',
                    label: '后端工程组',
                    children: [
                        { value: 'be_cloud', label: '云原生组' },
                        { value: 'be_data', label: '大数据组' },
                    ],
                },
            ],
        },
        {
            value: 'market',
            label: '市场运营中心',
            children: [
                { value: 'm_brand', label: '品牌部' },
                { value: 'm_sales', label: '渠道销售' },
            ],
        },
    ],
};

// 一键载入预设
const loadPreset = key => {
    props.propsData.options = JSON.parse(JSON.stringify(presets[key] || []));
    ElMessage.success(`已载入${key === 'region' ? '省市区' : '部门组织'}层级数据`);
};

// JSON 弹窗相关
const jsonDialogVisible = ref(false);
const rawJsonText = ref('');
const jsonError = ref('');

const openJsonEditor = () => {
    rawJsonText.value = JSON.stringify(props.propsData.options || [], null, 2);
    jsonError.value = '';
    jsonDialogVisible.value = true;
};

const formatJson = () => {
    try {
        const parsed = JSON.parse(rawJsonText.value);
        rawJsonText.value = JSON.stringify(parsed, null, 2);
        jsonError.value = '';
    } catch (e) {
        jsonError.value = `格式化失败: ${e.message}`;
    }
};

const saveJsonTree = () => {
    try {
        const parsed = JSON.parse(rawJsonText.value);
        if (!Array.isArray(parsed)) {
            jsonError.value = '树形数据根节点必须为数组格式 [ ... ]';
            return;
        }
        props.propsData.options = parsed;
        jsonDialogVisible.value = false;
        ElMessage.success('层级树数据更新成功');
    } catch (e) {
        jsonError.value = `JSON 解析错误: ${e.message}`;
    }
};
</script>

<style scoped>
.setting-group {
    padding: 0 4px;
}
.tree-options-box {
    width: 100%;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
}
.tree-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: #475569;
    margin-bottom: 6px;
}
.preset-buttons {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
}
.preset-label {
    color: #94a3b8;
}
.sub-divider {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    margin: 12px 0 6px 0;
    padding-bottom: 4px;
    border-bottom: 1px dashed #e2e8f0;
}
.field-hint {
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.4;
    margin-top: 4px;
}
.json-editor-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.editor-tips {
    font-size: 12px;
    color: #64748b;
}
.editor-tips code {
    background: #e2e8f0;
    padding: 2px 4px;
    border-radius: 4px;
    color: #0f172a;
}
.code-textarea :deep(textarea) {
    font-family: 'Consolas', 'Menlo', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.5;
}
.json-error-tip {
    font-size: 12px;
    color: #ef4444;
}
</style>
