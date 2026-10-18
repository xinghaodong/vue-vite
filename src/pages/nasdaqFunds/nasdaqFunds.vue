<template>
    <div class="nasdaq-funds-container">
        <!-- 接入大厂级超级表格 ProTable (支持嵌套展开行与实时盈亏标签) -->
        <ProTable
            ref="proTableRef"
            title="纳指公募基金与重仓股追踪"
            :columns="columns"
            :request-api="getFundTableData"
            row-key="id"
            :border="true"
        >
            <template #tableHeader>
                <el-button type="primary" :icon="Plus" @click="addList()">新增关注基金</el-button>
            </template>

            <!-- 嵌套展开行插槽 -->
            <template #expand="{ row }">
                <div class="p-4 pl-6">
                    <div class="pb-3 text-base font-bold text-gray-700">【{{ row.name }}】前十大重仓股票持仓明细</div>
                    <el-table :data="row.data" border size="small" style="width: 100%">
                        <el-table-column label="股票名称" prop="rawNames" min-width="140" />
                        <el-table-column label="持仓占比" prop="rawWeight" width="120" align="center" />
                        <el-table-column label="当日涨跌幅" prop="f3" width="140" align="center">
                            <template #default="scope">
                                <el-tag v-if="scope.row.f3 > 0" type="danger">+{{ (scope.row.f3 * 0.01).toFixed(2) }}%</el-tag>
                                <el-tag v-else-if="scope.row.f3 < 0" type="success">{{ (scope.row.f3 * 0.01).toFixed(2) }}%</el-tag>
                                <el-tag v-else-if="scope.row.f3 == 0" type="info">0.00%</el-tag>
                                <el-tag v-else type="info">未获取</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="股票代码" prop="rawName" width="130" align="center" />
                    </el-table>
                </div>
            </template>

            <!-- 预估涨跌幅标签 -->
            <template #fundChangePct="{ row }">
                <el-tag v-if="row.fundChangePct > 0" type="danger">+{{ row.fundChangePct }}%</el-tag>
                <el-tag v-else-if="row.fundChangePct < 0" type="success">{{ row.fundChangePct }}%</el-tag>
                <el-tag v-else-if="row.fundChangePct == 0" type="info">0.00%</el-tag>
                <el-tag v-else type="info">{{ row.fundChangePct || '-' }}</el-tag>
            </template>

            <!-- 操作列 -->
            <template #operation="{ row }">
                <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
        </ProTable>

        <!-- 基金搜索与关注 ProDialog -->
        <ProDialog
            v-model="dialogVisible"
            title="添加关注基金"
            sub-title="通过代码或名称联想检索公募基金，并加入监控组合"
            width="750px"
            :on-confirm="() => onSubmit(ruleFormRef)"
        >
            <el-form ref="ruleFormRef" :rules="rules" :model="ruleForm" label-width="90px">
                <el-form-item label="搜索基金" prop="codeArr">
                    <div class="flex flex-col w-full gap-2">
                        <el-select
                            v-model="ruleForm.codeArr"
                            multiple
                            filterable
                            remote
                            reserve-keyword
                            placeholder="请输入基金代号、拼音或中文名称检索"
                            :remote-method="remoteMethod"
                            :loading="loading"
                            style="width: 100%"
                        >
                            <el-option v-for="item in options" :key="item._id" :label="item.NAME" :value="item._id">
                                <span style="float: left">{{ item.NAME }}</span>
                                <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px">
                                    {{ item.CATEGORYDESC }}
                                </span>
                            </el-option>
                        </el-select>

                        <!-- 选中项详情卡片表格 -->
                        <div v-if="selectedItems && selectedItems.length > 0" class="mt-2 w-full">
                            <div class="mb-2 text-sm font-medium text-gray-600">已选待关注基金列表：</div>
                            <el-table :data="selectedItems" border size="small" style="width: 100%">
                                <el-table-column prop="NAME" label="基金名称" min-width="200" />
                                <el-table-column prop="JJJL" label="基金经理" min-width="120">
                                    <template #default="scope">
                                        <div class="flex flex-wrap gap-1">
                                            <el-tag size="small" v-for="item in (scope.row.FundBaseInfo?.JJJL || '').split(',')" :key="item">{{ item }}</el-tag>
                                        </div>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="CATEGORYDESC" label="基金公司" width="130">
                                    <template #default="scope">
                                        {{ scope.row.FundBaseInfo?.JJGS || '-' }}
                                    </template>
                                </el-table-column>
                                <el-table-column prop="CATEGORYDESC" label="基金类型" width="110">
                                    <template #default="scope">
                                        {{ scope.row.FundBaseInfo?.FTYPE || '-' }}
                                    </template>
                                </el-table-column>
                            </el-table>
                        </div>
                    </div>
                </el-form-item>
            </el-form>
        </ProDialog>
    </div>
