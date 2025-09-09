<template>
    <div>
        <div class="main-container">
            <!-- 1. DndPanel 容器：插件会自动渲染拖拽面板 -->
            <div id="dnd-panel-container" class="dnd-panel"></div>

            <div class="toolbar">
                <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="80px" class="demo-ruleForm">
                    <el-form-item label="模板名称" prop="name">
                        <el-input v-model="ruleForm.name"></el-input>
                    </el-form-item>
                </el-form>

                <el-button type="primary" @click="saveWorkflow">保存流程</el-button>
            </div>

            <!-- 2. LogicFlow 画布容器 -->
            <div id="logic-flow-container" class="canvas"></div>

            <!-- 原有节点配置抽屉 -->
            <el-drawer v-model="drawerVisible" title="节点配置" :with-header="true" size="400px" direction="rtl">
                <el-form label-width="100px" v-if="currentNode">
                    <el-form-item label="节点名称">
                        <el-input placeholder="请输入节点名称" v-model="currentNodeConfig.text.value" />
                    </el-form-item>
                    <el-form-item label="审批人">
                        <el-select v-model="currentNodeConfig.properties.assignee" placeholder="请选择">
                            <el-option label="部门领导" value="deptLeader" />
                            <el-option label="HR专员" value="hr" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="关联表单">
                        <el-select v-model="currentNodeConfig.properties.formId" placeholder="请选择表单">
                            <el-option v-for="form in mockFormList" :key="form.id" :label="form.name" :value="form.id" />
                        </el-select>
                        <el-button link type="primary" @click="previewForm" style="margin-left: 10px"> 预览 </el-button>
                    </el-form-item>
                    <el-form-item label="备注">
                        <el-input type="textarea" v-model="currentNodeConfig.properties.remark" placeholder="请输入备注" />
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="applyConfig">应用配置</el-button>
                    </el-form-item>
                </el-form>
            </el-drawer>

            <!-- 原有表单预览弹窗 -->
            <el-dialog v-model="previewVisible" title="表单预览" width="50%">
                <div v-if="previewSchema">
                    <p>表单名称：{{ previewSchema.name }}</p>
                    <pre>{{ JSON.stringify(previewSchema.schema, null, 2) }}</pre>
                </div>
                <div v-else>暂无表单</div>
            </el-dialog>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick, reactive, getCurrentInstance } from 'vue';
const { proxy } = getCurrentInstance();
import LogicFlow from '@logicflow/core';
// 1. 引入 DndPanel 插件及样式
import { Menu, Control, ProximityConnect, DndPanel } from '@logicflow/extension';
import '@logicflow/core/lib/style/index.css';
import '@logicflow/extension/lib/style/index.css';
import { ElMessage } from 'element-plus';

// 2. 注册 DndPanel 插件
LogicFlow.use(Menu);
LogicFlow.use(Control);
LogicFlow.use(ProximityConnect);
LogicFlow.use(DndPanel); // 注册拖拽面板插件

// 原有表单相关逻辑（保留）
const ruleFormRef = ref(null);
const rules = reactive({
    name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
});
const ruleForm = reactive({ name: '', status: 0, description: '' });

// 原有模拟表单数据（保留）
const mockFormList = [
    { id: 'form_leave_001', name: '请假申请表单' },
    { id: 'form_reimburse_002', name: '报销申请表单' },
];
const mockFormSchemas = {
    form_leave_001: {
        name: '请假申请表单',
        schema: { fields: [{ name: 'reason', label: '原因', type: 'text' }] },
    },
};

// 原有节点配置相关逻辑（保留）
const drawerVisible = ref(false);
const previewVisible = ref(false);
const currentNode = ref(null);
const currentNodeConfig = ref({});
const previewSchema = ref(null);

// 原有流程数据（保留）
const dataObj = ref({
    nodes: [
        {
            id: '36d91bae-43c4-4587-ab6f-967463b402ed',
            type: 'circle',
            x: 240,
            y: 204,
            properties: {
                assignee: 'deptLeader',
                formId: 'form_leave_001',
                remark: '45',
                width: 100,
                height: 100,
            },
            text: {
                x: 240,
                y: 204,
                value: '开始',
            },
        },
        {
            id: '7308bf36-f706-4fd6-ae12-7c7aba03c456',
            type: 'rect',
            x: 242,
            y: 434,
            properties: {
                assignee: 'deptLeader',
                formId: 'form_leave_001',
                remark: '45',
                width: 100,
                height: 80,
            },
            text: {
                x: 242,
                y: 434,
                value: '审批节点45',
            },
        },
    ],
    edges: [
        {
            id: 'dd50c990-e696-4a87-8ae8-d7ea981cf308',
            type: 'bezier',
            properties: {},
            sourceNodeId: '36d91bae-43c4-4587-ab6f-967463b402ed',
            targetNodeId: '7308bf36-f706-4fd6-ae12-7c7aba03c456',
            sourceAnchorId: '36d91bae-43c4-4587-ab6f-967463b402ed_2',
            targetAnchorId: '7308bf36-f706-4fd6-ae12-7c7aba03c456_0',
            startPoint: {
                x: 240,
                y: 254,
            },
            endPoint: {
                x: 242,
                y: 394,
            },
            pointsList: [
                {
                    x: 240,
                    y: 254,
                },
                {
                    x: 240,
                    y: 354,
                },
                {
                    x: 242,
                    y: 294,
                },
                {
                    x: 242,
                    y: 394,
                },
            ],
        },
    ],
});

