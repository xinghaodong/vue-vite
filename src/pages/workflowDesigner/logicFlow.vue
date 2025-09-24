<!-- logicFlow 流程设计器 -->
<template>
    <div>
        <div class="main-container">
            <!-- 1. DndPanel 容器：插件会自动渲染拖拽面板 -->
            <div id="dnd-panel-container" class="dnd-panel"></div>

            <!-- <div class="toolbar" v-if="!workflowId"> -->

            <el-card style="max-width: 480px" class="toolbar" v-if="!workflowId">
                <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="80px" class="demo-ruleForm">
                    <el-form-item label="模板名称" prop="name">
                        <el-input v-model="ruleForm.name"></el-input>
                    </el-form-item>
                    <!-- 关联表单 -->
                    <el-form-item label="关联表单" prop="formId">
                        <!-- <el-input v-model="ruleForm.formId"></el-input> -->
                        <el-select v-model="ruleForm.formId" placeholder="请选择关联表单">
                            <el-option v-for="form in mockFormList" :key="form.id" :label="form.name" :value="form.id"> </el-option>
                        </el-select>
                        <el-button link type="primary" @click="previewForm" style="margin-left: 10px"> 预览 </el-button>
                    </el-form-item>
                </el-form>
                <el-button type="primary" @click="saveWorkflow">保存流程</el-button>
            </el-card>

            <!-- </div> -->

            <!-- 2. LogicFlow 画布容器 -->
            <div id="logic-flow-container" class="canvas"></div>

            <!-- 原有节点配置抽屉 -->
            <el-drawer v-model="drawerVisible" title="节点配置" :with-header="true" size="400px" direction="rtl">
                <el-form label-width="100px" v-if="currentNode">
                    <el-form-item label="节点名称">
                        <el-input placeholder="请输入节点名称" v-model="currentNodeConfig.text.value" />
                    </el-form-item>
                    <el-form-item label="审批人" v-if="currentNode?.type === 'rect'">
                        <el-select v-model="currentNodeConfig.properties.assignee" @change="loadApiOptions(currentNodeConfig.properties.assignee)" placeholder="请选择">
                            <el-option v-for="item in options" :key="item" :label="item.name" :value="item.id" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="条件表达式" v-if="currentNode?.type === 'diamond'">
                        <el-input v-model="currentNodeConfig.properties.condition" placeholder="如请假审批: days>3" />
                    </el-form-item>
                    <el-form-item label="关联表单" v-if="currentNode?.type === 'rect'">
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

            <el-dialog v-model="previewVisible" title="表单预览" width="70%" top="5vh" custom-class="code-dialog">
                <div style="height: 70vh; overflow: auto; padding: 10px; border-radius: 4px">
                    <DynamicForm :schema="formSchema" :ui-config="uiConfig" />
                </div>
            </el-dialog>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick, reactive, getCurrentInstance } from 'vue';
import DynamicForm from '@/pages/formDesign/components/DynamicForm.vue';
const { proxy } = getCurrentInstance();
import { useRoute } from 'vue-router';
import LogicFlow from '@logicflow/core';
import { registerCustomNodes } from './customNodes.js';
// 1. 引入 DndPanel 插件及样式
import { Menu, Control, ProximityConnect, DndPanel } from '@logicflow/extension';
import '@logicflow/core/lib/style/index.css';
import '@logicflow/extension/lib/style/index.css';
import { ElMessage } from 'element-plus';

const props = defineProps({
    workflowId: {
        type: Number || String,
    },
    appId: {
        type: Number || String,
    },
});

const formSchema = ref([]); // 从接口获取的 schema
const uiConfig = ref({}); // 从接口获取的 ui_config
// const formData = ref({}); // 表单数据
const formName = ref('');
// 父组件传来的参数

// 2. 注册 DndPanel 插件
LogicFlow.use(Control);
if (!props.workflowId) {
    LogicFlow.use(Menu);
    LogicFlow.use(DndPanel); // 注册拖拽面板插件
}

// 原有表单相关逻辑
const ruleFormRef = ref(null);
const rules = reactive({
    name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
    formId: [{ required: true, message: '请选择关联表单', trigger: 'change' }],
});
const ruleForm = ref({ name: '', formId: '', status: 0, description: '' });
const options = ref([]);

const route = useRoute();
const idkey = route.query.idkey || props.workflowId;
// 表单数据
const mockFormList = ref([{ id: 'form_leave_001', name: '请假申请表单' }]);

