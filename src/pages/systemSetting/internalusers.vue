<template>
    <div>
        <!--用户管理 -->
        <div class="mb-4">
            <el-button
                v-has-permi="['add:user']"
                type="primary"
                plain
                @click="
                    dialogVisible = true;
                    resetForm(ruleFormRef);
                "
                >新增</el-button
            >
        </div>
        <el-table :data="tableData" border style="width: 100%">
            <el-table-column prop="username" label="账号" width="180"> </el-table-column>
            <el-table-column prop="name" label="姓名" width="180"> </el-table-column>
            <el-table-column prop="email" label="邮箱" width="180"> </el-table-column>
            <el-table-column prop="role" label="权限"> </el-table-column>
            <el-table-column prop="is_active" label="状态">
                <template #default="scope">
                    <span v-if="scope.row.is_active == 1">可用</span>
                    <span v-if="scope.row.is_active == 0">禁用</span>
                </template>
            </el-table-column>
            <!-- 头像 -->
            <!-- el-table-column  居中 -->
            <el-table-column prop="avatar" label="头像" center>
                <template #default="scope">
                    <!-- <div class="demo-image__preview"> -->
                    <el-image
                        style="width: 30px; height: 30px"
                        :src="`${proxy.$api.img_url}${scope.row?.avatar?.filePath}`"
                        :zoom-rate="1.2"
                        :max-scale="7"
                        :min-scale="0.2"
                        :initial-index="0"
                        :z-index="999"
                        fit="cover"
                        :preview-src-list="[`${proxy.$api.img_url}${scope.row?.avatar?.filePath}`]"
                    />
                    <!-- </div> -->
                    <!-- <img :src="`${proxy.$api.img_url}${scope.row.avatar_url}`" alt="" style="width: 50px; height: 50px" /> -->
                </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="180"> </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="180"> </el-table-column>
            <!-- 操作 -->
            <el-table-column label="操作" width="130" fixed="right">
                <template #default="scope">
                    <el-button v-has-permi="['add:user']" link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button v-has-permi="['add:user']" link type="primary" @click="handleDelete(scope.row)">删除</el-button>
                    <!-- <el-button link type="primary" @click="handleRelieve(scope.row)" v-text="scope.row.is_active == 0 ? '解除' : '禁用'"></el-button> -->
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
        <el-dialog :title="ruleForm.id ? '编辑' : '新增'" v-model="dialogVisible" width="50%">
            <el-form ref="ruleFormRef" :rules="rules" :model="ruleForm" label-width="100px">
                <el-form-item label="账号" prop="username">
                    <el-input v-model="ruleForm.username"></el-input>
                </el-form-item>
                <el-form-item label="姓名" prop="name">
                    <el-input v-model="ruleForm.name"></el-input>
                </el-form-item>
                <el-form-item label="邮箱" prop="email">
                    <el-input v-model="ruleForm.email"></el-input>
                </el-form-item>
                <!-- 头像上传 -->
                <el-form-item label="头像">
                    <el-upload
                        :action="uploadUrl"
                        class="avatar-uploader"
                        :show-file-list="false"
                        :on-success="handleAvatarSuccess"
                        :before-upload="beforeAvatarUpload"
                        name="avatar"
                        :data="{ userId: ruleForm.id || '' }"
                    >
                        <img v-if="ruleForm.avatar?.filePath" :src="proxy.$api.img_url + ruleForm.avatar?.filePath" class="avatar" />
                        <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
                    </el-upload>
                </el-form-item>
                <!-- 所属角色 -->
                <el-form-item label="所属角色" prop="roleIds">
                    <el-select v-model="ruleForm.roleIds" multiple placeholder="请选择角色">
                        <el-option v-for="item in roleList" :key="item.id" :label="item.name" :value="item.id"></el-option>
                    </el-select>
                </el-form-item>
                <!-- 所属组织 -->
                <el-form-item label="所属组织" prop="organid">
                    <el-tree-select
                        @change="val => handleUnitChange(val)"
                        v-model="ruleForm.organid"
                        node-key="organid"
                        :data="zztree"
                        :props="defaultProps"
                        :default-expanded-keys="[zztree[0].organid]"
                        check-strictly
                        :render-after-expand="true"
                        placeholder="请选择组织"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="dialogVisible = false">取 消</el-button>
                    <el-button type="primary" @click="onSubmit(ruleFormRef)">确 定</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue';
