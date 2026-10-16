# ProTable 超级表格组件系统

> **面向现代中后台的业务开发提效核心中枢**  
> 基于 Vue 3 + Element Plus，集成数据驱动管线、动态响应式搜索表单（SearchForm）、树形无限级递归、大厂效能工具箱以及视口自适应内部滚动。

---

## 🌟 核心特性与架构优势

相比传统 1300+ 行的单体 `CommonList.vue`，新的 `ProTable` 采用**微内核 + 组合式解耦架构**：

1. **Schema 驱动一体化（Single Source of Truth）**：
   - 彻底告别“表单配一遍、表格列再配一遍”的冗余；
   - 在 `columns` 中仅需声明 `search: { ... }` 即可自动派生顶部搜索项，支持按需声明（不配 `search` 则作为纯表格列）。
2. **视口 100% 自适应撑满 + 内部丝滑微滚动**：
   - 顶部搜索栏静止置顶，无论向下滚动多少行数据，查询条件随时可见可操作；
   - 表格表头自动原生吸顶，分页器始终牢牢常驻在屏幕最下方；
   - 消除页面整体双滚动条与跳动，具有桌面级 App 的专业质感。
3. **智能断点响应式栅格系统**：
   - 大屏/宽屏（≥1200px，如 1707px、1080P/1440P）单项占 6 栅格（一行 4 列）；
   - **收起状态下**：前 3 个查询条件 + 1 个操作按钮组 = 刚好 24 格占满第一行，按钮精准停留在第一行末尾；
   - **展开状态下**：多项流式铺开，按钮自动计算 `offset` 偏移补齐空格，吸附在最后一行最右侧。
4. **100% 零损属性透传（Transparent Forwarding）**：
   - 采用 `inheritAttrs: false` 配合 `<el-table v-bind="$attrs">`；
   - 原生 40+ 个属性（树形 `row-key`、`tree-props`、`lazy`、`load`、单元格合并 `span-method`）和方法无缝可用。
5. **纯黑白 Design Tokens 自适应**：
   - 零硬编码 Hex 色值，严格基于 `--el-bg-color-*`、`--el-text-color-*` 和 `--el-fill-color-*`；
   - 亮色与暗黑模式无缝平滑自适应。
6. **大厂效能工具箱（Toolbar）**：
   - **局部无感刷新**：保留当前页码与筛选状态重载数据；
   - **表格密度行高调节**：宽松（16px）、默认（10px）、紧凑（3px，一屏容纳翻倍数据）；
   - **列设置抽屉**：任意勾选列的显隐；
   - **一键全屏**。

---

## 📂 模块拓扑结构

```
src/
├── composables/
│   └── useTable.js              # 核心 Hook：托管网络请求、分页状态、搜索重置、选中项
├── components/
│   ├── SearchForm/              # 动态高级搜索表单
│   │   ├── index.vue            # 响应式断点、展开收起与末尾吸附调度
│   │   └── components/
│   │       └── SearchFormItem.vue # 控件动态渲染器 (Input/Select/Date/Cascader 等)
│   └── ProTable/                # 超级表格主容器
│       ├── index.vue            # $attrs 透传、视口高度传导、组件集成
│       └── components/
│           ├── TableColumn.vue  # 递归表头列（多级嵌套、树形、字典胶囊、Render/Slot）
│           ├── TableHeader.vue  # 操作栏与工具箱 (刷新、密度调节、列设置、全屏)
│           ├── ColSetting.vue   # 列显隐配置抽屉
│           └── Pagination.vue   # 纯黑白扁平分页器
```

---

## 🚀 快速上手

### 1. 基础示例

```vue
<template>
    <div class="page-container">
        <ProTable
            ref="proTableRef"
            title="用户列表"
            :columns="columns"
            :request-api="getUserList"
            row-key="id"
            :tree-props="{ children: 'children' }"
        >
            <!-- 头部操作按钮区域 -->
            <template #tableHeader="{ selectedListIds }">
                <el-button type="primary" :icon="Plus" @click="handleAdd">新建</el-button>
                <el-button
                    type="danger"
                    plain
                    :icon="Delete"
                    :disabled="!selectedListIds.length"
                    @click="handleBatchDelete(selectedListIds)"
                >
                    批量删除
                </el-button>
            </template>

            <!-- 自定义单元格插槽 -->
            <template #username="{ row }">
                <el-tag>{{ row.username }}</el-tag>
            </template>

            <!-- 操作列插槽 -->
            <template #operation="{ row }">
                <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            </template>
        </ProTable>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';

const proTableRef = ref(null);

const columns = [
    { type: 'selection', fixed: 'left', width: 50 },
    { type: 'index', label: '#', width: 60, align: 'center' },
    {
        prop: 'username',
        label: '用户姓名',
        minWidth: 160,
        search: { el: 'input', order: 1, props: { placeholder: '请输入姓名' } }
    },
    {
        prop: 'gender',
        label: '性别',
        width: 100,
        align: 'center',
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
        minWidth: 140
        // 不配置 search，则作为纯表格展示列，不会在顶部搜索栏出现
    },
    {
        prop: 'status',
        label: '状态',
        width: 100,
        align: 'center',
        enum: [
            { label: '启用', value: 1, tagType: 'success' },
            { label: '禁用', value: 0, tagType: 'info' }
        ],
        tag: true,
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
        prop: 'operation',
        label: '操作',
        width: 120,
        fixed: 'right',
        align: 'center'
    }
];

// 接口函数：接收分页和查询参数，返回 { list, total }
const getUserList = async (params) => {
    // const res = await api.getUserList(params);
    // return { list: res.data.list, total: res.data.total };
};
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
</style>
```

