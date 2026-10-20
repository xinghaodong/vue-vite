<template>
    <div class="internal-users-container">
        <!-- 接入大厂级超级表格 ProTable (内置响应式搜索、自动分页、密度切换、列显隐、全屏与局部刷新) -->
        <ProTable ref="proTableRef" title="内部用户与权限管理" :columns="columns" :request-api="getUserList" row-key="id" :border="true">
            <!-- 头部操作按钮区域 -->
            <template #tableHeader>
                <el-button type="primary" :icon="Plus" @click="handleAdd"> 新增用户 </el-button>
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

            <!-- 权限角色列具名插槽 -->
            <template #roles="{ row }">
                <div v-if="row?.roles && row.roles.length" class="role-tags-cell">
                    <el-tag v-for="role in row.roles" :key="role.id" size="small" type="primary" effect="light" round>
                        {{ role.name }}
                    </el-tag>
                </div>
                <span v-else class="empty-roles-tip">暂无角色</span>
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
                        <img v-if="ruleForm.avatar?.filePath" :src="formatAvatarUrl(ruleForm.avatar?.filePath)" class="avatar" />
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
import { ref, reactive, onMounted, computed } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getUserList as fetchUserList, addUser, updateUser, deleteUser, getUserDetail } from '@/api/user';
import { getRoleList } from '@/api/role';
import { getOrganizationList } from '@/api/organization';

const proTableRef = ref(null);
const ruleFormRef = ref(null);
const uploadUrl = `${import.meta.env.VITE_PROXY_DOMAIN || ''}/upload/uploadFile`;
const imgBaseUrl = import.meta.env.VITE_STATIC_URL || '';
const headers = { Authorization: sessionStorage.getItem('token') };
const roleList = ref([]);

// ProTable 列配置与搜索配置
const columns = computed(() => [
    {
        type: 'index',
        label: '#',
        width: 60,
        align: 'center',
    },
    {
        prop: 'username',
        label: '账号',
        minWidth: 140,
        align: 'center',
        search: {
            el: 'input',
            order: 1,
            props: { placeholder: '请输入用户账号' },
        },
    },
    {
        prop: 'name',
        label: '姓名',
        minWidth: 140,
        align: 'center',
        search: {
            el: 'input',
            order: 2,
            props: { placeholder: '请输入用户姓名' },
        },
    },
    {
        prop: 'avatar',
        label: '头像',
        width: 80,
        align: 'center',
    },
    {
        prop: 'email',
        label: '邮箱',
        minWidth: 180,
        align: 'center',
        search: {
            el: 'input',
            order: 3,
            props: { placeholder: '请输入邮箱' },
        },
    },
    {
        prop: 'roles',
        label: '权限角色',
        minWidth: 160,
        align: 'center',
        search: {
            el: 'select',
            order: 4,
            options: roleList.value, // 已在 onMounted 中加载好的角色列表
            props: {
                placeholder: '请选择角色',
                multiple: true, // 开启多选
                value: 'id', // 绑定的值字段
                label: 'name', // 显示的文本字段
            },
        },
    },
    {
        prop: 'created_at',
        label: '创建时间',
        minWidth: 170,
        align: 'center',
        search: {
            el: 'date',
            order: 5,
            props: {
                type: 'daterange',
                startPlaceholder: '开始时间',
                endPlaceholder:'结束时间',
            }
        }
    },
    {
        prop: 'updated_at',
        label: '更新时间',
        minWidth: 170,
        align: 'center',
        search: {
            el: 'date',
            order: 6,
            props: {
                type: 'daterange',
                startPlaceholder: '开始时间',
                endPlaceholder:'结束时间',
            }
        }
    },
    {
        prop: 'operation',
        label: '操作',
        width: 140,
        fixed: 'right',
        align: 'center',
    },
]);

// 请求列表函数，对接 ProTable 的 request-api
const getUserList = async params => {
    console.log(params, 'params');
    try {
        const query = {
            page: params.pageNum,
            pageSize: params.pageSize,
            ...params,
        };
        // 过滤空查询字段
        Object.keys(query).forEach(key => {
            if (query[key] === '' || query[key] === undefined || query[key] === null) {
                delete query[key];
            }
        });
        const res = await fetchUserList(query);
        return {
            data: {
                list: res?.data?.data || [],
                total: res?.data?.total || 0,
            },
        };
    } catch (error) {
        console.error('获取用户列表失败:', error);
        return {
            data: {
                list: [],
                total: 0,
            },
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
// 重置表单
const resetForm = () => {
    ruleForm = reactive({ ...formTemplate });
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
};
const dialogVisible = ref(false);

onMounted(async () => {
    try {
        const [rolesRes, orgRes] = await Promise.all([getRoleList(), getOrganizationList()]);
        roleList.value = rolesRes?.data || [];
        zztree.value = orgRes?.data || [];
    } catch (err) {
        console.error('加载角色或组织列表失败:', err);
    }
});

const handleAvatarSuccess = (res, uploadFile) => {
    const { fileName, filePath, fileSize, id } = res.data;
    ruleForm.avatar = { fileName, filePath, fileSize, id };
};

const formatAvatarUrl = path => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.replace(/^[/\\]+/, '').replace(/\\/g, '/');
    return `${imgBaseUrl}${cleanPath}`;
};

const beforeAvatarUpload = rawFile => {
    return true;
};

// 触发 ProTable 局部刷新（兼容新增、修改、删除后的调用）
const getInternalUsers = () => {
    proTableRef.value?.getTableList();
};

const onSubmit = async formEl => {
    if (!formEl) return false;
    const valid = await formEl.validate().catch(() => false);
    if (!valid) return false;

    try {
        const isEdit = Boolean(ruleForm.id);
        const api = isEdit ? updateUser : addUser;
        const res = await api(ruleForm);
        ElMessage.success(res?.message || (isEdit ? '修改成功' : '新增成功'));
        getInternalUsers();
        // ProDialog 自动关闭弹窗并结束 loading，无需手动设置 dialogVisible.value = false
    } catch (err) {
        console.error('保存用户异常:', err);
        return false;
    }
};

// 修改
const handleEdit = async row => {
    dialogVisible.value = true;
    try {
        const res = await getUserDetail({ id: row.id });
        Object.assign(ruleForm, res.data);
    } catch (err) {
        console.error('获取用户详情异常:', err);
    }
};

// 删除
const handleDelete = row => {
    ElMessageBox.confirm('确定要删除该用户吗?', '提示', {
        type: 'warning',
    })
        .then(async () => {
            const data = await deleteUser({ id: row.id });
            ElMessage.success(data?.message || '删除成功');
            getInternalUsers();
        })
        .catch(() => {});
};

const handleUnitChange = val => {};
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

.role-tags-cell {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
}

.empty-roles-tip {
    color: var(--el-text-color-placeholder);
    font-size: 13px;
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
