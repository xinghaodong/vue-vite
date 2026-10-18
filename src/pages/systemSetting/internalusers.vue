<template>
    <div class="internal-users-container">
        <!-- 接入大厂级超级表格 ProTable (内置响应式搜索、自动分页、密度切换、列显隐、全屏与局部刷新) -->
        <ProTable
            ref="proTableRef"
            title="内部用户与权限管理"
            :columns="columns"
            :request-api="getUserList"
            row-key="id"
            :border="true"
        >
            <!-- 头部操作按钮区域 -->
            <template #tableHeader>
                <el-button
                    type="primary"
                    :icon="Plus"
                    @click="handleAdd"
                >
                    新增用户
                </el-button>
            </template>

            <!-- 头像列具名插槽 -->
            <template #avatar="{ row }">
                <div class="avatar-cell">
                    <el-image
                        v-if="row?.avatar?.filePath"
                        preview-teleported
                        class="user-table-avatar"
                        :src="formatAvatarUrl(row?.avatar?.filePath)"
                        :zoom-rate="1.2"
                        :max-scale="7"
                        :min-scale="0.2"
                        :initial-index="0"
                        :z-index="999"
                        fit="cover"
                        :preview-src-list="[formatAvatarUrl(row?.avatar?.filePath)]"
                    />
                    <el-avatar v-else :size="32" class="user-table-avatar-fallback">
                        {{ row?.name ? row.name.slice(0, 1) : row?.username ? row.username.slice(0, 1) : '用' }}
                    </el-avatar>
                </div>
            </template>

            <!-- 操作列插槽 -->
            <template #operation="{ row }">
                <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
                <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
        </ProTable>
        <ProDialog
            :title="ruleForm.id ? '编辑内部用户' : '新增内部用户'"
            sub-title="配置用户系统登录账号、姓名、电子邮箱、分配角色与所属部门"
            v-model="dialogVisible"
            width="600px"
            :on-confirm="() => onSubmit(ruleFormRef)"
        >
            <el-form ref="ruleFormRef" :rules="rules" :model="ruleForm" label-width="100px">
                <el-form-item label="账号" prop="username">
                    <el-input v-model="ruleForm.username" placeholder="请输入用户账号"></el-input>
                </el-form-item>
                <el-form-item label="姓名" prop="name">
                    <el-input v-model="ruleForm.name" placeholder="请输入真实姓名"></el-input>
                </el-form-item>
                <el-form-item label="邮箱" prop="email">
                    <el-input v-model="ruleForm.email" placeholder="请输入企业邮箱"></el-input>
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
                    <el-select v-model="ruleForm.roleIds" multiple placeholder="请选择角色" style="width: 100%">
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
                        :default-expanded-keys="[zztree?.[0]?.organid || 0]"
                        check-strictly
                        :render-after-expand="true"
                        placeholder="请选择组织"
                        style="width: 100%"
                    />
                </el-form-item>
            </el-form>
        </ProDialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue';
import { Plus } from '@element-plus/icons-vue';
const { proxy } = getCurrentInstance();
const proTableRef = ref(null);
const ruleFormRef = ref(null);
const uploadUrl = `${proxy.$api.baseUrl}/upload/uploadFile`;
const headers = { Authorization: sessionStorage.getItem('token') };
const roleList = ref([]);

// ProTable 列配置与搜索配置
const columns = [
    {
        type: 'index',
        label: '#',
        width: 60,
        align: 'center'
    },
    {
        prop: 'username',
        label: '账号',
        minWidth: 140,
        align: 'center',
        search: {
            el: 'input',
            order: 1,
            props: { placeholder: '请输入用户账号' }
        }
    },
    {
        prop: 'name',
        label: '姓名',
        minWidth: 140,
        align: 'center',
        search: {
            el: 'input',
            order: 2,
            props: { placeholder: '请输入用户姓名' }
        }
    },
    {
        prop: 'avatar',
        label: '头像',
        width: 80,
        align: 'center'
    },
    {
        prop: 'email',
        label: '邮箱',
        minWidth: 180,
        align: 'center'
    },
    {
        prop: 'role',
        label: '权限角色',
        minWidth: 140,
        align: 'center'
    },
    {
        prop: 'is_active',
        label: '状态',
        width: 100,
        align: 'center',
        // 动态通用组件 el-tag 声明式配置
        component: 'el-tag',
        props: (row) => ({
            type: row.is_active == 1 ? 'success' : 'info',
            round: true
        }),
        formatter: (row) => (row.is_active == 1 ? '可用' : '禁用'),
        search: {
            el: 'select',
            order: 3,
            options: [
                { label: '全部', value: '' },
                { label: '可用', value: 1 },
                { label: '禁用', value: 0 }
            ]
        }
    },
    {
        prop: 'created_at',
        label: '创建时间',
        minWidth: 170,
        align: 'center'
    },
    {
        prop: 'updated_at',
        label: '更新时间',
        minWidth: 170,
        align: 'center'
    },
    {
        prop: 'operation',
        label: '操作',
        width: 140,
        fixed: 'right',
        align: 'center'
    }
];

// 请求列表函数，对接 ProTable 的 request-api
const getUserList = async (params) => {
    try {
        const query = {
            page: params.pageNum,
            pageSize: params.pageSize,
            username: params.username,
            name: params.name,
            is_active: params.is_active
        };
        // 过滤空查询字段
        Object.keys(query).forEach(key => {
            if (query[key] === '' || query[key] === undefined || query[key] === null) {
                delete query[key];
            }
        });
        const res = await proxy.$api.find(query);
        return {
            data: {
                list: res?.data?.data || [],
                total: res?.data?.total || 0
            }
        };
    } catch (error) {
        console.error('获取用户列表失败:', error);
        return {
            data: {
                list: [],
                total: 0
            }
        };
    }
};

// 新增用户触发
const handleAdd = () => {
    dialogVisible.value = true;
    resetForm();
};
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
            required: true,
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

onMounted(() => {
    proxy.$api.getRolsList().then(res => {
        roleList.value = res.data;
    });
    // 组织列表
    proxy.$api.getOrganizationList().then(res => {
        zztree.value = res.data;
    });
});
onBeforeUnmount(() => {
    // proxy.$websocket.close();
});
const handleAvatarSuccess = (res, uploadFile) => {
    const { fileName, filePath, fileSize, id } = res.data;
    ruleForm.avatar = { fileName, filePath, fileSize, id };
};

const formatAvatarUrl = path => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.replace(/^[/\\]+/, '').replace(/\\/g, '/');
    return `${proxy.$api.img_url}${cleanPath}`;
};

const beforeAvatarUpload = rawFile => {
    return true;
};

// 触发 ProTable 局部刷新（兼容新增、修改、删除后的调用）
const getInternalUsers = () => {
    proTableRef.value?.getTableList();
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
.internal-users-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
}

.avatar-cell {
    display: flex;
    justify-content: center;
    align-items: center;
}

.user-table-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    vertical-align: middle;
}

.user-table-avatar-fallback {
    background-color: var(--el-color-primary);
    color: #fff;
    font-size: 13px;
    font-weight: 500;
}

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
.el-avatar--circle {
    background: var(--el-color-primary);
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
