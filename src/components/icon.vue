<template>
    <el-tooltip class="tooltip" placement="top" effect="light">
        <template #content>
            <p>element 图标库</p>
            <p>
                进入
                <a href="https://element-plus-docs.bklab.cn/zh-CN/component/icon.html" target="_blank"> Element Icon </a>
                页面查看
            </p>
        </template>
        <el-icon class="tooltip-icon">
            <Warning />
        </el-icon>
    </el-tooltip>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'IconTemplate',
});
</script>

<style scoped>
.tooltip {
    padding: 10px;
}
.tooltip-icon {
    font-size: 16px; /* 确保图标大小一致 */
    vertical-align: middle; /* 使图标和文字对齐 */
    cursor: pointer; /* 鼠标悬浮变成手型，增强交互感 */
    height: inherit;
    padding-left: 3px;
}
</style>
