<!-- 
  ========================================================================
  标签页纯净容器: TabsContainer.vue
  职责: 仅负责 Element Tabs 选项卡排版，并将各个 Tab 分页渲染为具名插槽
  ========================================================================
-->
<template>
    <div class="container-tabs-wrapper">
        <el-tabs
            v-model="activeTab"
            :type="propsData.tabType === 'default' ? '' : (propsData.tabType || 'border-card')"
            :tab-position="propsData.tabPosition || 'top'"
            @tab-click="handleTabClick"
        >
            <el-tab-pane
                v-for="pane in propsData.panes || []"
                :key="pane.slot"
                :label="pane.label"
                :name="pane.slot"
            >
                <div class="tab-slot-content">
                    <slot :name="pane.slot" />
                </div>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    propsData: {
        type: Object,
        required: true,
    },
});

const activeTab = ref(
    props.propsData.activeTab || props.propsData.panes?.[0]?.slot || ''
);

// 监听外界配置中的 activeTab 变更
watch(
    () => props.propsData.activeTab,
    val => {
        if (val && val !== activeTab.value) {
            activeTab.value = val;
        }
    }
);

// 监听内部激活 Tab 变更，双向同步回写 propsData.activeTab
watch(
    () => activeTab.value,
    newVal => {
        if (newVal && props.propsData && props.propsData.activeTab !== newVal) {
            props.propsData.activeTab = newVal;
        }
    }
);

// 监听 panes 列表变动，若当前激活项被删除则平滑回退
watch(
    () => props.propsData.panes,
    panes => {
        if (Array.isArray(panes) && panes.length > 0) {
            if (!panes.some(p => p.slot === activeTab.value)) {
                activeTab.value = panes[0].slot;
            }
        }
    },
    { deep: true }
);

// 安全的 Tab 点击事件处理器（兼容 Element Plus 参数签名 (pane, ev)）
const handleTabClick = pane => {
    if (pane?.paneName) {
        activeTab.value = pane.paneName;
    }
};
</script>

<style scoped>
.container-tabs-wrapper {
    width: 100%;
}
.tab-slot-content {
    min-height: 48px;
    padding: 4px 0;
}
</style>
