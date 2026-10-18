<template>
    <div class="active-container">
        <!-- 接入大厂级超级表格 ProTable -->
        <ProTable
            ref="proTableRef"
            title="运营活动管理"
            :columns="columns"
            :request-api="getActivityList"
            row-key="id"
            :border="true"
        >
            <template #tableHeader>
                <el-button type="primary" :icon="Plus" @click="handleAdd">新增活动</el-button>
            </template>

            <!-- 状态插槽 -->
            <template #state="{ row }">
                <el-tag :type="row.state == 2 ? 'success' : 'warning'">
                    {{ row.statename || (row.state == 2 ? '发布' : '草稿') }}
                </el-tag>
            </template>

            <!-- 操作列 -->
            <template #operation="{ row }">
                <el-button v-if="row.state == 1" link type="primary" @click="handleEdit(row)">编辑</el-button>
                <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
        </ProTable>

        <ProDialog
            v-model="dialogVisible"
            :title="ruleForm.id ? '编辑活动信息' : '创建新运营活动'"
            sub-title="维护活动主题与发布状态"
            width="600px"
            :on-confirm="() => onSubmit(ruleFormRef)"
        >
            <el-form ref="ruleFormRef" :rules="rules" :model="ruleForm" label-width="100px">
                <el-form-item label="活动主题" prop="title">
                    <el-input v-model="ruleForm.title" placeholder="请输入活动主题"></el-input>
                </el-form-item>
                <el-form-item label="发布状态" prop="state">
                    <el-radio-group v-model="ruleForm.state">
                        <el-radio label="1">草稿</el-radio>
                        <el-radio label="2">发布上线</el-radio>
                    </el-radio-group>
                </el-form-item>
            </el-form>
        </ProDialog>
    </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance } from 'vue';
import { Plus } from '@element-plus/icons-vue';

const { proxy } = getCurrentInstance();
const proTableRef = ref(null);
const ruleFormRef = ref(null);
const dialogVisible = ref(false);

const formTemplate = {
    title: '',
    state: '1',
};
let ruleForm = reactive({ ...formTemplate });

const rules = {
    title: [{ required: true, message: '请输入活动主题', trigger: 'blur' }],
    state: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

const columns = [
    { type: 'index', label: '#', width: 60, align: 'center' },
    {
        prop: 'title',
        label: '活动主题',
        minWidth: 180,
        search: {
            el: 'input',
            props: { placeholder: '请输入活动主题' }
        }
    },
    { prop: 'state', label: '状态', width: 140, align: 'center' },
    { prop: 'created_at', label: '创建时间', width: 180, align: 'center' },
    { prop: 'updated_at', label: '更新时间', width: 180, align: 'center' },
    { prop: 'operation', label: '操作', width: 160, fixed: 'right', align: 'left' }
];

// ProTable 数据请求驱动适配
const getActivityList = async () => {
    const res = await proxy.$api.getActivityList();
    return {
        data: {
            list: res?.data || [],
            total: res?.data?.length || 0
        }
    };
};

const handleAdd = () => {
    resetForm();
    dialogVisible.value = true;
};

const resetForm = () => {
    Object.assign(ruleForm, JSON.parse(JSON.stringify(formTemplate)));
    delete ruleForm.id;
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
};

const onSubmit = formEl => {
    if (!formEl) return false;
    return new Promise(resolve => {
        formEl.validate(async valid => {
            if (valid) {
                const data = await proxy.$api.addActivity(ruleForm);
                if (data.code == 200) {
                    dialogVisible.value = false;
                    proxy.$message.success(data.message);
                    proTableRef.value?.refresh();
                    resolve(true);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

const handleEdit = async row => {
    resetForm();
    dialogVisible.value = true;
    const data = await proxy.$api.getActivityDetail({ id: row.id });
    Object.assign(ruleForm, data.data);
};

const handleDelete = row => {
    proxy.$messageBox
        .confirm('确定要删除该活动吗?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        })
        .then(async () => {
            const data = await proxy.$api.deleteActivity({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                proTableRef.value?.refresh();
            }
        });
};
</script>

<style scoped>
.active-container {
    width: 100%;
    height: 100%;
}
</style>
