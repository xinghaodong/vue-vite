<!-- 
  ========================================================================
  文件名称: TabsSetting.vue
  所属模块: 表单设计器物料配置中心 (widgets/settings)
  适用组件: 标签页容器 (tabs)
  功能说明:
    提供标签页容器的专属属性配置界面，包括：
    1. 风格类型 (tabType)：常规 (default) / 卡片化 (card) / 边框卡片 (border-card)；
    2. 标签位置 (tabPosition)：顶部 (top) / 底部 (bottom) / 左侧 (left) / 右侧 (right)；
    3. 标签页列表管理：动态新增、删除、重命名标签页项。
  ========================================================================
-->
<template>
    <div class="setting-group">
        <el-form-item label="风格类型">
            <el-radio-group v-model="propsData.tabType" size="small">
                <el-radio-button label="border-card">边框卡片</el-radio-button>
                <el-radio-button label="card">选项卡</el-radio-button>
                <el-radio-button label="default">下划线</el-radio-button>
            </el-radio-group>
        </el-form-item>

        <el-form-item label="标签位置">
            <el-radio-group v-model="propsData.tabPosition" size="small">
                <el-radio-button label="top">顶部</el-radio-button>
                <el-radio-button label="bottom">底部</el-radio-button>
                <el-radio-button label="left">左侧</el-radio-button>
                <el-radio-button label="right">右侧</el-radio-button>
            </el-radio-group>
        </el-form-item>

        <el-form-item label="标签页管理">
            <div class="pane-list-wrapper">
                <div v-for="(pane, idx) in propsData.panes" :key="idx" class="pane-item-box">
                    <div class="pane-header">
                        <span class="pane-index-tag">第 {{ idx + 1 }} 页</span>
                        <div class="header-actions">
                            <el-tag
                                v-if="propsData.activeTab === pane.slot"
                                size="small"
                                type="success"
                                effect="light"
                                style="margin-right: 6px; cursor: default"
                            >
                                当前激活
                            </el-tag>
                            <el-button
                                v-else
                                size="small"
                                type="primary"
                                link
                                style="margin-right: 6px"
                                @click="propsData.activeTab = pane.slot"
                            >
                                设为激活
                            </el-button>
                            <el-button
                                v-if="propsData.panes.length > 1"
                                type="danger"
                                size="small"
                                circle
                                title="删除此标签页"
                                @click="removePane(idx)"
                            >
                                <el-icon><Delete /></el-icon>
                            </el-button>
                        </div>
                    </div>
                    <div class="pane-name-row">
                        <el-input
                            v-model="pane.label"
                            placeholder="标签名称"
                            size="small"
                            clearable
                        />
                    </div>
                </div>

                <el-button
                    type="primary"
                    size="small"
                    plain
                    style="width: 100%; margin-top: 8px"
                    @click="addPane"
                >
                    + 添加标签页
                </el-button>
            </div>
        </el-form-item>
    </div>
</template>

<script setup>
import { Delete } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
    propsData: {
        type: Object,
        required: true,
    },
    element: {
        type: Object,
        default: () => ({}),
    },
});

const addPane = () => {
    if (!Array.isArray(props.propsData.panes)) {
        props.propsData.panes = [];
    }
    const nextIdx = props.propsData.panes.length + 1;
    const slotKey = `tab_${Date.now()}`;
    props.propsData.panes.push({
        label: `标签 ${nextIdx}`,
        slot: slotKey,
    });
    if (props.element.slots) {
        props.element.slots[slotKey] = [];
    }
    if (!props.propsData.activeTab) {
        props.propsData.activeTab = slotKey;
    }
    ElMessage.success('已新增标签页');
};

const removePane = idx => {
    const [deleted] = props.propsData.panes.splice(idx, 1);
    if (props.element.slots && deleted?.slot) {
        delete props.element.slots[deleted.slot];
    }
    if (props.propsData.activeTab === deleted?.slot && props.propsData.panes.length > 0) {
        props.propsData.activeTab = props.propsData.panes[0].slot;
    }
    ElMessage.info('已移除标签页');
};
</script>

<style scoped>
/* ========================================================================
 * 🎨 标签页栏目项：Design Tokens 规范重构
 * 彻底消除硬编码 Hex 颜色，自动响应全局暗黑/亮色主题切换
 * ======================================================================== */
.setting-group {
    width: 100%;
}
.pane-list-wrapper {
    width: 100%;
}
.pane-item-box {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 8px;
    transition: background-color 0.3s ease, border-color 0.3s ease;
}
.pane-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}
.header-actions {
    display: flex;
    align-items: center;
}
.pane-index-tag {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-color-primary);
}
.pane-name-row {
    width: 100%;
}
</style>
