<template>
    <div>
        <div class="mb-4">
            <el-button plain type="primary" @click="govueFlow()">新增</el-button>
        </div>
        <el-table :data="tableData" border style="width: 100%">
            <el-table-column prop="name" label="表单名称"> </el-table-column>
            <!-- 状态 -->
            <el-table-column prop="status" label="状态">
                <template #default="scope">
                    <span v-if="scope.row.status == 1">启用</span>
                    <span v-if="scope.row.status == 2">禁用</span>
                </template>
            </el-table-column>
            <!-- <el-table-column prop="code" label="code"> </el-table-column> -->
            <el-table-column prop="created_at" label="创建时间" width="180"> </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="180"> </el-table-column>
            <!-- 操作 -->
            <el-table-column label="操作" width="260" fixed="right">
                <template #default="scope">
                    <el-button type="primary" link @click="startOrStop(scope.row)">{{ scope.row.status == 2 ? '启用' : '禁用' }}</el-button>
                    <el-button type="primary" link @click="handlePreview(scope.row)">预览</el-button>
                    <el-button v-if="scope.row.status == 1" type="primary" link @click="handlePreview(scope.row, 1)">发起</el-button>
                    <el-button type="primary" link @click="govueFlow(scope.row)">编辑</el-button>
                    <el-button type="primary" link @click="handleDelete(scope.row)">删除</el-button>
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
        <el-dialog v-model="showCodeDialog" :title="isInitiate ? '发起审批' : '表单预览'" width="70%" top="5vh" custom-class="code-dialog">
            <div style="height: 70vh; overflow: auto; padding: 10px; border-radius: 4px">
                <h3>{{ formName }}</h3>
                <DynamicForm :schema="formSchema" :ui-config="uiConfig" v-model="formData" />
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="showCodeDialog = false">关闭</el-button>
                    <el-button type="primary" @click="handleInitiate" v-if="isInitiate">发起</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance } from 'vue';
import DynamicForm from './components/DynamicForm.vue';
import useUserInfoStore from '@/stortes/user'; //引入仓库
const userInfoStore = useUserInfoStore();
const { proxy } = getCurrentInstance();
const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const showCodeDialog = ref(false);
const formSchema = ref([]); // 从接口获取的 schema
const uiConfig = ref({}); // 从接口获取的 ui_config
const formData = ref({}); // 表单数据
const formName = ref('');
const formId = ref('');

const isInitiate = ref(false); // 是否是发起流程

const handlePreview = (row, val) => {
    formId.value = row.id;
    isInitiate.value = val ? true : false;
    showCodeDialog.value = true;
    formSchema.value = JSON.parse(row.schema);
    uiConfig.value = row.ui_config;
    formName.value = row.name;
};

// 发起流程审批
const handleInitiate = async () => {
    try {
        formData.value.formId = formId.value;
        // 从 store 获取申请人
        formData.value.userId = userInfoStore?.userInfo?.id;
        console.log('data', formData.value);
        let obj = {
            formId: formId.value,
            formData: formData.value,
            userId: userInfoStore?.userInfo?.id,
        };
        const data = await proxy.$api.startWorkflow(obj);
        if (data.code == 200) {
            proxy.$message.success(data.message);
            showCodeDialog.value = false;
        }
    } catch (error) {
        console.log(error);
    }
};
const govueFlow = row => {
    // 路由跳转
    proxy.$router.push({
        path: '/home/formDesign',
        query: { idkey: row ? row.id : '' },
    });
};
const getList = async () => {
    const data = await proxy.$api.designQuery({ page: currentPage.value, pageSize: pageSize.value });
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

const startOrStop = async row => {
    const data = await proxy.$api.designStatus({ id: row.id, status: row.status == '2' ? '1' : '2' });
    if (data.code == 200) {
        proxy.$message.success(data.message);
        getList();
    }
};
const handleDelete = async row => {
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            type: '提示',
        })
        .then(async () => {
            console.log(row);
            const data = await proxy.$api.designDelete({ id: row.id });
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