// 原有节点配置相关逻辑
const drawerVisible = ref(false);
const previewVisible = ref(false);
const currentNode = ref(null);
const currentNodeConfig = ref({});
const approvalHistoryData = ref(null);

// 原有流程数据
const dataObj = ref({});

// LogicFlow 实例
let lf = null;
// 初始化 LogicFlow
const initLogicFlow = () => {
    lf = new LogicFlow({
        container: document.querySelector('#logic-flow-container'),
        edgeType: 'bezier',
        grid: true,
        background: { color: '#f8f9fa' },
    });

    // ========== 注册所有自定义节点 ========== //
    registerCustomNodes(lf, calculateNodeColors, approvalHistoryData);
    let nodeData = [
        {
            type: 'circle', // 节点类型：圆形（开始节点）
            text: '开始', // 拖拽到画布后节点的默认文本
            label: '开始节点', // 拖拽面板中显示的节点名称
            properties: {}, // 空对象，不挂业务属性
            icon: '/yq.png',
        },
        {
            type: 'rect', // 节点类型：矩形（审批节点）
            text: '审批节点', // 默认文本
            label: '审批节点', // 面板显示名称
            properties: { assignee: '', assigneeName: '', formId: '', remark: '' }, // 默认属性
            icon: '/jx.png',
            fill: '#87CEFA',
            stroke: '#1E90FF',
        },
        {
            type: 'diamond', // 节点类型：矩形（审批节点）
            text: '条件节点', // 默认文本
            label: '条件节点', // 面板显示名称
            properties: { condition: '' }, //  条件节点挂条件表达式，不挂人
            icon: '/tj.png',
        },
        {
            type: 'circle', // 节点类型：菱形（结束节点）
            text: '结束', // 默认文本
            label: '结束节点', // 面板显示名称
            properties: {}, // 默认属性
            icon: '/yq.png',
        },
    ];

    // 4. 设置 DndPanel 拖拽项
    if (!props.workflowId) {
        lf.extension.dndPanel.setPatternItems(nodeData);
    }

    // 原有主题适配逻辑
    if (localStorage.getItem('theme') === 'dark') {
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
            'dark',
        );
    }

    // 原有节点点击事件
    lf.on('node:click', ({ data }) => {
        console.log('点击了节点:', data);
        if (props.workflowId) return;
        currentNode.value = data;
        currentNodeConfig.value = {
            text: { value: typeof data.text === 'string' ? data.text : data.text?.value || '' },
            properties: {
                assignee: data.properties?.assignee || '', // 审批节点挂审批人
                formId: data.properties?.formId || '',
                remark: data.properties?.remark || '',
                condition: data.properties?.condition || '',
            },
        };
        drawerVisible.value = true;
    });

    // 原有画布渲染逻辑
    lf.render();
    // 回显数据
    if (idkey) {
        lf.renderRawData(dataObj.value);
        if (props.appId) {
            getApprovalHistory().then(() => {
                injectNodeStatusIntoGraphData();
            });
        }
    }
};
// 通用的颜色计算函数
const calculateNodeColors = (properties, globalStatus) => {
    const status = properties?.nodeStatus;
    const title = properties?.nodeTitle;

    let fill, stroke;

    // 特殊处理开始和结束节点
    if (title === '开始') {
        fill = '#d4edda'; // 浅绿
        stroke = '#155724'; // 深绿
    } else if (title === '结束') {
        if (globalStatus == 2) {
            fill = '#c3e6cb'; // 整个流程通过 - 绿
            stroke = '#28a745';
        } else if (globalStatus == 3) {
            fill = '#f5c6cb'; // 整个流程拒绝 - 红
            stroke = '#dc3545';
        } else {
            fill = '#fff'; // 流程进行中 - 灰
            stroke = '#000';
        }
    } else {
        // 普通节点按状态着色
        switch (status) {
            case '2' || 2: // 通过
                fill = '#d4edda';
                stroke = '#155724';
                break;
            case '3' || 3: // 驳回
                fill = '#f5c6cb';
                stroke = '#dc3545';
                break;
            case '1' || 1: // 审批中
                fill = '#fff3cd';
                stroke = '#ffc107';
                break;
            default: // 未开始
                fill = '#fff';
                stroke = '#000';
                break;
        }
    }

    return { fill, stroke };
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
const loadApiOptions = () => {
    let item = options.value.find(option => option.id == currentNodeConfig.value.properties.assignee);
    currentNodeConfig.value.properties.assigneeName = item.name;
};
// 获取审批历史 主要用于给流程设计器显示状态
const getApprovalHistory = async () => {
    try {
        let data = await proxy.$api.getApprovalHistory({ id: props.appId });
        if (data.code == 200) {
            approvalHistoryData.value = data.data;
            return approvalHistoryData.value;
        }
    } catch (error) {
        console.log(error);
    }
};

// 预览表单
const previewForm = async () => {
    const formId = ruleForm.value.formId || currentNodeConfig.value.properties.formId;
    if (!formId) {
        proxy.$message.warning('请先选择表单');
        return;
    }
    previewVisible.value = true;
    // 根据formId 查询表单接口
    const data = await proxy.$api.designDetail({ id: formId });
    if (data.code == 200) {
        formSchema.value = JSON.parse(data.data.schema);
        uiConfig.value = data.data.ui_config;
        formName.value = data.data.name;
    }
};

// 保存工作流
const saveWorkflow = async () => {
    const graphData = lf.getGraphData();
    let obj = { ...ruleForm.value, graphData: graphData };
    let res = null;
    if (idkey) {
        obj.id = idkey;
    }
    res = await proxy.$api.logicadd(obj);
    if (res.code == 200) {
        ElMessage.success('保存成功');
        proxy.$router.push({ path: '/home/logicFlowList' });
    } else {
        ElMessage.error('保存失败');
    }
};
// 获取流程设计器
const getLogicdetail = async () => {
    try {
        const res = await proxy.$api.logicdetail({ id: idkey });
        if (res.code === 200) {
            ruleForm.value = res.data;
            dataObj.value = res.data.graphData;
            if (dataObj.value && dataObj.value.nodes) {
                dataObj.value.nodes = dataObj.value.nodes.map(node => {
                    let newType = node.type;
                    // 根据原始类型映射到自定义类型
                    if (node.type === 'rect') {
                        newType = 'rect';
                    } else if (node.type === 'circle') {
                        newType = 'circle';
                    } else if (node.type === 'diamond') {
                        newType = 'diamond';
                    }
                    return {
                        ...node,
                        type: newType,
                    };
                });
            }
            initLogicFlow();
        }
    } catch (error) {
        console.log(error);
    }
};
// 将审批状态的颜色直接注入到 graphData 中
const injectNodeStatusIntoGraphData = () => {
    lf.setProperties({ globalStatus: approvalHistoryData.value?.status });
    if (approvalHistoryData.value && approvalHistoryData.value.steps) {
        const { steps } = approvalHistoryData.value;
        steps.forEach(step => {
            // console.log('step', step);
            const { nodeId, status, title, userName, comment } = step;
            try {
                // 关键：只更新 properties，不碰 fill/stroke
                lf.setProperties(nodeId, {
                    nodeStatus: status, // 将状态存入 properties
                    nodeTitle: title, // 将标题存入 properties
                    assigneeName: userName || '', //设置审批人姓名
                    comment: comment || '', //设置审批人意见
                });
                // console.log(`节点 ${nodeId} 状态属性更新为: ${status}`, step);
            } catch (error) {
                console.warn(`节点 ${nodeId} 不存在或更新失败:`, error.message);
            }
        });
    }
};

const findAll = async () => {
    const res = await proxy.$api.findAll();
    if (res.code === 200) {
        options.value = res.data;
    }
};

const designNoPage = async () => {
    const res = await proxy.$api.designNoPage({ status: '1' });
    if (res.code === 200) {
        console.log('表单列表', res.data);
        mockFormList.value = res.data;
    }
};

// 初始化
onMounted(() => {
    if (idkey) {
        getLogicdetail();
    } else {
        nextTick().then(initLogicFlow());
    }
    findAll();
    designNoPage();
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
    padding: 16px 10px;
    text-align: center;
    z-index: 1;
    border-radius: 5px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    margin: 5px;
}

.canvas {
    flex: 1;
    height: 100%;
    position: relative;
}

.demo-ruleForm {
    margin-top: 20px;
}

.lf-node text {
    white-space: nowrap;
}
</style>

<style>
.lf-control-text {
    color: black !important;
}
.el-drawer__body {
    padding: 0px;
}
.el-drawer__header {
    margin-bottom: 16px;
}
</style>
