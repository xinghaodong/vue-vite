<template>
    <div class="role-management-container">
        <!-- 接入大厂级超级表格 ProTable -->
        <ProTable
            ref="proTableRef"
            title="角色权限管理"
            :columns="columns"
            :request-api="proxy.$api.getRolsList"
            row-key="id"
            :pagination="false"
            :is-show-search="false"
            :border="true"
        >
            <!-- 头部操作按钮区域 -->
            <template #tableHeader>
                <el-button type="primary" :icon="Plus" @click="add">新增角色</el-button>
            </template>

            <!-- 状态列插槽 -->
            <template #states="{ row }">
                <el-tag :type="row.states == 1 ? 'success' : 'danger'" disable-transitions>
                    {{ row.states == 1 ? '正常启用' : '已禁用' }}
                </el-tag>
            </template>

            <!-- 操作列插槽 -->
            <template #operation="{ row }">
                <el-button type="primary" link @click="editItem(row.id)">编辑</el-button>
                <el-button type="primary" link @click="selectResource(row.id)">分配资源</el-button>
            </template>
        </ProTable>

        <!-- 1. 新增 / 修改角色弹窗 -->
        <ProDialog
            v-model="dialogVisible"
            :title="title"
            width="600px"
            :on-confirm="() => submitForm(ruleFormRef)"
        >
            <el-form :model="ruleForm" :rules="rules" label-width="90px" ref="ruleFormRef">
                <el-row :gutter="16">
                    <el-col :span="24">
                        <el-form-item label="角色名称" prop="name">
                            <el-input v-model="ruleForm.name" placeholder="请输入角色名称" maxlength="20" clearable />
                        </el-form-item>
                    </el-col>
                    <el-col :span="24" v-if="ruleForm.states !== 2">
                        <el-form-item label="角色状态" prop="states">
                            <el-radio-group v-model="ruleForm.states">
                                <el-radio :value="1">正常启用</el-radio>
                                <el-radio :value="0">禁用停用</el-radio>
                            </el-radio-group>
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
        </ProDialog>

        <!-- 2. 分配资源权限弹窗 -->
        <ProDialog
            v-model="dialogVisibleResource"
            title="分配菜单与操作资源"
            sub-title="勾选角色所属的菜单展示与操作权限"
            width="620px"
            :on-confirm="submitResource"
        >
            <div class="resource-dialog-box">
                <el-form v-if="dialogVisibleResource" :model="ruleData" label-width="100px" class="mb-3">
                    <el-form-item label="级联关联模式">
                        <el-checkbox v-model="ruleData.menucheckstrictly" :true-value="1" :false-label="0">
                            启用父子联动 (选中父级自动全选子级)
                        </el-checkbox>
                    </el-form-item>
                </el-form>

                <div class="resource-tree-wrap">
                    <el-tree
                        ref="tree"
                        :data="resourceList"
                        show-checkbox
                        node-key="id"
                        :props="{
                            children: 'children',
                            label: 'name',
                        }"
                        :check-strictly="!ruleData.menucheckstrictly"
                    />
                </div>
            </div>
        </ProDialog>
    </div>
</template>

<script setup>
defineOptions({
    name: 'roleManagement',
});
import { ref, reactive, onMounted, getCurrentInstance, nextTick } from 'vue';
import { Plus } from '@element-plus/icons-vue';

const { proxy } = getCurrentInstance();

const proTableRef = ref(null);
const title = ref('');
const dialogVisible = ref(false);
const formTemplate = { name: '', states: 1 };
let ruleForm = reactive({ ...formTemplate });

const columns = [
    { prop: 'name', label: '角色名称', minWidth: 160 },
    { prop: 'states', label: '角色状态', width: 140, align: 'center' },
    { prop: 'operation', label: '操作', width: 180, fixed: 'right', align: 'center' },
];

const dialogVisibleResource = ref(false);
const resourceList = ref([]);
const ruleData = reactive({ menucheckstrictly: 0 });
const ruleFormRef = ref();
const rules = {
    name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
};
const tree = ref(null);

const add = () => {
    title.value = '新增角色';
    Object.assign(ruleForm, formTemplate);
    delete ruleForm.id;
    dialogVisible.value = true;
};

const selectResource = async id => {
    ruleForm.id = id;
    const res = await proxy.$api.getRoleMenus({ id });
    dialogVisibleResource.value = true;
    nextTick(() => {
        if (tree.value) {
            tree.value.setCheckedKeys(res.data || []);
        }
    });
};

const submitResource = async () => {
    if (!tree.value) return;
    let treeArray = tree.value.getCheckedKeys();
    let treeArray1 = tree.value.getHalfCheckedKeys();
    treeArray = treeArray.concat(treeArray1);
    
    const res = await proxy.$api.assignMenusToRole({ id: ruleForm.id, menuIds: treeArray || [] });
    proxy.$message.success(res?.message || '资源分配成功');
    dialogVisibleResource.value = false;
};

const submitForm = async formEl => {
    if (!formEl) return false;
    const valid = await formEl.validate();
    if (!valid) return false;

    if (title.value === '修改角色') {
        await proxy.$api.updateRoles(ruleForm);
    } else {
        await proxy.$api.addRoles(ruleForm);
    }
    proxy.$message.success(`${title.value}成功`);
    dialogVisible.value = false;
    proTableRef.value?.refresh();
};

const editItem = async id => {
    title.value = '修改角色';
    const data = await proxy.$api.detailRoles({ id });
    Object.assign(ruleForm, data.data);
    dialogVisible.value = true;
};

onMounted(() => {
    proxy.$api.menus().then(res => {
        resourceList.value = res.data;
    });
});
</script>

<style scoped>
.role-management-container {
    height: 100%;
    width: 100%;
}

.resource-tree-wrap {
    max-height: 380px;
    overflow-y: auto;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 10px;
    background: var(--el-fill-color-blank);
}
</style>
