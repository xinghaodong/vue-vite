<template>
    <div class="initiated-by-me-container">
        <!-- 接入大厂级超级表格 ProTable (支持响应式搜索、状态过滤、分页与局部刷新) -->
        <ProTable
            ref="proTableRef"
            title="我发起的流程"
            :columns="columns"
            :request-api="getInitiatedList"
            row-key="id"
            :border="true"
        >
            <!-- 状态标签插槽 -->
            <template #status="{ row }">
                <el-tag v-if="row.status == 0" type="primary" effect="light">
                    <el-icon class="is-loading" style="vertical-align: -1px; margin-right: 2px;"><Loading /></el-icon>AI审核中
                </el-tag>
                <el-tag v-else-if="row.status == 1 && row.formData?._isSuspended" type="warning" effect="dark">
                    待特批放行
                </el-tag>
                <el-tag v-else-if="row.status == 1" type="warning">待审批</el-tag>
                <el-tag v-else-if="row.status == 2" type="success">通过</el-tag>
                <el-tag v-else-if="row.status == 3" type="danger">驳回</el-tag>
            </template>

            <!-- 操作列 -->
            <template #operation="{ row }">
                <el-button type="primary" link @click="govueFlow(row)">查看流程</el-button>
            </template>
        </ProTable>

        <!-- 流程审批/进度详情抽屉 (基于 ProDrawer 封装) -->
        <ApprovalDrawer
            v-if="showCodeDialog"
            v-model:visible="showCodeDialog"
            :form-name="formName"
            :form-schema="formSchema"
            :ui-config="uiConfig"
            :form-data="formData"
            :row-id="rowId"
            :workflow-id="workflowId"
            :noApproval="false"
            :noreq="true"
            @close="showCodeDialog = false"
        />
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';
import useUserInfoStore from '@/stores/user.js';
import ApprovalDrawer from './components/ApprovalDrawer.vue';
import { getMyInstances, getApprovalHistory } from '@/api/workflow';
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

const columns = [
    { type: 'index', label: '#', width: 60, align: 'center' },
    {
        prop: 'title',
        label: '流程名称',
        minWidth: 180,
        search: {
            el: 'input',
            props: { placeholder: '请输入流程名称' }
        }
    },
    { prop: 'status', label: '状态', width: 140, align: 'center' },
    { prop: 'created_at', label: '创建时间', width: 180, align: 'center' },
    { prop: 'updated_at', label: '更新时间', width: 180, align: 'center' },
    { prop: 'operation', label: '操作', width: 120, fixed: 'right', align: 'center' }
];

// ProTable 数据请求驱动适配
const getInitiatedList = async (params = {}) => {
    const { pageNum, pageSize, title } = params;
    const res = await getMyInstances({
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
            formName.value = res?.data?.name || row.title || '审批详情';
        } else if (res?.data) {
            formSchema.value = res.data.schema ? JSON.parse(res.data.schema) : {};
            uiConfig.value = res.data.ui_config || {};
            formName.value = res.data.name || row.title || '审批详情';
        }

        formData.value = historyRes?.data?.formData || {};
        showCodeDialog.value = true;
    } catch (err) {
        console.error('获取流程详情失败:', err);
        ElMessage.error('加载流程详情失败');
    }
};
</script>

<style scoped>
.initiated-by-me-container {
    width: 100%;
    height: 100%;
}
</style>
