<template>
    <div class="table-demo-page">
        <ProTable
            ref="proTableRef"
            title="高级超级表格与动态搜索 (ProTable)"
            :columns="columns"
            :request-api="mockFetchUserList"
            row-key="id"
            :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
            :border="true"
            :stripe="true"
        >
            <!-- 头部操作按钮区域 -->
            <template #tableHeader="{ selectedListIds }">
                <el-button type="primary" :icon="Plus" @click="handleAdd">
                    新建数据
                </el-button>
                <el-button
                    type="danger"
                    plain
                    :icon="Delete"
                    :disabled="!selectedListIds.length"
                    @click="handleBatchDelete(selectedListIds)"
                >
                    批量删除
                </el-button>
                <el-button :icon="Download" @click="handleExport">
                    导出
                </el-button>
            </template>

            <!-- 动态作用域插槽：用户名自定义渲染 -->
            <template #username="{ row }">
                <div class="user-cell">
                    <el-avatar :size="24" :icon="User" class="user-avatar" />
                    <span class="user-name">{{ row.username }}</span>
                </div>
            </template>

            <!-- 操作列插槽 (移除写死的 size="small"，完全跟随全局组件尺寸缩放) -->
            <template #operation="{ row }">
                <el-button link type="primary" @click="handleEdit(row)">
                    编辑
                </el-button>
                <el-button link type="primary" @click="handleAddChild(row)">
                    添加下级
                </el-button>
                <el-popconfirm title="确认删除此行数据吗？" @confirm="handleDelete(row)">
                    <template #reference>
                        <el-button link type="danger">
                            删除
                        </el-button>
                    </template>
                </el-popconfirm>
            </template>
        </ProTable>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Delete, Download, User } from '@element-plus/icons-vue';

const proTableRef = ref(null);

// 列配置（包含自适应搜索、树形嵌套、枚举徽标、动态组件 el-link、自定义操作列）
const columns = [
    { type: 'selection', fixed: 'left', width: 50 },
    { type: 'index', label: '#', width: 60, align: 'center' },
    {
        prop: 'username',
        label: '用户姓名 / 部门树',
        minWidth: 180,
        search: {
            el: 'input',
            order: 1,
            props: { placeholder: '请输入姓名或部门关键字' }
        }
    },
    {
        prop: 'gender',
        label: '性别',
        width: 90,
        align: 'center',
        // 纯净通用组件配置：无需底层写死 tag 特例，想用什么组件直接配
        component: 'el-tag',
        props: (row) => ({
            type: row.gender === '1' ? 'primary' : 'danger',
            round: true
        }),
        formatter: (row) => (row.gender === '1' ? '男' : row.gender === '2' ? '女' : '--'),
        search: {
            el: 'select',
            order: 2,
            options: [
                { label: '全部', value: '' },
                { label: '男', value: '1' },
                { label: '女', value: '2' }
            ]
        }
    },
    {
        prop: 'phone',
        label: '手机号码',
        minWidth: 140,
        // 动态组件声明式配置：直接使用 el-link
        component: 'el-link',
        props: {
            type: 'primary',
            underline: false
        },
        events: (row) => ({
            click: () => {
                ElMessage.info(`查看/拨打 [${row.username}] 的联系电话: ${row.phone}`);
            }
        })
    },
    {
        prop: 'role',
        label: '所属角色',
        minWidth: 120
        // 不配置 search，纯展示
    },
    {
        prop: 'status',
        label: '状态', 
        width: 100,
        align: 'center',
        // 纯净通用组件配置：直接使用 el-tag
        component: 'el-tag',
        props: (row) => ({
            type: row.status === 1 ? 'success' : 'info',
            round: true
        }),
        formatter: (row) => (row.status === 1 ? '启用' : '禁用'),
        search: {
            el: 'select',
            order: 3,
            options: [
                { label: '全部', value: '' },
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 }
            ]
        }
    },
    {
        prop: 'createTime',
        label: '创建时间',
        minWidth: 170
        // 不配置 search，纯展示
    },
    {
        prop: 'operation',
        label: '操作',
        width: 180,
        fixed: 'right',
        align: 'center'
    }
];

