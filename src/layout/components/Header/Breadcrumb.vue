<!-- 
  ========================================================================
  文件名称: Breadcrumb.vue
  所属模块: 顶栏系统 (src/layout/components/Header)
  功能说明:
    动态面包屑导航组件：
    1. 自动监听 route.matched 提取路由标题与层级；
    2. 支持路由无缝跳转与首页面包屑自动常驻；
    3. 配备优雅的面包屑淡入淡出过渡动效。
  ========================================================================
-->
<template>
    <el-breadcrumb class="app-breadcrumb" separator="/">
        <transition-group name="breadcrumb">
            <el-breadcrumb-item
                v-for="(item, index) in breadcrumbs"
                :key="item.path || index"
            >
                <!-- 最后一级为当前页，不可点击 -->
                <span
                    v-if="index === breadcrumbs.length - 1 || !item.redirect"
                    class="no-redirect"
                >
                    {{ item.meta?.title || item.name }}
                </span>
                <a
                    v-else
                    class="redirect-link"
                    @click.prevent="handleLink(item)"
                >
                    {{ item.meta?.title || item.name }}
                </a>
            </el-breadcrumb-item>
        </transition-group>
    </el-breadcrumb>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const breadcrumbs = ref([]);

const getBreadcrumbs = () => {
    // 过滤出含有 meta.title 的匹配路由项
    let matched = route.matched.filter(item => item.meta && item.meta.title);
    
    // 如果首项不是首页，自动补充首页作为首级锚点
    const first = matched[0];
    if (first && first.path !== '/index' && first.path !== '/home') {
        matched = [{ path: '/index', meta: { title: '首页' } }].concat(matched);
    }
    
    breadcrumbs.value = matched;
};

const handleLink = (item) => {
    if (item.redirect) {
        router.push(item.redirect);
    } else {
        router.push(item.path);
    }
};

watch(
    () => route.path,
    () => {
        getBreadcrumbs();
    }
);

onMounted(() => {
    getBreadcrumbs();
});
</script>

<style scoped>
.app-breadcrumb {
    display: inline-flex;
    align-items: center;
    font-size: 14px;
    line-height: 50px;
    margin-left: 14px;
}

.no-redirect {
    color: var(--el-text-color-regular);
    cursor: text;
    font-weight: 500;
}

.redirect-link {
    color: var(--el-text-color-secondary);
    font-weight: 400;
    cursor: pointer;
    transition: color 0.2s ease;
}

.redirect-link:hover {
    color: var(--el-color-primary);
}

/* 面包屑动画 */
.breadcrumb-enter-active,
.breadcrumb-leave-active {
    transition: all 0.3s;
}

.breadcrumb-enter-from,
.breadcrumb-leave-to {
    opacity: 0;
    transform: translateX(15px);
}
</style>
