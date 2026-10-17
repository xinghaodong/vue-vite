<template>
    <div class="menu-resource-container">
        <!-- 接入大厂级超级表格 ProTable (仅展开顶级菜单) -->
        <ProTable
            ref="proTableRef"
            title="菜单与权限资源管理"
            :columns="columns"
            :request-api="getMenuList"
            row-key="id"
            :pagination="false"
            :is-show-search="false"
            :border="true"
            :expand-row-keys="expandRowKeys"
        >
            <!-- 头部操作按钮区域 -->
            <template #tableHeader>
                <el-button v-has-permi="['menu:add']" type="primary" :icon="Plus" @click="add">
                    新增菜单
                </el-button>
                <el-button type="primary" plain :icon="Sort" @click="handleSort()">
                    一级资源排序
                </el-button>
                <span v-if="aimessage" class="ml-2 text-sm text-gray-500">{{ aimessage }}</span>
            </template>

            <!-- 操作列插槽 (使用具名插槽支持业务判断与权限指令，移除写死的 size 以联动全局尺寸) -->
            <template #operation="{ row }">
                <el-button
                    v-has-permi="['menu:add']"
                    v-if="row.id"
                    type="primary"
                    link
                    @click="handleEdit(row)"
                >
                    编辑
                </el-button>
                <el-button
                    v-has-permi="['menu:add']"
                    v-if="row.id"
                    type="danger"
                    link
                    @click="handleDelete(row.id)"
                >
                    删除
                </el-button>
                <el-button
                    link
                    type="primary"
                    v-show="row.children && row.id != 0"
                    @click.stop="handleSort(row.id)"
                >
                    子资源排序
                </el-button>
            </template>
        </ProTable>

        <el-dialog v-model="dialogVisible" :title="form.id ? '修改菜单' : '新增菜单'" width="650" :before-close="handleClose">
            <el-form :model="form" :label-width="formLabelWidth" :rules="rules" ref="ruleFormRef">
                <el-row>
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item label="菜单名称" prop="name">
                            <el-input v-model="form.name" autocomplete="off" />
                        </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item label="上级菜单" prop="parentId">
                            <el-tree-select
                                @change="val => handleUnitChange(val)"
                                v-model="form.parentId"
                                node-key="id"
                                :data="treeData"
                                :props="treeProps"
                                :default-expanded-keys="[0]"
                                check-strictly
                                :render-after-expand="false"
                                placeholder="请选择上级菜单"
                            />
                        </el-form-item>
                    </el-col>
                    <!-- <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="菜单地址" prop="url">
                        <el-input v-model="form.url" autocomplete="off" />
                    </el-form-item>
                </el-col> -->
                    <el-col :xs="12" :sm="12" :md="12" :lg="12" :xl="24">
                        <el-form-item label="资源类型" prop="menutype">
                            <el-radio v-model="form.menutype" label="1" border>菜单</el-radio>
                            <el-radio v-model="form.menutype" label="2" border>按钮</el-radio>
                        </el-form-item>
                    </el-col>
                    <el-col :xs="12" :sm="12" :md="12" :lg="12" :xl="24">
                        <el-form-item label="是否全屏" prop="isscreen">
                            <template #label>
                                <el-tooltip content="选择是的话打开此页面会去掉左侧菜单和头部，只展示该菜单内容" placement="top">
                                    <el-icon class="iconsStyle"><InfoFilled /></el-icon>
                                </el-tooltip>
                                是否全屏
                            </template>
                            <el-radio v-model="form.isscreen" label="2" border>是</el-radio>
                            <el-radio v-model="form.isscreen" label="1" border>否</el-radio>
                        </el-form-item>
                    </el-col>
                    <el-col :xs="12" :sm="12" :md="12" :lg="12" :xl="12">
                        <el-form-item label="资源序号" prop="sorts">
                            <el-input-number v-model="form.sorts" placeholder="请输入"></el-input-number>
                        </el-form-item>
                    </el-col>

                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item prop="code">
                            <template #label>
                                <el-tooltip content="资源的唯一编码，菜单的是组件名称" placement="top">
                                    <el-icon class="iconsStyle"><InfoFilled /></el-icon>
                                </el-tooltip>
                                资源编码
                            </template>
                            <el-input v-model="form.code" placeholder="请输入" clearable />
                        </el-form-item>
                    </el-col>
                    <!-- <el-col :xs="12" :sm="12" :md="12" :lg="12" :xl="12" v-show="form.menutype === 1">
                        <el-form-item label="是否外链" prop="outlink">
                            <el-radio v-model="form.outlink" :label="1" border>是</el-radio>
                            <el-radio v-model="form.outlink" :label="0" border>否</el-radio>
                        </el-form-item>
                    </el-col> -->
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item prop="">
                            <template #label>
                                <el-tooltip content="访问的路由地址，如：`/user`，如外网地址需内链访问则以`http(s)://`开头" placement="top">
                                    <el-icon class="iconsStyle"><InfoFilled /></el-icon>
                                </el-tooltip>
                                路由路径
                            </template>
                            <el-input v-model="form.url" placeholder="请输入"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item label="" prop="component">
                            <template #label>
                                <el-tooltip content="pages下组件位置 以/开头" placement="top">
                                    <el-icon class="iconsStyle"><InfoFilled /></el-icon>
                                </el-tooltip>
                                组件位置
                            </template>
                            <el-input v-model="form.component" placeholder="请输入"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item label="" prop="perms">
                            <template #label>
                                <el-tooltip content="权限唯一标识，如：`user:add`，模块名：功能名" placement="top">
                                    <el-icon class="iconsStyle"><InfoFilled /></el-icon>
                                </el-tooltip>
                                权限标识
                            </template>
                            <el-input v-model="form.perms" placeholder="请输入"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <!-- 角色 下拉多选 -->
                        <el-form-item label="资源角色" prop="roleIds">
                            <el-select v-model="form.roleIds" multiple placeholder="请选择">
                                <el-option v-for="item in roleList" :key="item.id" :label="item.name" :value="item.id" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <!-- <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item label="是否有效" prop="states">
                            <el-radio v-model="form.states" :label="1" border>是</el-radio>
                            <el-radio v-model="form.states" :label="0" border>否</el-radio>
                        </el-form-item>
                    </el-col> -->
                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item label="是否缓存" prop="keepalive">
                            <el-radio v-model="form.keepalive" :label="'1'" border>是</el-radio>
                            <el-radio v-model="form.keepalive" :label="'0'" border>否</el-radio>
                        </el-form-item>
                    </el-col>

                    <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                        <el-form-item label="菜单图标" prop="icon">
                            <el-col :span="22">
                                <el-popover
                                    ref="iconListPopover"
                                    :width="500"
                                    popper-class="mod-menu__icon-popover"
                                    placement="top-start"
                                    trigger="click"
                                    popper-style="height: 520px;"
                                    :visible="visible"
                                    @before-leave="handlePopoverClose"
                                >
                                    <div class="popover-title">请选择图标</div>
                                    <el-scrollbar style="height: 95%" wrap-style="overflow-x:hidden;">
                                        <div class="mod-menu__icon-list">
                                            <el-button
                                                v-for="(item, index) in iconList"
                                                :key="index"
                                                class="buttonP"
                                                style="font-size: 16px"
                                                @click="iconActiveHandle(item.value)"
                                                :class="{ 'is-active': item.value === form.icon }"
                                            >
                                                <el-icon>
                                                    <component :is="item.value" />
                                                </el-icon>
                                            </el-button>
                                        </div>
                                    </el-scrollbar>
                                    <template #reference>
                                        <el-input v-model="form.icon" @click="visible = true" :readonly="true" placeholder="请选择菜单图标">
                                            <template #prepend>
                                                <el-icon v-if="form.icon" class="tooltip-icon">
                                                    <component :is="form.icon" />
                                                </el-icon>
                                            </template>
                                        </el-input>
                                    </template>
                                </el-popover>
                            </el-col>
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

        <el-dialog title="资源排序" width="800px" v-model="dialogSortTree">
            <el-table :data="tableData" ref="sortTableRef" border style="width: 100%" row-key="id">
                <el-table-column prop="name" width="200px" label="名称"></el-table-column>
                <el-table-column prop="url" label="地址"></el-table-column>
                <el-table-column prop="code" label="code"></el-table-column>
                <el-table-column label="资源类型">
                    <template #default="{ row }">
                        <el-tag v-if="row.menutype == 1" type="success">菜单</el-tag>
                        <el-tag v-if="row.menutype == 2">按钮</el-tag>
                    </template>
                </el-table-column>
            </el-table>
            <template #footer>
                <el-button @click="dialogSortTree = false">取消</el-button>
                <el-button type="primary" @click="submitSort()">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