// LogicFlow 实例
let lf = null;

// 初始化 LogicFlow
const initLogicFlow = () => {
    lf = new LogicFlow({
        container: document.querySelector('#logic-flow-container'),
        edgeType: 'bezier',
        grid: true,
        background: { color: '#f8f9fa' },
        // ProximityConnect
        plugins: [Menu, Control, DndPanel],
        // 3. 配置 DndPanel 容器 指定拖拽面板渲染位置
        extension: {
            dndPanel: {
                container: document.querySelector('#dnd-panel-container'), // 拖拽面板的DOM容器
                width: 180, // 面板宽度
                title: '审批流节点库', // 面板标题
            },
        },
    });

    // 4. 设置 DndPanel 拖拽项
    lf.extension.dndPanel.setPatternItems([
        {
            type: 'circle', // 节点类型：圆形（开始节点）
            text: '开始', // 拖拽到画布后节点的默认文本
            label: '开始节点', // 拖拽面板中显示的节点名称
            properties: { assignee: '', formId: '', remark: '' },
            icon: '/yq.png',
        },
        {
            type: 'rect', // 节点类型：矩形（审批节点）
            text: '审批节点', // 默认文本
            label: '审批节点', // 面板显示名称
            properties: { assignee: '', formId: '', remark: '' }, // 默认属性
            icon: '/jx.png',
        },
        {
            type: 'diamond', // 节点类型：矩形（审批节点）
            text: '条件节点', // 默认文本
            label: '条件节点', // 面板显示名称
            properties: { assignee: '', formId: '', remark: '' }, // 默认属性
            icon: '/tj.png',
        },
        {
            type: 'circle', // 节点类型：菱形（结束节点）
            text: '结束', // 默认文本
            label: '结束节点', // 面板显示名称
            properties: { assignee: '', formId: '', remark: '' }, // 默认属性
            icon: '/yq.png',
        },
    ]);

    // 原有主题适配逻辑（保留）
    if (localStorage.getItem('theme') === 'dark') {
        lf.setTheme({}, 'dark');
    } else {
        lf.setTheme(
            {
                nodeText: {
                    color: '#333',
                    fontSize: 14,
                },
                edgeText: {
                    color: '#333',
                    fontSize: 12,
                },
            },
            'custom',
        );
    }

    // 原有节点点击事件（保留）
    lf.on('node:click', ({ data }) => {
        currentNode.value = data;
        currentNodeConfig.value = {
            text: { value: typeof data.text === 'string' ? data.text : data.text?.value || '' },
            properties: {
                assignee: data.properties?.assignee || '',
                formId: data.properties?.formId || '',
                remark: data.properties?.remark || '',
            },
        };
        drawerVisible.value = true;
    });

    // 原有画布渲染逻辑（保留）
    lf.render();
    // 回显数据
    // lf.renderRawData(dataObj.value);
};

// 原有应用节点配置逻辑
const applyConfig = () => {
    if (!currentNode.value?.id) {
        console.error('当前节点无效');
        return;
    }
    try {
        lf.setProperties(currentNode.value.id, {
            ...currentNode.value.properties,
            ...currentNodeConfig.value.properties,
        });
        lf.updateText(currentNode.value.id, currentNodeConfig.value.text.value);
        drawerVisible.value = false;
    } catch (error) {
        console.error('更新节点失败:', error);
    }
};

// 原有预览表单逻辑（保留）
const previewForm = () => {
    const formId = currentNodeConfig.value.properties.formId;
    if (!formId) {
        alert('请选择表单');
        return;
    }
    previewSchema.value = mockFormSchemas[formId] || null;
    previewVisible.value = true;
};

// 原有保存工作流逻辑（保留）
const saveWorkflow = async () => {
    const graphData = lf.getGraphData();
    let obj = { ...ruleForm, graphData: graphData };
    console.log('流程数据:', graphData, obj);
    // 可在此处添加接口请求提交数据
    const res = await proxy.$api.logicadd(obj);
    if (res.code === 200) {
        ElMessage.success('保存成功');
    } else {
        ElMessage.error('保存失败');
    }
};

// 初始化（保留）
onMounted(() => {
    nextTick().then(initLogicFlow);
});
</script>

<style scoped>
.main-container {
    display: flex;
    height: calc(100vh - 116px);
    position: relative;
}

.dnd-panel {
    position: absolute;
    left: 10px;
    top: 10px;
    width: 180px;
    background-color: #10b981bf;
    box-shadow: 0 0 10px 1px #e4e0db;
    border-radius: 6px;
    z-index: 101;
    /* 插件默认标题样式调整 */
}

.toolbar {
    position: absolute;
    right: 10px;
    top: 68px;
    width: 253px;
    padding: 20px 10px;
    text-align: center;
    z-index: 101;

    background: #fff;
    border-radius: 5px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    margin: 5px;
}

/* 原有画布样式（保留） */
.canvas {
    flex: 1;
    height: 100%;
    position: relative;
}

.demo-ruleForm {
    margin-top: 20px;
}

/* 修复节点文本溢出（保留） */
.lf-node text {
    white-space: nowrap;
}
</style>

<style>
.lf-control-text {
    color: black !important;
}
</style>
