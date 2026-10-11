<!-- 
  ========================================================================
  栅格排版纯净容器: GridContainer.vue
  职责: 仅负责 Element Row / Col 栅格布局排版，并将各栏渲染为具名插槽
  ========================================================================
-->
<template>
    <el-row :gutter="propsData.gutter || 0" class="container-grid-row">
        <el-col
            v-for="col in propsData.columns || []"
            :key="col.slot"
            :span="col.span"
            class="container-grid-col"
        >
            <div class="col-slot-box">
                <slot :name="col.slot" />
            </div>
        </el-col>
    </el-row>
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
.container-grid-row {
    width: 100%;
}
.container-grid-col {
    min-height: 48px;
}
.col-slot-box {
    width: 100%;
    min-height: 100%;
}
</style>
