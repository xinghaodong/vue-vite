<template>
    <div>
        <div class="mb-4">
            <el-button type="primary" plain @click="addList()">新增</el-button>
        </div>
        <el-table :data="tableData" border style="width: 100%">
            <el-table-column type="expand">
                <template #default="props">
                    <div class="p-4 pl-6">
                        <div class="pb-4 text-lg font-bold">{{ props.row.name }} 持仓详情</div>
                        <el-table :data="props.row.data">
                            <el-table-column label="股票" prop="f14" />
                            <el-table-column label="持仓占比" prop="rawWeight" />
                            <el-table-column label="涨跌幅" prop="f3">
                                <template #default="scope">
                                    <el-tag v-if="scope.row.f3 > 0" type="danger">{{ (scope.row.f3 * 0.01).toFixed(2) + '%' }}</el-tag>
                                    <el-tag v-else type="success">{{ (scope.row.f3 * 0.01).toFixed(2) + '%' }}</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column label="股票代码" prop="rawName" />
                        </el-table>
                    </div>
                </template>
            </el-table-column>
            <el-table-column prop="name" label="基金名称" min-width="180"> </el-table-column>
            <el-table-column prop="fundChangePct" label="预估涨跌幅" min-width="180">
                <template #default="scope">
                    <el-tag v-if="scope.row.fundChangePct > 0" type="danger">{{ scope.row.fundChangePct + '%' }}</el-tag>
                    <el-tag v-else-if="scope.row.fundChangePct < 0" type="success">{{ scope.row.fundChangePct + '%' }}</el-tag>
                    <el-tag v-else-if="scope.row.fundChangePct == 0" type="info">{{ scope.row.fundChangePct + '%' }}</el-tag>
                    <el-tag v-else type="info">{{ scope.row.fundChangePct }}</el-tag>
                </template>
            </el-table-column>
            <!-- 操作 -->
            <el-table-column label="操作" width="130" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button link type="primary" @click="handleDelete(scope.row)">删除</el-button>
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

        <el-dialog :title="ruleForm.id ? '编辑' : '新增'" v-model="dialogVisible" width="60%">
            <el-form ref="ruleFormRef" :rules="rules" :model="ruleForm" label-width="100px">
                <el-form-item label="基金" prop="codeArr">
                    <div class="flex flex-wrap w-full">
                        <el-select
                            v-model="ruleForm.codeArr"
                            multiple
                            filterable
                            remote
                            reserve-keyword
                            placeholder="请输入基金代号、名称"
                            :remote-method="remoteMethod"
                            :loading="loading"
                            @change="handleChange"
                            @selectedLabel="selectedLabel"
                            style="width: 100%"
                        >
                            <template #label="{ label, value }">
                                <span>{{ label }}: </span>
                                <span style="font-weight: bold">{{ value }}</span>
                            </template>
                            <el-option v-for="item in options" :key="item._id" :label="item.NAME" :value="item._id">
                                <span style="float: left">{{ item.NAME }}</span>
                                <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px">
                                    {{ item.CATEGORYDESC }}
                                </span>
                            </el-option>
                        </el-select>
                        <div v-if="selectedItems && selectedItems.length > 0" class="mt-2" style="width: 100%">
                            <h4>选中项详情：</h4>
                            <!-- <pre>{{ selectedItems }}</pre> -->
                            <el-table :data="selectedItems" border style="width: 100%">
                                <el-table-column prop="NAME" label="基金名称" width="280" />
                                <el-table-column prop="JJJL" label="基金经理">
                                    <template #default="scope">
                                        <div class="flex flex-wrap gap-x-1.5">
                                            <el-tag v-for="item in scope.row.FundBaseInfo.JJJL.split(',')" :key="item">{{ item }}&nbsp; </el-tag>
                                        </div>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="CATEGORYDESC" label="基金公司">
                                    <template #default="scope">
                                        <el-tag>{{ scope.row.FundBaseInfo.JJGS }}</el-tag>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="CATEGORYDESC" label="基金类型">
                                    <template #default="scope">
                                        <el-tag>{{ scope.row.FundBaseInfo.FTYPE }}</el-tag>
                                    </template>
                                </el-table-column>
                            </el-table>

                            <!-- <el-col :xs="12" :sm="12" :md="12" :lg="12" :xl="24">
                                <el-form-item label="基金名称" prop="name">{{ selectedItems.FundBaseInfo.NAME }} </el-form-item>
                            </el-col>
                            <el-col :xs="12" :sm="12" :md="12" :lg="12" :xl="24">
                                <el-form-item label="基金名称" prop="name">{{ FundBaseInfo.NAME }} </el-form-item>
                            </el-col> -->
                        </div>
                    </div>
                </el-form-item>
                <el-form-item label="基金信息" prop="name" v-if="FundBaseInfo">
                    <el-input v-model="ruleForm.name" maxlength="20"></el-input>
                </el-form-item>
                <!-- <el-form-item label="基金信息" prop="name">
                    <el-input v-model="ruleForm.name" maxlength="20"></el-input>
                </el-form-item> -->
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="dialogVisible = false">取 消</el-button>
                    <el-button type="success" @click="onSubmit(ruleFormRef)">确 定</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, getCurrentInstance, onMounted, reactive, computed, watch } from 'vue';
