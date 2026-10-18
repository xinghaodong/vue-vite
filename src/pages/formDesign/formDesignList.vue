<template>
    <div class="form-design-list-container">
        <!-- 接入大厂级超级表格 ProTable -->
        <ProTable
            ref="proTableRef"
            title="表单模型管理"
            :columns="columns"
            :request-api="getFormDesignList"
            row-key="id"
            :border="true"
        >
            <!-- 头部操作按钮区域 -->
            <template #tableHeader>
                <el-button type="primary" :icon="Plus" @click="govueFlow()">新增表单</el-button>
            </template>

            <!-- 状态插槽 -->
            <template #status="{ row }">
                <el-tag :type="row.status == 1 ? 'success' : 'info'">
                    {{ row.status == 1 ? '启用' : '禁用' }}
                </el-tag>
            </template>

            <!-- 操作列 -->
            <template #operation="{ row }">
                <el-button type="primary" link @click="startOrStop(row)">
                    {{ row.status == 2 ? '启用' : '禁用' }}
                </el-button>
                <el-button type="primary" link @click="handlePreview(row)">预览</el-button>
                <el-button v-if="row.status == 1" type="success" link @click="handlePreview(row, 1)">发起</el-button>
                <el-button type="primary" link @click="govueFlow(row)">编辑</el-button>
                <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
        </ProTable>

        <!-- 表单预览 / 发起审批 ProDialog -->
        <ProDialog
            v-model="showCodeDialog"
            :title="isInitiate ? '发起审批流程' : '表单结构预览'"
            :sub-title="isInitiate ? '根据配置填报业务数据并提交进入工作流引擎' : '预览表单渲染排版效果与交互组件'"
            width="750px"
            :show-confirm="isInitiate"
            confirm-text="确认发起"
            cancel-text="关闭"
            :on-confirm="handleInitiate"
        >
            <div class="preview-scroll-box">
                <h3 class="form-preview-title">{{ formName }}</h3>
                <DynamicForm
                    v-if="showCodeDialog"
                    ref="dynamicFormRef"
                    :noApproval="noApproval"
                    :schema="formSchema"
                    :ui-config="uiConfig"
                    v-model="formData"
                />
            </div>

            <!-- 发起流程时的左下角流程选择下拉 -->
            <template #footer-left v-if="isInitiate && workflowList.length > 1">
                <el-select
                    v-model="selectedWorkflowId"
                    placeholder="请选择审批流程"
                    style="width: 240px"
                >
                    <el-option v-for="w in workflowList" :key="w.id" :label="w.name" :value="w.id" />
                </el-select>
            </template>
        </ProDialog>
    </div>
</template>

<script setup>
import { ref, getCurrentInstance } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import DynamicForm from './components/DynamicForm.vue';
import useUserInfoStore from '@/stores/user.js';

const userInfoStore = useUserInfoStore();
const { proxy } = getCurrentInstance();
const proTableRef = ref(null);

const showCodeDialog = ref(false);
const formSchema = ref([]);
const uiConfig = ref({});
const formData = ref({});
const formName = ref('');
const formId = ref('');

const isInitiate = ref(false);
const noApproval = ref(false);
const dynamicFormRef = ref(null);
const workflowList = ref([]);
const selectedWorkflowId = ref(null);

const columns = [
    { type: 'index', label: '#', width: 60, align: 'center' },
    {
        prop: 'name',
        label: '表单名称',
        minWidth: 180,
        search: {
            el: 'input',
            props: { placeholder: '请输入表单名称' }
        }
    },
    { prop: 'status', label: '状态', width: 120, align: 'center' },
    { prop: 'created_at', label: '创建时间', width: 180, align: 'center' },
    { prop: 'updated_at', label: '更新时间', width: 180, align: 'center' },
    { prop: 'operation', label: '操作', width: 260, fixed: 'right', align: 'left' }
];

// ProTable 数据请求驱动适配
const getFormDesignList = async (params = {}) => {
    const { pageNum, pageSize, name } = params;
    const res = await proxy.$api.designQuery({
        page: pageNum,
        pageSize,
        name
    });
    return {
        data: {
            list: res?.data?.data || [],
            total: res?.data?.total || 0
        }
    };
};

const handlePreview = async (row, val) => {
    formId.value = row.id;
    isInitiate.value = Boolean(val);
    noApproval.value = !val;
    showCodeDialog.value = true;
    formSchema.value = JSON.parse(row.schema || '[]');
    uiConfig.value = row.ui_config || {};
    formName.value = row.name;
    formData.value = {};
    selectedWorkflowId.value = null;
    workflowList.value = [];

    if (val) {
        const data = await proxy.$api.logicFindByFormId({ formId: row.id });
        if (data.code == 200) {
            workflowList.value = data.data || [];
            if (workflowList.value.length === 1) {
                selectedWorkflowId.value = workflowList.value[0].id;
            } else if (workflowList.value.length === 0) {
                proxy.$message.warning('该表单尚未绑定审批流程，请先在流程设计器中绑定');
            }
        }
    }
};

// 发起流程审批
const handleInitiate = async () => {
    try {
        await dynamicFormRef.value.validate();
        if (workflowList.value.length > 1 && !selectedWorkflowId.value) {
            proxy.$message.warning('请先选择审批流程');
            return false;
        }

        formData.value.formId = formId.value;
        formData.value.userId = userInfoStore?.userInfo?.id;
        formData.value.applicantName = userInfoStore?.userInfo?.name;

        const obj = {
            formId: formId.value,
            formData: formData.value,
            userId: userInfoStore?.userInfo?.id,
        };
        if (selectedWorkflowId.value) obj.workflowId = selectedWorkflowId.value;

        const data = await proxy.$api.startWorkflow(obj);
        if (data.code == 200) {
            proxy.$message.success(data.message);
            showCodeDialog.value = false;
        }
    } catch (error) {
        proxy.$message.error(error.message || '请填写必填项');
        return false;
    }
};

const govueFlow = row => {
    proxy.$router.push({
        path: '/home/formDesign',
        query: { idkey: row ? row.id : '' },
    });
};

const startOrStop = async row => {
    const data = await proxy.$api.designStatus({
        id: row.id,
        status: row.status == '2' ? '1' : '2'
    });
    if (data.code == 200) {
        proxy.$message.success(data.message);
        proTableRef.value?.refresh();
    }
};

const handleDelete = async row => {
    proxy.$messageBox
        .confirm('确定要删除该表单吗?', '提示', {
            type: 'warning',
        })
        .then(async () => {
            const data = await proxy.$api.designDelete({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                proTableRef.value?.refresh();
            }
        });
};
</script>

<style scoped>
.form-design-list-container {
    width: 100%;
    height: 100%;
}
.preview-scroll-box {
    max-height: 65vh;
    overflow-y: auto;
    padding: 10px;
    border-radius: 4px;
}
.form-preview-title {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
}
</style>