defineOptions({
    name: 'resourceManagement',
});
import { ref, reactive, onMounted, getCurrentInstance, onBeforeUnmount, nextTick } from 'vue';
import { Plus, Sort } from '@element-plus/icons-vue';
import useUserInfoStore from '@/stores/user'; //引入仓库
import { storeToRefs } from 'pinia'; //引入pinia转换
import Sortable from 'sortablejs';
const { proxy } = getCurrentInstance();
const dialogVisible = ref(false);
const userInfoStore = useUserInfoStore();

const { userInfo } = storeToRefs(userInfoStore); // 响应式
const proTableRef = ref(null);
const expandRowKeys = ref([]);
const sortTableRef = ref(null);
const aimessage = ref('');
const formLabelWidth = '100px';
const ruleFormRef = ref();

// ProTable 列配置
const columns = [
    {
        prop: 'name',
        label: '菜单名称',
        minWidth: 180,
        align: 'left'
    },
    {
        prop: 'url',
        label: '路由地址',
        minWidth: 160,
        align: 'left'
    },
    {
        prop: 'code',
        label: '资源编码',
        minWidth: 140,
        align: 'left'
    },
    {
        prop: 'component',
        label: '组件路径',
        minWidth: 180,
        align: 'left'
    },
    {
        prop: 'menutype',
        label: '资源类型',
        width: 100,
        align: 'center',
        // 动态通用组件 el-tag 声明式配置
        component: 'el-tag',
        props: (row) => ({
            type: row.menutype == 1 ? 'success' : 'primary',
            round: true
        }),
        formatter: (row) => (row.menutype == 1 ? '菜单' : row.menutype == 2 ? '按钮' : '--')
    },
    {
        prop: 'operation',
        label: '操作',
        width: 220,
        fixed: 'right',
        align: 'center'
    }
];
const treeProps = {
    children: 'children',
    label: 'name',
};
const rules = {
    name: [{ required: true, message: '请输入菜单名字', trigger: 'blur' }],
    parentId: [{ required: false, message: '请选择上级菜单', trigger: 'change' }],
    url: [{ required: false, message: '请输入菜单地址', trigger: 'blur' }],
    code: [{ required: true, message: '请输入菜单编码', trigger: 'blur' }],
    sorts: [{ required: true, message: '请输入菜单序号', trigger: 'blur' }],
    menutype: [{ required: true, message: '请选择菜单类型', trigger: 'blur' }],
};
const visible = ref(false);
const dialogSortTree = ref(false);
const tableData = ref([]);
// 示例的图标列表
const iconList = ref([]);

