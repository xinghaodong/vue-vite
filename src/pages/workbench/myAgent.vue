<template>
    <div class="my-agent-container">
        <!-- 接入大厂级超级表格 ProTable (支持响应式搜索、状态过滤、分页与局部静默刷新) -->
        <ProTable
            ref="proTableRef"
            title="我的待办审批"
            :columns="columns"
            :request-api="getTodoList"
            row-key="id"
            :border="true"
        >
            <!-- 任务类型标签 -->
            <template #taskType="{ row }">
                <el-tag v-if="row.status == 1 && row.formData?._isSuspended" type="warning" effect="dark">
                    ⚠️ 待特批放行
                </el-tag>
                <el-tag v-else type="primary" effect="plain">
                    常规审批
                </el-tag>
            </template>

            <!-- 操作列 -->
            <template #operation="{ row }">
                <el-button
                    :type="(row.status == 1 && row.formData?._isSuspended) ? 'warning' : 'primary'"
                    link
                    @click="govueFlow(row)"
                >
                    {{ (row.status == 1 && row.formData?._isSuspended) ? '特批放行' : '审批' }}
                </el-button>
            </template>
        </ProTable>

        <!-- 审批抽屉 (基于 ProDrawer 标准化封装) -->
        <ApprovalDrawer
            v-if="showCodeDialog"
            v-model:visible="showCodeDialog"
            :form-name="formName"
            :form-schema="formSchema"
            :ui-config="uiConfig"
            :form-data="formData"
            :row-id="rowId"
            :workflow-id="workflowId"
            :noApproval="true"
            :noreq="true"
            @close="showCodeDialog = false"
            @submit="handleSubmitApproval"
        />
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import ApprovalDrawer from './components/ApprovalDrawer.vue';
import useUserInfoStore from '@/stores/user.js';
import { getMyTodoInstances, approveWorkflow, getApprovalHistory } from '@/api/workflow';
import { getFormDesignDetail } from '@/api/formDesign';

const userInfoStore = useUserInfoStore();
const proTableRef = ref(null);

const showCodeDialog = ref(false);
const formSchema = ref({});
const uiConfig = ref({});
const formName = ref('');
const formData = ref({});
const rowId = ref(null);
const workflowId = ref('');

// 表格列定义
const columns = [
    { type: 'index', label: '#', width: 60, align: 'center' },
    {
        prop: 'title',
        label: '审批名称',
        minWidth: 180,
        search: {
            el: 'input',
            props: { placeholder: '请输入审批名称' }
        }
    },
    { prop: 'userName', label: '发起人 / 申请人', minWidth: 140, align: 'center' },
    { prop: 'taskType', label: '任务类型', width: 140, align: 'center' },
    { prop: 'created_at', label: '创建时间', width: 180, align: 'center' },
    { prop: 'updated_at', label: '更新时间', width: 180, align: 'center' },
    { prop: 'operation', label: '操作', width: 120, fixed: 'right', align: 'center' }
];

// ProTable 数据请求驱动适配
const getTodoList = async (params = {}) => {
    const { pageNum, pageSize, title } = params;
    const res = await getMyTodoInstances({
        userId: userInfoStore?.userInfo?.id,
        page: pageNum,
        pageSize,
        title
    });
    return {
        data: {
            list: res?.data?.data || [],
            total: res?.data?.total || 0
        }
    };
};

// 提交审批结果并刷新表格
const handleSubmitApproval = async (objs) => {
    try {
        const res = await approveWorkflow(objs);
        if (res.code == 200) {
            ElMessage.success('提交成功');
            showCodeDialog.value = false;
            proTableRef.value?.refresh();
        }
    } catch (error) {
        console.error('提交审批失败:', error);
    }
};

// 打开审批详情
const govueFlow = async (row) => {
    rowId.value = row.id;
    workflowId.value = row.workflowId;

    try {
        const [res, historyRes] = await Promise.all([
            getFormDesignDetail({ id: row.formId }),
            getApprovalHistory({ id: row.id }),
        ]);

        if (historyRes?.data?.formSchemaSnapshot) {
            formSchema.value = typeof historyRes.data.formSchemaSnapshot === 'string'
                ? JSON.parse(historyRes.data.formSchemaSnapshot)
                : historyRes.data.formSchemaSnapshot;
            uiConfig.value = historyRes.data.uiConfigSnapshot || {};
            formName.value = res?.data?.name || row.title || '待办审批';
        } else if (res?.data) {
            formSchema.value = res.data.schema ? JSON.parse(res.data.schema) : {};
            uiConfig.value = res.data.ui_config || {};
            formName.value = res.data.name || row.title || '待办审批';
        }

        formData.value = historyRes?.data?.formData || {};
        showCodeDialog.value = true;
    } catch (err) {
        console.error('获取待办详情失败:', err);
        ElMessage.error('加载待办详情失败');
    }
};
</script>

<style scoped>
.my-agent-container {
    width: 100%;
    height: 100%;
}
</style>
