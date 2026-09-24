<template>
    <!-- 我发起的 -->
    <div>
        <!-- <div class="mb-4">
            <el-button plain type="primary" @click="govueFlow()">新增</el-button>
        </div> -->
        <el-table :data="tableData" border style="width: 100%">
            <el-table-column prop="title" label="流程名称"> </el-table-column>
            <!-- <el-table-column prop="code" label="code"> </el-table-column> -->
            <!-- 状态 -->
            <el-table-column label="状态" width="120">
                <template #default="scope">
                    <el-tag v-if="scope.row.status == 0" type="primary" effect="light">
                        <el-icon class="is-loading" style="vertical-align: -1px; margin-right: 2px;"><Loading /></el-icon>AI审核中
                    </el-tag>
                    <el-tag v-else-if="scope.row.status == 1 && scope.row.formData?._isSuspended" type="warning" effect="dark">
                        待特批放行
                    </el-tag>
                    <el-tag v-else-if="scope.row.status == 1" type="warning">待审批</el-tag>
                    <el-tag v-else-if="scope.row.status == 2" type="success">通过</el-tag>
                    <el-tag v-else-if="scope.row.status == 3" type="danger">驳回</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="180"> </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="180"> </el-table-column>
            <!-- 操作 -->
            <el-table-column label="操作" width="130" fixed="right">
                <template #default="scope">
                    <el-button type="primary" link @click="govueFlow(scope.row)">查看流程</el-button>
                    <!-- <el-button type="primary" link @click="handleDelete(scope.row)">删除</el-button> -->
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
            style="padding: 16px"
            background
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            :current-page="currentPage"
            :page-sizes="[10, 20, 50, 100]"
            :page-size="pageSize"
            layout="total, sizes,->, prev, pager, next, jumper"
            :total="total"
        ></el-pagination>
        <!-- 审批相关内容 -->
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
import { ref, onMounted, getCurrentInstance, reactive, toRefs, watch } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import useUserInfoStore from '@/stortes/user'; //引入仓库
import ApprovalDrawer from './components/ApprovalDrawer.vue';
const userInfoStore = useUserInfoStore();
const { proxy } = getCurrentInstance();
const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const showCodeDialog = ref(false);
const formSchema = ref({});
const uiConfig = ref({});
const formName = ref('');
const formData = ref({});

const rowId = ref({});
const instance = ref([]);
const steps = ref([]);
const workflowId = ref('');

const govueFlow = async row => {
    rowId.value = row.id;
    workflowId.value = row.workflowId;

    try {
        // 1. 列表不再冗余返回 formData/form，分别从 form-design/detail 和 /logic-flow/getApprovalHistory 获取
        const [res, historyRes] = await Promise.all([
            proxy.$api.designDetail({ id: row.formId }),
            proxy.$api.getApprovalHistory({ id: row.id }),
        ]);

        if (res?.data) {
            formSchema.value = res.data.schema ? JSON.parse(res.data.schema) : {};
            uiConfig.value = res.data.ui_config || {};
            formName.value = res.data.name || row.title || '审批详情';
        }

        formData.value = historyRes?.data?.formData || {};
        showCodeDialog.value = true;
    } catch (err) {
        console.error('获取流程详情失败:', err);
        proxy.$message.error('加载流程详情失败');
    }
};

// const getApprovalHistory = async () => {
//     try {
//         const data = await proxy.$api.getApprovalHistory({ id: rowId.value });
//         // approvalHistory.value = data.data;
//         instance.value = data.data;
//         steps.value = data.data.steps;
//     } catch (error) {
//         console.log(error);
//     }
// };

// watch(
//     () => activeTab.value,
//     val => {
//         console.log(val, '...');
//         if (val == 'workflow') {
//             // 查看审批记录
//             // getList();
//             getApprovalHistory();
//         }
//     },
// );

const getList = async () => {
    const data = await proxy.$api.getMyInstances({ userId: userInfoStore?.userInfo?.id, page: currentPage.value, pageSize: pageSize.value });
    if (data.code == 200) {
        tableData.value = data.data.data;
        total.value = data.data.total;
    }
};
const handleSizeChange = val => {
    pageSize.value = val;
    getList();
};

const handleCurrentChange = val => {
    currentPage.value = val;
    getList();
};
const handleDelete = async row => {
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            type: '提示',
        })
        .then(async () => {
            console.log(row);
            const data = await proxy.$api.logicdelete({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                getList();
            }
        });
};
// onMounted
onMounted(() => {
    getList();
});
</script>
