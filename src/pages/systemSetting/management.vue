<template>
    <div class="management-container">
        <!-- 接入大厂级超级表格 ProTable (支持树形层级展开) -->
        <ProTable
            ref="proTableRef"
            title="组织架构与法人主体"
            :columns="columns"
            :request-api="getOrganTableData"
            row-key="organid"
            :pagination="false"
            :is-show-search="false"
            :border="true"
        >
            <!-- 头部操作按钮区域 -->
            <template #tableHeader>
                <el-button type="primary" :icon="Plus" @click="handleAdd">新增组织</el-button>
            </template>

            <!-- 组织类型标签 -->
            <template #orgType="{ row }">
                <el-tag :type="row.orgType === 'company' ? 'success' : 'info'" disable-transitions>
                    {{ row.orgType === 'company' ? '法人公司' : '部门中心' }}
                </el-tag>
            </template>

            <!-- 发票抬头 -->
            <template #legalEntityName="{ row }">
                <span v-if="row.legalEntityName" style="font-weight: 500;">{{ row.legalEntityName }}</span>
                <span v-else style="font-size: 13px" class="text-gray-400">{{ row.orgType === 'company' ? '未设置' : '向上继承上级公司' }}</span>
            </template>

            <!-- 统一社会信用代码 -->
            <template #taxCode="{ row }">
                <span v-if="row.taxCode" style="font-family: monospace; font-size: 13px;">{{ row.taxCode }}</span>
                <span v-else style="font-size: 13px" class="text-gray-400">{{ row.orgType === 'company' ? '未设置' : '向上继承上级公司' }}</span>
            </template>

            <!-- 操作列 -->
            <template #operation="{ row }">
                <el-button v-if="row.organid" type="primary" link @click="handleEdit(row.organid)">编辑</el-button>
                <el-button v-if="row.organid" type="danger" link @click="handleDelete(row.organid)">删除</el-button>
            </template>
        </ProTable>

        <ProDialog
            v-model="dialogVisible"
            :title="form.organid ? '修改组织架构' : '新增组织架构'"
            sub-title="维护部门中心或法人公司主体及发票纳税信息"
            width="680px"
            :on-confirm="() => onSubmit(ruleFormRef)"
        >
            <el-form :model="form" :label-width="formLabelWidth" :rules="rules" ref="ruleFormRef">
                <el-row>
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item label="组织名称" prop="organame">
                            <el-input v-model="form.organame" autocomplete="off" placeholder="请输入部门或公司名称" />
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
                                :default-expanded-keys="[treeDatas[0]?.organid || 0]"
                                check-strictly
                                :render-after-expand="true"
                                placeholder="请选择上级组织"
                            />
                        </el-form-item>
                    </el-col>

                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item prop="orgcode">
                            <template #label>
                                <el-tooltip content="组织的唯一业务编码" placement="top">
                                    <el-icon class="iconsStyle"><InfoFilled /></el-icon>
                                </el-tooltip>
                                组织编码
                            </template>
                            <el-input v-model="form.orgcode" placeholder="请输入唯一编码" clearable />
                        </el-form-item>
                    </el-col>

                    <!-- 组织类型 -->
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item label="组织类型" prop="orgType">
                            <el-radio-group v-model="form.orgType">
                                <el-radio label="dept">部门 / 中心</el-radio>
                                <el-radio label="company">法人公司主体</el-radio>
                            </el-radio-group>
                            <div style="font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.4">
                                {{ form.orgType === 'company' ? '🏢 法人公司：需维护独立发票抬头与税号，报销审计将以此为核验标准' : '📁 部门中心：无需单独维护税号，员工报销时将自动向上追溯继承归属公司的抬头与税号' }}
                            </div>
                        </el-form-item>
                    </el-col>

                    <!-- 仅当为法人公司主体，显示抬头和税号维护项 -->
                    <template v-if="form.orgType === 'company'">
                        <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                            <el-form-item prop="legalEntityName">
                                <template #label>
                                    <el-tooltip content="企业法定全称，用于发票购买方抬头合规校验" placement="top">
                                        <el-icon class="iconsStyle"><InfoFilled /></el-icon>
                                    </el-tooltip>
                                    发票抬头
                                </template>
                                <el-input v-model="form.legalEntityName" placeholder="例如：北京某某数字科技有限公司" clearable />
                            </el-form-item>
                        </el-col>

                        <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                            <el-form-item prop="taxCode">
                                <template #label>
                                    <el-tooltip content="18位统一社会信用代码，用于发票购买方纳税人识别号校验" placement="top">
                                        <el-icon class="iconsStyle"><InfoFilled /></el-icon>
                                    </el-tooltip>
                                    纳税人税号
                                </template>
                                <el-input v-model="form.taxCode" placeholder="例如：91110108MA01XXXXXX" clearable maxlength="20" />
                            </el-form-item>
                        </el-col>
                    </template>

                    <!-- 当前成员 -->
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24" v-if="form.organid && form.employees?.length">
                        <el-form-item prop="members" label="当前成员">
                            <el-table :data="form.employees" style="width: 100%; margin-bottom: 20px" border size="small">
                                <el-table-column prop="username" label="账号" />
                                <el-table-column prop="name" label="姓名" />
                                <el-table-column prop="email" label="邮箱" />
                            </el-table>
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
        </ProDialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, getCurrentInstance } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import useUserInfoStore from '@/stores/user';
