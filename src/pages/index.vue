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
                >新增</el-button
            >
        </div>
        <!-- 生成一个菜单树表格 -->
        <el-table :data="treeData" style="width: 100%; margin-bottom: 20px" row-key="id" border :expand-row-keys="['0']">
            <el-table-column prop="name" label="菜单名" />
            <el-table-column prop="url" label="菜单名地址" />
            <el-table-column prop="code" label="code" />
            <el-table-column label="图标">
                <template #default="scope">
                    <el-icon class="tooltip-icon">
                        <component :is="scope.row.icon" />
                    </el-icon>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="140" align="left">
                <template #default="scope">
                    <el-button v-if="scope.row.id" link type="primary" size="small" @click="handleEdit(scope.row)">修改</el-button>
                    <el-button v-if="scope.row.id" link type="danger" size="small" @click="handleDelete(scope.row.id)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-dialog v-model="dialogVisible" :title="form.id ? '修改菜单' : '新增菜单'" width="800" :before-close="handleClose">
            <el-form :model="form" :label-width="formLabelWidth" :rules="rules" ref="ruleFormRef">
                <el-form-item label="菜单名称" prop="name">
                    <el-input v-model="form.name" autocomplete="off" />
                </el-form-item>
                <el-form-item label="上级菜单" prop="parentId">
                    <el-tree-select
                        @change="val => handleUnitChange(val)"
                        v-model="form.parentId"
                        node-key="id"
                        :data="treeData"
                        :props="treeProps"
                        check-strictly
                        :render-after-expand="false"
                        placeholder="请选择上级菜单"
                        :default-expanded-keys="[0]"
                        :default-expand-all="false"
                    />
                </el-form-item>
                <el-form-item label="菜单地址" prop="url">
                    <el-input v-model="form.url" autocomplete="off" />
                </el-form-item>
                <el-col :xs="12" :sm="12" :md="12" :lg="12" :xl="12">
                    <el-form-item label="资源序号" prop="sorts">
                        <el-input-number v-model="form.sorts" :min="0" :max="99999" placeholder="请输入" />
                    </el-form-item>
                </el-col>
                <el-col :xs="12" :sm="12" :md="12" :lg="12" :xl="12">
                    <el-form-item prop="code">
                        <template #label>
                            <el-tooltip content="资源的唯一编码,菜单的是组件名称" placement="top">
                                <el-icon class="tooltip-icon">
                                    <component is="questionFilled" />
                                </el-icon>
                            </el-tooltip>
                            资源编码
                        </template>
                        <el-input v-model="form.code" placeholder="请输入"></el-input>
                    </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="" prop="component">
                        <template #label>
                            <el-tooltip content="pages下组件位置 以/开头" placement="top">
                                <el-icon class="tooltip-icon">
                                    <component is="questionFilled" />
                                </el-icon>
                            </el-tooltip>
                            组件位置
                        </template>
                        <el-input v-model="form.component" placeholder="请输入"></el-input>
                    </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="是否缓存" prop="keepalive">
                        <el-radio v-model="form.keepalive" label="1" border>是</el-radio>
                        <el-radio v-model="form.keepalive" label="0" border>否</el-radio>
                    </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="菜单图标" prop="icon">
                        <el-col :span="22">
                            <el-popover width="583" ref="iconListPopover" popper-class="mod-menu__icon-popover" placement="bottom-start" trigger="click" v-model:visible="visible">
                                <template #default>
                                    <div class="popover-title">请选择图标</div>
                                    <el-scrollbar style="height: 95%" wrap-style="overflow-x:hidden;">
                                        <div class="mod-menu__icon-list">
                                            <el-button
                                                size="default"
                                                style="font-size: 16px"
                                                class="buttonP"
                                                v-for="(item, index) in iconList"
                                                :key="index"
                                                @click="iconActiveHandle(item.label)"
                                                :class="{ 'is-active': item.label === form.icon }"
                                            >
                                                <el-icon class="tooltip-icon">
                                                    <component :is="item.value" />
                                                </el-icon>
                                            </el-button>
                                        </div>
                                    </el-scrollbar>
                                </template>
                                <template #reference>
                                    <el-input v-model="form.icon" :readonly="true" placeholder="请选择菜单图标">
                                        <template #prepend>
                                            <el-icon class="tooltip-icon">
                                                <component :is="form.icon" />
                                            </el-icon>
                                        </template>
                                    </el-input>
                                </template>
                            </el-popover>
                        </el-col>
                        <el-col :span="2">
                            <FaIconTooltip />
                        </el-col>
                    </el-form-item>
                </el-col>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="(dialogVisible = false)">取消</el-button>
                    <el-button type="primary" @click="onSubmit(ruleFormRef)"> 确定 </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, getCurrentInstance, nextTick } from 'vue';