const { proxy } = getCurrentInstance();
const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

const ruleFormRef = ref(null);
const dialogVisible = ref(false);
// 初始模板对象
const formTemplate = {
    codeArr: [],
    code: '',
    name: '',
    datas: '',
};
let ruleForm = reactive({ ...formTemplate });
// 重置ruleForm数据函数
const rules = {
    codeArr: [{ required: true, message: '请选择', trigger: 'blur' }],
};
const options = ref([]);

const loading = ref(false);

// 定义一个选中的数组对象
const selected = ref([]);

// 全局缓存所有曾经选中的完整对象（按 _id 去重）
const allSelectedCache = new Map();

const selectedItems = ref([]);
const handleChange = value => {
    console.log(value, 'value');
    selected.value = value;
};
const selectedLabel = value => {
    console.log(value, 'value');
};

const remoteMethod = query => {
    if (query) {
        console.log(query, '执行');
        loading.value = true;
        setTimeout(async () => {
            let { data } = await proxy.$api.getFundSearch({ key: query });
            console.log(data, '基金列表');
            options.value = data.Datas;
            loading.value = false;
        }, 180);
        // options.value = list.value.filter(item => {
        //     return item.label.toLowerCase().includes(query.toLowerCase());
        // });
    } else {
        options.value = [];
    }
};

const onSubmit = async formEl => {
    if (!formEl) return;
    await formEl.validate(async valid => {
        if (!valid) {
            proxy.$message.error('验证失败');
            return;
        }
        // 保存接口
        if (ruleForm && ruleForm.codeArr.length > 0) {
            selectedItems.value = selectedItems.value.map(item => {
                item.code = item.CODE;
                item.name = item.NAME;
                item.datas = JSON.stringify(item);
                return item;
            });

            const { code } = await proxy.$api.addFund({ items: selectedItems.value });
            if (code == 200) {
                proxy.$message.success('保存成功');
                dialogVisible.value = false;
                getDataList();
            }
        }
    });
};
// 新增
const addList = () => {
    Object.assign(ruleForm, formTemplate);
    dialogVisible.value = true;
};
const getDataList = async () => {
    let obj = {
        page: currentPage.value,
        pageSize: pageSize.value,
    };
    const { data } = await proxy.$api.getFundList(obj);
    console.log(data, '基金列表');
    tableData.value = data;
    total.value = data.total;
};
const handleSizeChange = val => {
    pageSize.value = val;
    getDataList();
};

const handleCurrentChange = val => {
    currentPage.value = val;
    // getDataList();
};
// 修改
const handleEdit = row => {
    proxy.$router.push({
        path: '/home/newcesium',
        query: { idkey: row ? row.id : '' },
    });
    // const routeData = proxy.$router.resolve({
    //     path: '/cesium2d',
    //     query: { idkey: row ? row.id : '', token: sessionStorage.getItem('token') }, // 添加查询参数
    // });
    // // 打开新标签页，并保存引用
    // window.open(routeData.href, '_blank');
};
// 删除
const handleDelete = row => {
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            type: '提示',
        })
        .then(async () => {
            const data = await proxy.$api.deleteFund({ id: row.id });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                getDataList();
            }
        })
        .catch(() => {
            proxy.$message.info('已取消');
        });
};

//在 watch 中，当新增项不在 options 里时，从缓存取
watch(
    () => ruleForm.codeArr,
    newIds => {
        console.log(newIds, 'newIds-------------');
        // 从缓存 + options 中重建 selectedItems
        const newSelected = [];
        for (const id of newIds) {
            console.log(id, 'id');
            // 优先从 options 找（最新数据）
            const fromOptions = options.value.find(item => item._id == id);
            if (fromOptions) {
                newSelected.push(fromOptions);
                allSelectedCache.set(id, fromOptions); // 更新缓存
            } else {
                // 否则从缓存取（历史数据）
                const fromCache = allSelectedCache.get(id);
                if (fromCache) {
                    newSelected.push(fromCache);
                }
            }
        }
        console.log(newSelected, 'newSelected');
        selectedItems.value = newSelected;
    },
    { deep: true },
);

onMounted(async () => {
    try {
        await getDataList();
    } catch (error) {
        console.error('失败信息:', error);
    }
});
</script>

<style lang="css" scoped></style>