---

## ⚙️ ProTable 属性说明 (Props)

| 参数名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| **`columns`** | `Array<ColumnProps>` | `[]` | **（必填）** 表格与搜索项列配置规则列表 |
| **`requestApi`** | `Function(params): Promise` | `null` | 表格数据请求函数，入参自动携带分页与搜索条件 |
| **`data`** | `Array` | `null` | 纯受控静态展示数据（传入时不走自动接口拉取） |
| **`initParam`** | `Object` | `{}` | 固定的初始静态查询参数（重置时不会清空） |
| **`title`** | `String` | `''` | 表格左上方标题名称 |
| **`pagination`** | `Boolean` | `true` | 是否启用底部分页器 |
| **`autoHeight`** | `Boolean` | `true` | 是否自动吃满视口剩余高度、内部微滚动并保持表头吸顶 |
| **`isShowSearch`** | `Boolean` | `true` | 是否显示顶部搜索表单 |
| **`searchDefaultCount`** | `Number` | `3` | 搜索表单折叠状态下默认展示的项数（配合按钮占满首行） |
| **`showHeader`** | `Boolean` | `true` | 是否显示表格上方的操作工具栏 |
| **`border`** | `Boolean` | `true` | 表格是否带有纵向边框 |
| **`stripe`** | `Boolean` | `false` | 是否开启斑马纹交替底色 |
| **`pageSizes`** | `Array<Number>` | `[10, 20, 50, 100]` | 分页条数规格选项列表 |
| **`dataCallBack`** | `Function(res): { list, total }` | `null` | 接口响应数据清洗加工钩子 |
| **`...$attrs`** | `Any` | `--` | 原生 `el-table` 的全部 40+ 属性（如 `row-key`, `tree-props`）透明透传 |

---

## 📋 列配置规则 (ColumnProps)

```typescript
interface ColumnProps {
    prop?: string;             // 字段属性名
    label?: string;            // 列标题
    width?: number | string;   // 固定列宽
    minWidth?: number | string;// 最小列宽
    fixed?: 'left' | 'right';  // 列固定位置
    sortable?: boolean | 'custom'; // 排序
    isShow?: boolean;          // 是否在表格中展示（设为 false 则只查不显）
    component?: string | Component | ((row: any) => string | Component); // 动态渲染组件（如 'el-link' / 'el-tag' / 自定义组件）
    props?: Record<string, any> | ((row: any, index: number) => Record<string, any>); // 动态组件的属性
    events?: Record<string, Function> | ((row: any, index: number) => Record<string, Function>); // 动态组件的事件监听
    formatter?: (row: any, column?: any, cellValue?: any, index?: number) => any; // 纯文本或动态组件内容格式化函数
    search?: SearchProps;      // 搜索项配置（不配则为纯展示列）
    children?: ColumnProps[];  // 多级表头嵌套子列
    render?: (scope: any) => any; // 自定义 JSX / render 函数兜底
}

interface SearchProps {
    el: 'input' | 'select' | 'date' | 'cascader' | 'tree-select' | 'switch'; // 控件类型
    key?: string;              // 提交给后端的重命名字段（默认使用 prop）
    order?: number;            // 搜索项排列顺序（越小越靠前）
    defaultValue?: any;        // 搜索初始默认值
    props?: Record<string, any>; // 透传给底层组件的属性（如 placeholder, clearable, options 等）
}
```

---

## 🎯 常见场景最佳实践

### 1. 只查不显（仅用于搜索，不在表格展示列）
```javascript
{
    prop: 'dateRange',
    label: '时间范围',
    isShow: false, // 👈 隐藏表格列
    search: {
        el: 'date',
        props: { type: 'daterange' }
    }
}
```

### 2. 多级表头 / 复杂嵌套树形
```javascript
{
    label: '配送信息',
    children: [
        { prop: 'province', label: '省份' },
        { prop: 'city', label: '城市' }
    ]
}
```

### 3. 父组件主动调用 Ref 方法
```javascript
const proTableRef = ref(null);

// 局部无感刷新当前页数据
proTableRef.value.refresh();

// 重置到第 1 页并刷新
proTableRef.value.search();

// 清空当前选中项
proTableRef.value.clearSelection();

// 获取原生 el-table 实例
const elTableInstance = proTableRef.value.element;
```
