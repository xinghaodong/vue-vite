# ProDialog & ProDrawer 高定增强弹窗与抽屉容器

> **基于 Element Plus 原生二次封装，深度融合全局纯黑白 Design Tokens 设计变量**。
> 解决老旧弹窗“整个弹窗全屏加厚重遮罩、超长内容顶飞底部按钮、缺乏一键全屏、拖拽移动能力差”等核心痛点。

---

## 一、核心特性与交互亮点

1. **确定按钮局部 Loading 防连击（非整窗遮罩）**：
   - 用户提交时，**仅确定按钮自身进入旋转 Loading 状态**（`:loading="confirmLoading"`）；
   - **严禁**给整个弹窗添加遮罩，确保用户在提交时依然能清晰对照输入内容；
   - 提交期间取消按钮与关闭按钮自动 `disabled`，杜绝竞态与重复提交。
2. **三段式独立平滑内滚动（Header - Body - Footer）**：
   - Header 严格吸顶，Footer 严格吸底；
   - Body 内容区内置 `calc(80vh - 130px)` 自适应最大高度与 **6px 胶囊形极细滚动条**，超长表单或列表绝不会将底部操作按钮顶出屏幕视口。
3. **全屏最大化 / 窗口化平滑切换**：
   - 标题栏右侧内置全屏切换按钮，一键在视口全屏与紧凑窗口间流畅切换；
   - 支持通过 `v-model:fullscreen` 进行双向受控。
4. **原生自由拖拽（Draggable）**：
   - 默认开启窗口拖拽移动，全屏模式下自动锁定，兼具灵活与稳固。
5. **暗夜模式与 Design Tokens 深度契合**：
   - 100% 采用 `var(--el-bg-color-overlay)`、`var(--app-card-bg)`、`var(--el-border-color-lighter)`；
   - 亮色与暗色模式下均呈现精致微拟物投影与高光边框。

---

## 二、ProDialog 快速上手

### 1. 自动化异步防连击（推荐）

通过 `:on-confirm="asyncSubmit"` 传入异步函数，组件自动开启按钮 Loading，并在执行成功后自动关闭弹窗；若返回 `false` 则阻止关闭。

```vue
<template>
  <el-button type="primary" @click="visible = true">新建任务</el-button>

  <ProDialog
    v-model="visible"
    title="新建自动化建模任务"
    sub-title="支持 ZIP 压缩包上传并一键生成 3D Tiles"
    width="640px"
    confirm-text="提交并启动"
    :on-confirm="handleSubmit"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="任务名称" required>
        <el-input v-model="form.name" placeholder="请输入任务名称" />
      </el-form-item>
    </el-form>
  </ProDialog>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';

const visible = ref(false);
const form = reactive({ name: '' });

const handleSubmit = async () => {
  if (!form.name) {
    ElMessage.warning('请输入任务名称');
    return false; // 返回 false 阻止弹窗关闭
  }
  // 模拟异步请求：仅确定按钮自身转圈菊花！
  await api.saveTask(form);
  ElMessage.success('保存成功！');
  return true; // 自动关闭弹窗
};
</script>
```

### 2. 受控方式防连击

```vue
<ProDialog
  v-model="visible"
  title="编辑配置"
  :confirm-loading="submitting"
  @confirm="handleConfirm"
>
  <!-- 表单内容 -->
</ProDialog>
```

---

## 三、ProDrawer 高定抽屉

抽屉同样具备局部按键 Loading 防连击与全宽切换能力：

```vue
<template>
  <el-button @click="drawerVisible = true">查看节点拓扑</el-button>

  <ProDrawer
    v-model="drawerVisible"
    title="边缘计算节点详情"
    sub-title="IP: 192.168.10.128 · 在线"
    size="600px"
    confirm-text="保存拓扑"
    :on-confirm="handleSaveTopology"
  >
    <!-- 抽屉主体内容 (独立超细滚动条) -->
    <template #footer-left>
      <span style="font-size: 12px; color: #94a3b8;">● 探针链路正常</span>
    </template>
  </ProDrawer>
</template>
```

---

## 四、API 属性规范

