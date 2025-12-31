<template>
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
</template>
<script setup>
import WujieVue from 'wujie-vue3';
import { ref, watch } from 'vue';
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
    drawer.value = true;
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
body,
#app {
    margin: 0;
    padding: 0;
    height: 100%;
    position: relative;
}

#app {
    width: 100%;
}
.mb-4 {
    margin-bottom: 16px;
}
.table {
    display: block !important;
}
/*#nprogress .bar {
    background-color: red !important;
}*/
</style>
