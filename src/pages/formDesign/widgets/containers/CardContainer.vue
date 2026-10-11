<!-- 
  ========================================================================
  分组卡片纯净容器: CardContainer.vue
  职责: 仅负责 Element Card 卡片排版，并将内部内容区渲染为默认插槽
  ========================================================================
-->
<template>
    <el-card
        :shadow="propsData.shadow || 'always'"
        :class="{ 'is-borderless': propsData.bordered === false }"
        class="container-card-box"
    >
        <template #header v-if="propsData.title">
            <div class="card-header-bar">
                <span class="card-title-text">{{ propsData.title }}</span>
            </div>
        </template>
        <div class="card-slot-content">
            <slot name="default" />
        </div>
    </el-card>
</template>

<script setup>
defineProps({
    propsData: {
        type: Object,
        required: true,
    },
});
</script>

<style scoped>
.container-card-box {
    width: 100%;
}
.container-card-box.is-borderless {
    border: none;
    box-shadow: none;
}
.card-title-text {
    font-size: 14px;
    font-weight: 600;
    color: #334155;
}
.card-slot-content {
    min-height: 48px;
}
</style>
