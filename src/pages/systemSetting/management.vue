<template>
    <div>
        <!--首页 -->
        <div class="mb-4">
            <el-button
                type="primary"
                @click="
                    dialogVisible = true;
                    resetForm(ruleFormRef);
                "
                >新增组织</el-button
            >
        </div>
        <!-- 生成一个菜单树表格 -->
        <el-table :data="treeData" style="width: 100%; margin-bottom: 20px" row-key="organid" border default-expand-all>
            <el-table-column prop="organame" label="组织名" />
            <el-table-column prop="orgcode" label="组织编码" />
            <el-table-column label="操作" width="140" align="left">
                <template #default="scope">
                    <el-button v-if="scope.row.organid" type="primary" link @click="handleEdit(scope.row.organid)">编辑</el-button>
                    <el-button v-if="scope.row.organid" type="primary" link @click="handleDelete(scope.row.organid)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-dialog v-model="dialogVisible" :title="form.organid ? '修改组织' : '新增组织'" width="650" :before-close="handleClose">
            <el-form :model="form" :label-width="formLabelWidth" :rules="rules" ref="ruleFormRef">
                <el-row>
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item label="组织名称" prop="organame">
                            <el-input v-model="form.organame" autocomplete="off" />
                        </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item label="上级组织" prop="parentId">
                            <el-tree-select
                                @change="val => handleUnitChange(val)"
                                v-model="form.parentId"
                                node-key="organid"
                                :data="treeDatas"
                                :props="defaultProps"
                                :default-expanded-keys="[treeDatas[0].organid]"
                                check-strictly
                                :render-after-expand="true"
                                placeholder="请选择上级组织"
                            />
                        </el-form-item>
                    </el-col>

                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item prop="orgcode">
                            <template #label>
                                <el-tooltip content="组织的唯一编码" placement="top">
                                    <el-icon class="iconsStyle"><InfoFilled /></el-icon>
                                </el-tooltip>
                                组织编码
                            </template>
                            <el-input v-model="form.orgcode" placeholder="请输入" clearable />
                        </el-form-item>
                    </el-col>
                    <!-- 当前成员 -->
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24" v-if="form.organid">
                        <el-form-item prop="members" label="当前成员">
                            <el-table :data="form.employees" style="width: 100%; margin-bottom: 20px" border>
                                <el-table-column prop="username" label="账号" />
                                <el-table-column prop="name" label="姓名" />
                                <el-table-column prop="email" label="邮箱" />
                            </el-table>
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="dialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="onSubmit(ruleFormRef)"> 确定 </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, getCurrentInstance } from 'vue';
import useUserInfoStore from '@/stortes/user'; //引入仓库
import { storeToRefs } from 'pinia'; //引入pinia转换
const { proxy } = getCurrentInstance();
const dialogVisible = ref(false);
const userInfoStore = useUserInfoStore();

const { userInfo } = storeToRefs(userInfoStore); // 响应式
const formLabelWidth = '100px';
const ruleFormRef = ref();
const rules = {
    organame: [{ required: true, message: '请输入组织名', trigger: 'blur' }],
    parentId: [{ required: false, message: '请选择上级菜单', trigger: 'change' }],
    orgcode: [{ required: true, message: '请输入编码', trigger: 'blur' }],
};
const visible = ref(false);
const form = reactive({
    organame: '',
    parentId: 0,
    orgcode: '',
});
const treeData = ref(null);
const treeDatas = ref([]);
const defaultProps = { children: 'children', label: 'organame', value: 'organid' };
const handleClose = done => {
    done();
};
const handleUnitChange = val => {};
// 重置表单
const resetForm = () => {
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
};

const onSubmit = formEl => {
    formEl.validate(async valid => {
        if (!valid) {
            return false;
        }
        if (form.organid) {
            // 更新菜单
            proxy.$api.updateOrganization(form).then(res => {
                if (res.code == 200) {
                    proxy.$message.success(res.message);
                    dialogVisible.value = false;
                    getOrganizationList();
                }
            });
        } else {
            // 新增菜单
            if (form.parentId == 0) {
                form.parentId = '';
            }
            console.log(form);
            const data = await proxy.$api.addOrganization(form);
            if (data.code == 200) {
                dialogVisible.value = false;
                proxy.$message.success(data.message);
                getOrganizationList();
            }
        }
    });
};
// 删除
const handleDelete = async row => {
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            type: '提示',
        })
        .then(async () => {
            const data = await proxy.$api.deleteOrganization({ id: row });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                getOrganizationList();
            }
        });
};
// 修改
const handleEdit = async row => {
    dialogVisible.value = true;
    // 调用详情接口
    const data = await proxy.$api.detailOrganization({ id: row });
    Object.assign(form, data.data);
    if (!data.data.parentId) {
        form.parentId = 0;
    }
};

// 获取
const getOrganizationList = async () => {
    const res = await proxy.$api.getOrganizationList();
    console.log(res.data, '66');
    const treedata = getParentMenuTree(res.data);
    treeDatas.value = treedata;
    treeData.value = res.data;

    console.log(treeDatas.value, '6699', treeData.value);
};

const getParentMenuTree = tableTreeDdata => {
    let parent = {
        parentId: '',
        organame: '顶级组织',
        organid: 0,
        children: tableTreeDdata,
    };
    return [parent];
};

onMounted(async () => {
    try {
        await getOrganizationList();
    } catch (error) {
        console.error('失败信息:', error);
    }
});
</script>
<style>
.iconsStyle {
    top: 9px;
    right: 3px;
    cursor: pointer;
}

.mod-menu__icon-list {
    overflow: auto;
    height: 100%;
}

.mod-menu__icon-popover {
    width: 510px;
    height: 350px !important;
    overflow: hidden !important;
}
.buttonP {
    margin-left: 10px !important;
    margin-bottom: 10px !important;
}

.el-button--medium {
    padding: 10px 20px;
    font-size: 13px;
    border-radius: 4px;
}
.popover-title {
    margin-bottom: 12px;
    font-size: 14px;
    padding-left: 9px;
    color: #303133;
}
</style>