const { proxy } = getCurrentInstance();
const tableData = ref([]);
const ruleFormRef = ref(null);
const uploadUrl = `${proxy.$api.baseUrl}/upload/uploadFile`;
const headers = { Authorization: sessionStorage.getItem('token') };
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const roleList = ref([]);
// 初始模板对象
const formTemplate = {
    username: '',
    name: '',
    email: '',
    role: '',
    is_active: '',
    avatar: { filePath: '' },
};
let ruleForm = reactive({ ...formTemplate });
const zztree = ref(null);
const defaultProps = { children: 'children', label: 'organame', value: 'organid' };
// 重置ruleForm数据函数
const rules = {
    username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
    name: [
        {
            required: true,
            message: '请输入姓名',
            trigger: 'blur',
        },
    ],
    email: [
        {
            required: false,
            message: '请输入邮箱',
        },
        {
            type: 'email',
            message: '请输入正确的邮箱地址',
            trigger: ['blur', 'change'],
        },
    ],
    roleIds: [{ required: true, message: '请选择角色', trigger: 'change' }],
    organid: [{ required: true, message: '请选择组织', trigger: 'change' }],
};
// 重置表单sF
const resetForm = () => {
    ruleForm = reactive({ ...formTemplate });
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
};
const dialogVisible = ref(false);
const handleSizeChange = val => {
    pageSize.value = val;
    getInternalUsers();
};

const handleCurrentChange = val => {
    currentPage.value = val;
    getInternalUsers();
};
onMounted(() => {
    getInternalUsers();
    proxy.$api.getRolsList().then(res => {
        roleList.value = res.data;
    });
    // 组织列表
    proxy.$api.getOrganizationList().then(res => {
        zztree.value = res.data;
        // ruleForm.organizationId = res.data[0].id;
    });
});
onBeforeUnmount(() => {
    // proxy.$websocket.close();
});
const handleAvatarSuccess = (res, uploadFile) => {
    const { fileName, filePath, fileSize, id } = res.data;
    ruleForm.avatar = { fileName, filePath, fileSize, id };
};

const beforeAvatarUpload = rawFile => {
    if (rawFile.type != 'image/jpeg' && rawFile.type != 'image/png') {
        proxy.$message.error('图片必须是jpg或png格式');
        return false;
    } else if (rawFile.size / 1024 / 1024 > 5) {
        proxy.$message.error('图片不能超过5M');
        return false;
    }
    return true;
};
// 查询用户的函数
const getInternalUsers = async () => {
    let obj = {
        page: currentPage.value,
        pageSize: pageSize.value,
    };
    const res = await proxy.$api.find(obj);
    tableData.value = res.data.data;
    total.value = res.data.total;
};
const onSubmit = formEl => {
    formEl.validate(async valid => {
        if (valid) {
            //如果id存在，则修改
            if (ruleForm.id) {
                const data = await proxy.$api.update(ruleForm);
                if (data.code == 200) {
                    dialogVisible.value = false;
                    proxy.$message.success(data.message);
                    getInternalUsers();
                }
                return;
            }
            const data = await proxy.$api.add(ruleForm);
            if (data.code == 200) {
                dialogVisible.value = false;
                proxy.$message.success(data.message);
                getInternalUsers();
            }
        } else {
            return false;
        }
    });
};
// 修改
const handleEdit = row => {
    dialogVisible.value = true;
    proxy.$api.internalusersDetail({ id: row.id }).then(res => {
        Object.assign(ruleForm, res.data);
        // ruleForm.roleIds = res.data.data.map(item => item.id);
    });
};
// 删除
const handleDelete = row => {
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            type: '提示',
        })
        .then(async () => {
            const data = await proxy.$api.delete({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                getInternalUsers();
            }
        })
        .catch(() => {
            proxy.$message.info('已取消');
        });
};
const handleUnitChange = val => {};
// 禁用/解除禁用
const handleRelieve = row => {
    let fromData = {
        id: row.id,
        is_active: row.is_active === 1 ? 0 : 1,
    };
    proxy
        .$confirm('此操作将该用户, 是否继续?', '提示', {
            type: '提示',
        })
        .then(async () => {
            const data = await proxy.$api.post('/api/internalusers/ban', fromData);
            if (data.code == 200) {
                proxy.$message.success(data.message);
                getInternalUsers();
            }
        })
        .catch(async () => {
            await proxy.$message.info('已取消');
        });
};
</script>
<style scoped>
th.el-table__cell,
td.el-table__cell {
    position: static !important;
}

.demo-image__error .image-slot {
    font-size: 30px;
}
.demo-image__error .image-slot .el-icon {
    font-size: 30px;
}
.demo-image__error .el-image {
    width: 100%;
    height: 200px;
}
.avatar-uploader {
    width: 178px;
    height: 178px;
    display: block;
}
.avatar {
    width: 178px;
    height: 178px;
    display: block;
}
</style>

<style>
.avatar-uploader .el-upload {
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: var(--el-transition-duration-fast);
}

.avatar-uploader .el-upload:hover {
    border-color: var(--el-color-primary);
}

.el-icon.avatar-uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 178px;
    height: 178px;
    text-align: center;
}
</style>