import { iconLists } from '@/assets/js/common';
import useUserInfoStore from '@/stortes/user'; //引入仓库
import { storeToRefs } from 'pinia'; //引入pinia转换
import FaIconTooltip from '@/components/icon.vue';
const { proxy } = getCurrentInstance();
const dialogVisible = ref(false);
const userInfoStore = useUserInfoStore();

const { userInfo } = storeToRefs(userInfoStore); // 响应式
const visible = ref(false);
const iconList = iconLists;
const formLabelWidth = '100px';
const ruleFormRef = ref();
const treeProps = {
    children: 'children',
    label: 'name',
};
const rules = {
    name: [{ required: true, message: '请输入菜单名字', trigger: 'blur' }],
    parentId: [{ required: false, message: '请选择上级菜单', trigger: 'change' }],
    url: [{ required: false, message: '请输入菜单地址', trigger: 'blur' }],
    code: [{ required: true, message: '请输入资源编码', trigger: 'blur' }],
    sorts: [{ required: true, message: '请输入菜单排序', trigger: 'blur' }],
};
const defaultRuleFormState = reactive({
    name: '',
    parentId: null,
    url: '',
    sorts: 0,
    code: '',
    icon: '',
    component: '',
});
let form = reactive({ ...defaultRuleFormState }); // 或者改为 ref

const treeData = ref(null);
const handleClose = done => {
    done();
};
const handleUnitChange = val => {
    console.log(val);
};
// 重置表单
const resetForm = () => {
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
    Object.assign(form, defaultRuleFormState); // 或者 ruleForm.value = { ...defaultRuleFormState };
};

// 图标选中
const iconActiveHandle = iconName => {
    form.icon = iconName;
    visible.value = false;
};

const onSubmit = formEl => {
    formEl.validate(async valid => {
        if (!valid) {
            return false;
        }
        if (form.id) {
            // 更新菜单
            let obj = { ...form };
            if (obj.parentId == '顶级菜单') {
                obj.parentId = null;
            }
            delete obj.children;
            proxy.$api.updatemenu(obj).then(res => {
                if (res.code == 200) {
                    proxy.$message.success(res.message);
                    dialogVisible.value = false;
                    getTreeData();
                }
            });
        } else {
            // 新增菜单
            if (form.parentId == 0) {
                form.parentId = null;
            }
            console.log(form, 5555);
            const data = await proxy.$api.addmenu(form);
            if (data.code == 200) {
                dialogVisible.value = false;
                proxy.$message.success(data.message);
                getTreeData();
            }
        }
    });
};
// 删除菜单
const handleDelete = async row => {
    // 二次弹框校验
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            type: 'warning',
        })
        .then(async () => {
            const data = await proxy.$api.deletemenu({ id: row });
            if (data.code == 200) {
                proxy.$message.success(data.message);
                getTreeData();
            }
        });
};
// 修改菜单
const handleEdit = async row => {
    const data = await proxy.$api.getmenu({ id: row.id });
    Object.assign(form, data.data);
    dialogVisible.value = true;
    if (!row.parentId) {
        form.parentId = '顶级菜单';
    }
};

// 获取菜单
const getTreeData = async () => {
    const res = await proxy.$api.menus();
    const treedata = getParentMenuTree(res.data);
    treeData.value = treedata;
};

const getParentMenuTree = tableTreeDdata => {
    let parent = {
        parentId: '',
        name: '顶级菜单',
        id: '0',
        children: tableTreeDdata,
    };
    return [parent];
};

onMounted(async () => {
    try {
        await getTreeData();
    } catch (error) {
        console.error('失败信息:', error);
    }
});
</script>
<style>
.mod-menu__icon-popover {
    width: 510px;
    height: 350px !important;
    overflow: hidden !important;
}
</style>
<style scoped>
.tooltip-icon {
    font-size: 16px; /* 确保图标大小一致 */
    vertical-align: middle; /* 使图标和文字对齐 */
    cursor: pointer; /* 鼠标悬浮变成手型，增强交互感 */
    height: inherit;
    padding-right: 3px;
}
.table_icon {
    font-size: 18px;
    cursor: pointer;
}

.table_icon + .table_icon {
    margin-left: 8px;
}

.buttonP {
    margin-left: 10px !important;
    margin-bottom: 10px !important;
}

.mod-menu__icon-list {
    overflow: auto;
    height: 100%;
}
.buttonP.is-active {
    background-color: #409eff;
    color: white;
}

.popover-title {
    margin-bottom: 12px;
    font-size: 14px;
    padding-left: 9px;
    color: #303133;
}
</style>