</template>

<script setup>
import { ref, getCurrentInstance, reactive, watch } from 'vue';
import { Plus } from '@element-plus/icons-vue';

const { proxy } = getCurrentInstance();
const proTableRef = ref(null);
const ruleFormRef = ref(null);
const dialogVisible = ref(false);

const formTemplate = {
    codeArr: [],
    code: '',
    name: '',
    datas: '',
};
let ruleForm = reactive({ ...formTemplate });

const rules = {
    codeArr: [{ required: true, message: '请检索并选择至少一支基金', trigger: 'change' }],
};

const options = ref([]);
const loading = ref(false);
const allSelectedCache = new Map();
const selectedItems = ref([]);

const columns = [
    { type: 'expand', width: 50 },
    { type: 'index', label: '#', width: 60, align: 'center' },
    {
        prop: 'name',
        label: '基金全称',
        minWidth: 220,
        search: {
            el: 'input',
            props: { placeholder: '请输入基金名称或代码' }
        }
    },
    { prop: 'fundChangePct', label: '预估涨跌幅', width: 160, align: 'center' },
    { prop: 'operation', label: '操作', width: 120, fixed: 'right', align: 'center' }
];

// ProTable 数据请求驱动适配
const getFundTableData = async (params = {}) => {
    const { pageNum, pageSize } = params;
    const res = await proxy.$api.getFundList({
        page: pageNum,
        pageSize
    });
    const list = Array.isArray(res?.data) ? res.data : (res?.data?.list || []);
    const total = res?.data?.total || list.length;
    return {
        data: {
            list,
            total
        }
    };
};

const remoteMethod = query => {
    if (query) {
        loading.value = true;
        setTimeout(async () => {
            try {
                const { data } = await proxy.$api.getFundSearch({ key: query });
                options.value = data.Datas || [];
            } catch (err) {
                console.error('基金检索失败:', err);
            } finally {
                loading.value = false;
            }
        }, 180);
    } else {
        options.value = [];
    }
};

const addList = () => {
    Object.assign(ruleForm, formTemplate);
    ruleForm.codeArr = [];
    selectedItems.value = [];
    dialogVisible.value = true;
};

const onSubmit = async formEl => {
    if (!formEl) return false;
    return new Promise(resolve => {
        formEl.validate(async valid => {
            if (!valid) {
                proxy.$message.error('请选择基金');
                return resolve(false);
            }

            if (ruleForm && ruleForm.codeArr.length > 0) {
                const itemsToSave = selectedItems.value.map(item => ({
                    ...item,
                    code: item.CODE,
                    name: item.NAME,
                    datas: JSON.stringify(item)
                }));

                try {
                    const { code, message } = await proxy.$api.addFund({ items: itemsToSave });
                    if (code == 200) {
                        proxy.$message.success(message || '保存成功');
                        dialogVisible.value = false;
                        proTableRef.value?.refresh();
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } catch (err) {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

const handleDelete = row => {
    proxy.$messageBox
        .confirm('确定要删除关注的该基金吗?', '提示', {
            type: 'warning',
        })
        .then(async () => {
            const data = await proxy.$api.deleteFund({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                proTableRef.value?.refresh();
            }
        })
        .catch(() => {
            proxy.$message.info('已取消');
        });
};

watch(
    () => ruleForm.codeArr,
    newIds => {
        const newSelected = [];
        for (const id of (newIds || [])) {
            const fromOptions = options.value.find(item => item._id == id);
            if (fromOptions) {
                newSelected.push(fromOptions);
                allSelectedCache.set(id, fromOptions);
            } else {
                const fromCache = allSelectedCache.get(id);
                if (fromCache) {
                    newSelected.push(fromCache);
                }
            }
        }
        selectedItems.value = newSelected;
    },
    { deep: true },
);
</script>

<style scoped>
.nasdaq-funds-container {
    width: 100%;
    height: 100%;
}
</style>
