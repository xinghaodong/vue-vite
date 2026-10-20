<template>
    <el-config-provider :locale="zhCn" :size="componentSize">
        <div id="app">
            <router-view></router-view>
            <!-- 聊天机器人 -->
            <div style="position: absolute; bottom: 0; right: 0" @click="jq">机器人</div>
            <el-drawer v-model="drawer" title="AI" :destroy-on-close="true" class="drawer1" @close="hclose" :with-header="false">
                <!-- 嵌入子应用  -->
                <div v-if="drawer">
                    <!-- 参数 alive 保活子应用 -->
                    <WujieVue
                        v-if="drawer"
                        name="ai-chat-drawer"
                        :url="VITE_WUJIE_AI_URL"
                        :sync="true"
                        :alive="true"
                        :props="microProps"
                        style="width: 100%; height: 100%; border: none"
                    />
                </div>
            </el-drawer>
        </div>
    </el-config-provider>
</template>
<script setup>
import WujieVue from 'wujie-vue3';
import { ref, watch, computed } from 'vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import useLayoutStore from '@/stores/layout.js';
import { initTheme } from '@/composables/useTheme';

// 应用首屏初始化主题与主色色阶
initTheme();

const layoutStore = useLayoutStore();
const componentSize = computed(() => layoutStore.componentSize);
const { VITE_WUJIE_AI_URL } = import.meta.env;
const drawer = ref(false);
defineProps({
    name: String,
    url: String,
});
const hclose = () => {};

// 向子应用传递数据（如 token、用户信息）
const microProps = {
    token: sessionStorage.getItem('token') || '',
    refreshToken: sessionStorage.getItem('refreshToken') || '',
    userInfo: sessionStorage.getItem('piniaStore') || '',
};
const jq = () => {
    console.log('[ai-drawer] open', {
        drawerBefore: drawer.value,
        microProps,
    });
    drawer.value = true;
    console.log('[ai-drawer] opened', { drawerAfter: drawer.value });
};
</script>

<style>
.drawer1 {
    width: 60% !important;
    padding: 0 !important;
}
.el-drawer__body {
    padding: 0 !important;
}
html,
body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
}

#app {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
}
.mb-4 {
    margin-bottom: 16px;
}
.table {
    display: block !important;
}
/* ========================================================================
 * 🌟 NProgress 路由加载进度条：全量联动系统品牌色 (无论暗黑还是换色盘)
 * ======================================================================== */
#nprogress .bar {
    background: var(--el-color-primary) !important;
    height: 2.5px !important;
    z-index: 99999 !important;
}

#nprogress .peg {
    box-shadow: 0 0 10px var(--el-color-primary), 0 0 5px var(--el-color-primary) !important;
}

#nprogress .spinner-icon {
    border-top-color: var(--el-color-primary) !important;
    border-left-color: var(--el-color-primary) !important;
}
</style>