// 模拟后端树形表格数据与分页搜索接口
const mockFetchUserList = async (params) => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('[Mock API] 请求入参:', params);

    // 模拟包含树形结构的数据
    const fullList = [
        {
            id: '1',
            username: '技术研发中心',
            gender: '1',
            phone: '13800000001',
            role: 'admin',
            status: 1,
            createTime: '2026-01-10 09:30:00',
            children: [
                {
                    id: '1-1',
                    username: '前端架构组 - 张三',
                    gender: '1',
                    phone: '13800000002',
                    role: 'admin',
                    status: 1,
                    createTime: '2026-02-15 10:20:00'
                },
                {
                    id: '1-2',
                    username: '后端服务组 - 李四',
                    gender: '2',
                    phone: '13800000003',
                    role: 'operator',
                    status: 1,
                    createTime: '2026-02-18 14:00:00'
                }
            ]
        },
        {
            id: '2',
            username: '空域运控管理处',
            gender: '1',
            phone: '13900000004',
            role: 'operator',
            status: 1,
            createTime: '2026-03-01 11:15:00',
            children: [
                {
                    id: '2-1',
                    username: '航线巡检中队 - 王五',
                    gender: '1',
                    phone: '13900000005',
                    role: 'operator',
                    status: 1,
                    createTime: '2026-03-05 16:40:00'
                }
            ]
        },
        {
            id: '3',
            username: '数据智能中枢 - 赵六',
            gender: '2',
            phone: '13700000006',
            role: 'user',
            status: 0,
            createTime: '2026-04-12 18:22:00'
        },
        {
            id: '4',
            username: '无人机运管平台 - 孙七',
            gender: '1',
            phone: '13700000007',
            role: 'user',
            status: 1,
            createTime: '2026-04-13 09:12:00'
        },
        {
            id: '5',
            username: '机场自动巡视站 - 周八',
            gender: '2',
            phone: '13700000008',
            role: 'operator',
            status: 1,
            createTime: '2026-04-14 10:30:00'
        },
        {
            id: '6',
            username: '气象数据预警部 - 吴九',
            gender: '1',
            phone: '13700000009',
            role: 'user',
            status: 0,
            createTime: '2026-04-15 11:20:00'
        },
        {
            id: '7',
            username: '低空航路网规划组 - 郑十',
            gender: '2',
            phone: '13700000010',
            role: 'admin',
            status: 1,
            createTime: '2026-04-16 14:45:00'
        },
        {
            id: '8',
            username: '飞行安全应急队 - 刘一',
            gender: '1',
            phone: '13700000011',
            role: 'operator',
            status: 1,
            createTime: '2026-04-17 15:50:00'
        },
        {
            id: '9',
            username: '空域资产盘点处 - 陈二',
            gender: '2',
            phone: '13700000012',
            role: 'user',
            status: 0,
            createTime: '2026-04-18 16:35:00'
        },
        {
            id: '10',
            username: '通信导航保障组 - 楚三',
            gender: '1',
            phone: '13700000013',
            role: 'admin',
            status: 1,
            createTime: '2026-04-19 17:10:00'
        }
    ];

    // 简单前端模拟过滤
    let filtered = fullList;
    if (params.username) {
        filtered = filtered.filter(item => item.username.includes(params.username));
    }
    if (params.gender) {
        filtered = filtered.filter(item => String(item.gender) === String(params.gender));
    }

    return {
        list: filtered,
        total: filtered.length
    };
};

const handleAdd = () => {
    ElMessage.success('点击了新建数据');
};

const handleEdit = (row) => {
    ElMessage.info(`编辑行：${row.username}`);
};

const handleAddChild = (row) => {
    ElMessage.info(`为【${row.username}】添加下级节点`);
};

const handleDelete = (row) => {
    ElMessage.warning(`删除成功：${row.username}`);
    proTableRef.value?.refresh();
};

const handleBatchDelete = (ids) => {
    ElMessage.warning(`批量删除选中的 ID: ${ids.join(', ')}`);
    proTableRef.value?.refresh();
};

const handleExport = () => {
    ElMessage.success('正在导出当前筛选数据...');
};
</script>

<style scoped>
.table-demo-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    background-color: var(--el-bg-color-page);
}

.user-cell {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.user-avatar {
    background-color: var(--el-fill-color-dark);
    color: var(--el-text-color-regular);
}

.user-name {
    font-weight: 500;
}
</style>