import { storeToRefs } from 'pinia';

const { proxy } = getCurrentInstance();
const proTableRef = ref(null);
const dialogVisible = ref(false);
const userInfoStore = useUserInfoStore();

const columns = [
    { prop: 'organame', label: '组织名称', minWidth: 180 },
    { prop: 'orgcode', label: '组织编码', width: 140 },
    { prop: 'orgType', label: '类型', width: 120, align: 'center' },
    { prop: 'legalEntityName', label: '法定全称 (发票购买方抬头)', minWidth: 200 },
    { prop: 'taxCode', label: '统一社会信用代码 (税号)', minWidth: 200 },
    { prop: 'operation', label: '操作', width: 140, fixed: 'right', align: 'left' },
];

const handleAdd = () => {
    resetForm();
    dialogVisible.value = true;
};

const { userInfo } = storeToRefs(userInfoStore); // 响应式
const formLabelWidth = '110px';
const ruleFormRef = ref();

const formTemplate = {
    organame: '',
    parentId: 0,
    orgcode: '',
    orgType: 'dept',
    legalEntityName: '',
    taxCode: '',
};
const form = reactive({ ...formTemplate });

const rules = {
    organame: [{ required: true, message: '请输入组织名', trigger: 'blur' }],
    parentId: [{ required: false, message: '请选择上级组织', trigger: 'change' }],
    orgcode: [{ required: true, message: '请输入编码', trigger: 'blur' }],
    legalEntityName: [
        {
            validator: (rule, value, callback) => {
                if (form.orgType === 'company' && (!value || !value.trim())) {
                    return callback(new Error('法人公司必须填写发票抬头（法定全称）'));
                }
                callback();
            },
            trigger: 'blur',
        },
    ],
    taxCode: [
        {
            validator: (rule, value, callback) => {
                if (form.orgType === 'company') {
                    if (!value || !value.trim()) {
                        return callback(new Error('法人公司必须填写纳税人识别号'));
                    }
                    const clean = value.trim();
                    if (!/^[0-9A-HJ-NPQRTUWXY]{18}$/.test(clean)) {
                        return callback(new Error('请输入18位合规统一社会信用代码'));
                    }
                }
                callback();
            },
            trigger: 'blur',
        },
    ],
};

const treeData = ref(null);
const treeDatas = ref([]);
const defaultProps = { children: 'children', label: 'organame', value: 'organid' };

const handleClose = done => {
    done();
};
const handleUnitChange = val => {};

// 重置表单
const resetForm = () => {
    Object.assign(form, JSON.parse(JSON.stringify(formTemplate)));
    delete form.organid;
    delete form.employees;
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
};

const onSubmit = formEl => {
    formEl.validate(async valid => {
        if (!valid) {
            return false;
        }
        const submitData = { ...form };
        if (submitData.orgType !== 'company') {
            submitData.legalEntityName = submitData.legalEntityName || null;
            submitData.taxCode = submitData.taxCode || null;
        }
        if (submitData.taxCode) {
            submitData.taxCode = submitData.taxCode.trim();
        }
        if (submitData.legalEntityName) {
            submitData.legalEntityName = submitData.legalEntityName.trim();
        }

        if (form.organid) {
            // 更新组织
            proxy.$api.updateOrganization(submitData).then(res => {
                if (res.code == 200) {
                    proxy.$message.success(res.message);
                    dialogVisible.value = false;
                    proTableRef.value?.refresh();
                }
            });
        } else {
            // 新增组织
            if (submitData.parentId == 0) {
                submitData.parentId = '';
            }
            const data = await proxy.$api.addOrganization(submitData);
            if (data.code == 200) {
                dialogVisible.value = false;
                proxy.$message.success(data.message);
                proTableRef.value?.refresh();
            }
        }
    });
};

// 删除
const handleDelete = async row => {
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            type: 'warning',
        })
        .then(async () => {
            const data = await proxy.$api.deleteOrganization({ id: row });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                proTableRef.value?.refresh();
            }
        });
};

// 修改
const handleEdit = async row => {
    dialogVisible.value = true;
    resetForm();
    const data = await proxy.$api.detailOrganization({ id: row });
    Object.assign(form, {
        ...formTemplate,
        ...data.data,
        orgType: data.data.orgType || 'dept',
    });
    if (!data.data.parentId) {
        form.parentId = 0;
    }
};

// ProTable 数据请求驱动：拉取组织架构并同步树形下拉数据
const getOrganTableData = async () => {
    const res = await proxy.$api.getOrganizationList();
    const treedata = getParentMenuTree(res.data);
    treeDatas.value = treedata;
    treeData.value = res.data;
    return res;
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
</script>
<style scoped>
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