Object.keys(proxy.$icon).map(item => {
    iconList.value.push({
        value: item,
    });
});
const formTemplate = { name: '', parentId: 0, url: '', component: '', sorts: 1, keepalive: 1, icon: '', menutype: 1, perms: '', code: '', roleIds: [], isscreen: '1' };
let form = reactive({ ...formTemplate });
const treeData = ref(null);
const roleList = ref([]);
const handleClose = done => {
    done();
};

const dragSort = () => {
    console.log(sortTableRef.value.$el);
    const tableEl = sortTableRef.value.$el;
    const tbody = tableEl.querySelector('.el-table__body tbody');
    Sortable.create(tbody, {
        ghostClass: 'sortable-ghost',
        animation: 150,
        onEnd: event => {
            const { oldIndex, newIndex } = event;
            if (oldIndex === newIndex) return;
            // 移动数据
            const targetRow = tableData.value.splice(oldIndex, 1)[0];
            tableData.value.splice(newIndex, 0, targetRow);
        },
    });
};

const add = () => {
    dialogVisible.value = true;
    form = reactive(JSON.parse(JSON.stringify(formTemplate)));
    resetForm(ruleFormRef);
};
const handleUnitChange = val => {};
// 重置表单
const resetForm = () => {
    if (ruleFormRef.value) ruleFormRef.value.resetFields();
};
// 处理图标点击事件
const iconActiveHandle = iconValue => {
    visible.value = false; // 关闭弹出框
    form.icon = iconValue;
};