### ProDialog 属性 (Props)

| 参数名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `v-model` | `Boolean` | `false` | 控制弹窗显示与隐藏 |
| `title` | `String` | `'提示'` | 弹窗主标题 (支持 `#title` 插槽) |
| `sub-title` | `String` | `''` | 弹窗副标题/业务编号说明文案 |
| `width` | `String \| Number` | `'680px'` | 弹窗宽度 (支持 `px`、`%`、`vw`) |
| `draggable` | `Boolean` | `true` | 是否支持拖拽移动 (全屏时自动禁用) |
| `align-center` | `Boolean` | `true` | 是否在视口垂直居中显示 |
| `show-fullscreen` | `Boolean` | `true` | 是否在顶栏显示全屏/窗口切换按钮 |
| `v-model:fullscreen` | `Boolean` | `false` | 受控全屏状态 |
| `max-height` | `String \| Number` | `'calc(80vh - 130px)'` | 内容区最大高度，超出产生微滚动 |
| `body-padding` | `String` | `'20px 24px'` | 内容区内边距 |
| `confirm-text` | `String` | `'确定'` | 确定按钮文字 |
| `cancel-text` | `String` | `'取消'` | 取消按钮文字 |
| `show-confirm` | `Boolean` | `true` | 是否展示确定按钮 |
| `show-cancel` | `Boolean` | `true` | 是否展示取消按钮 |
| `show-footer` | `Boolean` | `true` | 是否展示底部操作栏 |
| `confirm-loading` | `Boolean` | `false` | 受控确定按钮 Loading (仅按钮转圈) |
| `on-confirm` | `Function` | `null` | 异步确认回调，自动捕获 Loading |
| `destroy-on-close`| `Boolean` | `false` | 关闭时是否销毁内部 DOM |
| `sub-header-padding` | `String` | `'12px 20px'` | 次级顶栏 (sub-header) 内边距 |
| `sub-header-border` | `Boolean` | `true` | 次级顶栏是否展示底部下划线 |
| `sub-header-style` | `Object` | `{}` | 次级顶栏自定义样式对象 |
| `body-style` | `Object` | `{}` | 主体滚动容器自定义样式对象 |

### ProDrawer 属性 (Props)

| 参数名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `v-model` | `Boolean` | `false` | 控制抽屉显示与隐藏 |
| `title` | `String` | `'详情'` | 抽屉主标题 |
| `sub-title` | `String` | `''` | 抽屉副标题 |
| `size` | `String \| Number` | `'620px'` | 抽屉宽度，支持一键切换到 100% 全宽 |
| `show-fullscreen` | `Boolean` | `true` | 是否显示全宽扩展切换按钮 |
| `confirm-loading` | `Boolean` | `false` | 受控确定按钮 Loading (仅按钮转圈) |
| `on-confirm` | `Function` | `null` | 异步确认回调 |
| `sub-header-padding` | `String` | `'12px 20px'` | 次级顶栏 (sub-header) 内边距 |
| `sub-header-border` | `Boolean` | `true` | 次级顶栏是否展示底部下划线 |
| `sub-header-style` | `Object` | `{}` | 次级顶栏自定义样式对象 |
| `body-style` | `Object` | `{}` | 主体滚动容器自定义样式对象 |
| `body-padding` | `String` | `'20px 24px'` | 内容区内边距 |

### 插槽 (Slots)

| 插槽名 | 说明 |
| :--- | :--- |
| `#default` | 弹窗/抽屉的主体表单或展示内容 (位于独立内滚动视口) |
| `#header-prefix` | 顶栏左侧前缀，默认是一根品牌主色 accent 竖线 |
| `#title` | 自定义主标题区域 |
| `#header-actions` | 顶栏右侧自定义操作区 (位于全屏按钮左侧) |
| `#sub-header` | **次级吸顶固定区** (用于工具栏、Tab分段切换、过滤栏等，置于 Header 之下且绝不随 Body 滚动) |
| `#footer-left` | 底部操作栏左侧辅助信息区 (如状态说明、草稿保存提示) |
| `#footer-right` | 底部操作栏右侧按钮区 (默认取消与确定) |
