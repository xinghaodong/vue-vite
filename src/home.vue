<!-- 
  ========================================================================
  文件名称: home.vue
  所属模块: 顶级路由布局总装配
  功能说明:
    已全面解耦重构至 src/layout/ 模块化分层系统：
    - 侧边栏: src/layout/components/Sidebar
    - 顶栏: src/layout/components/Header
    - 多标签栏: src/layout/components/Tabs
    - 内容区: src/layout/components/Main
    本文件作为顶级路由代理入口，保持架构清晰、职责专一。
  ========================================================================
-->
<template>
    <Layout />
</template>

<script setup>
import Layout from '@/layout/index.vue';
</script>