// 点击空白区域关闭弹出框
const handlePopoverClose = () => {
    visible.value = false;
};

// 检测点击空白区域
// 监听点击空白区域关闭弹出框
const handleClickOutside = event => {
    const popoverEl = document.querySelector('.mod-menu__icon-popover');
    if (popoverEl && !popoverEl.contains(event.target)) {
        visible.value = false; // 点击外部区域时关闭弹出框
    }
};

// 菜单排序保存
const submitSort = async () => {
    let arr = [];
    tableData.value.forEach(elem => {
        arr.push(elem.id);
    });
    let ids = arr;
    console.log(arr);
    const data = await proxy.$api.saveMenuSort(ids);
    if (data.code == 200) {
        proxy.$message.success(data.message);
        dialogSortTree.value = false;
        getTreeData();
    }
};

const handleSort = pid => {
    dialogSortTree.value = true;
    tableData.value = [];
    getSortData(pid);
};
const getSortData = async pid => {
    console.log(pid);
    const data = await proxy.$api.getMenusByPid({ pid });
    if (data.code == 200) {
        tableData.value = data.data;
        await nextTick(() => {
            setTimeout(() => {
                dragSort();
            }, 100);
        });
    }
};

const onSubmit = formEl => {
    formEl.validate(async valid => {
        if (!valid) {
            return false;
        }
        console.log(form);
        if (form.id) {
            // 更新菜单
            proxy.$api.updatemenu(form).then(res => {
                if (res.code == 200) {
                    proxy.$message.success(res.message);
                    dialogVisible.value = false;
                    getTreeData();
                }
            });
        } else {
            // 新增菜单
            if (form.parentId == 0) {
                form.parentId = '';
            }
            // return;
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
    // 弹框提示 校验
    proxy.$messageBox
        .confirm('确定要删除吗?', '提示', {
            type: '提示',
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
    dialogVisible.value = true;
    // 调用详情接口
    const data = await proxy.$api.detail({ id: row.id });
    Object.assign(form, data.data);
    if (!data.data.parentId) {
        form.parentId = 0;
    }
};

// 获取菜单树列表（透传给 ProTable 的 request-api）
const getMenuList = async () => {
    try {
        const res = await proxy.$api.menus();
        const list = res?.data || [];
        const treedata = getParentMenuTree(list);
        treeData.value = treedata; // 同步给新增/编辑弹窗中的 el-tree-select 使用

        // 在表格数据就绪并挂载后，精准展开顶级菜单（根节点）
        setTimeout(() => {
            expandRowKeys.value = [0, '0'];
            const rootNode = proTableRef.value?.tableData?.[0] || treedata[0];
            if (rootNode && proTableRef.value) {
                proTableRef.value.toggleRowExpansion(rootNode, true);
            }
        }, 100);

        return {
            data: {
                list: treedata,
                total: treedata.length
            }
        };
    } catch (error) {
        console.error('获取菜单树列表失败:', error);
        return {
            data: {
                list: [],
                total: 0
            }
        };
    }
};

// 获取/刷新菜单（兼容弹窗保存、删除、排序后的统一触发）
const getTreeData = async () => {
    if (proTableRef.value) {
        await proTableRef.value.getTableList();
    } else {
        const res = await proxy.$api.menus();
        treeData.value = getParentMenuTree(res?.data || []);
    }
};

const getParentMenuTree = tableTreeDdata => {
    let parent = {
        parentId: '',
        name: '顶级菜单',
        id: 0,
        children: tableTreeDdata,
    };
    return [parent];
};

onMounted(async () => {
    try {
        // 监听点击事件
        document.addEventListener('mousedown', handleClickOutside);
        // 加载角色下拉列表
        proxy.$api.getRolsList().then(res => {
            roleList.value = res.data;
        });
    } catch (error) {
        console.error('失败信息:', error);
    }
});
onBeforeUnmount(() => {
    document.removeEventListener('mousedown', handleClickOutside);
    // window.removeEventListener('onmessageWS', getSocketData);
    // proxy.$websocket.close();
});
</script>

<style scoped>
.menu-resource-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
}

:deep(.el-popper) {
    height: 500px !important;
}

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
