import { createApp } from 'vue';
import App from './App.vue';
import router from '@/router';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import axios from './utils/request';
import pinia from './stores/index.js'; //引入
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn'; // 引入中文语言包
import { checkPermissions } from './utils/permissions';
import hasPermi from './directives/hasPermi'; // 引入自定义指令
// import '@/assets/css/tailwind.css';
// import 'highlight.js/styles/github.css';
import '@/assets/css/tailwind.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import '@/assets/css/dark/css-vars.css';
import '@/assets/css/theme-transition.css';

import MyInputNumber from 'element-plus-input-number-thousands';
// import { enableKatex, enableMermaid } from 'markstream-vue';

import ProTable from '@/components/ProTable/index.vue';
import ProDialog from '@/components/ProDialog/index.vue';
import ProDrawer from '@/components/ProDrawer/index.vue';

const app = createApp(App);
app.config.globalProperties.$api = axios;
app.config.globalProperties.$icon = ElementPlusIconsVue;
// 引入权限校验方法
app.config.globalProperties.$checkPermissions = checkPermissions;
// 注册全局指令 v-has-permi
app.directive('has-permi', hasPermi);
// size: 'small',
app.component('MyInputNumber', MyInputNumber);
app.component('ProTable', ProTable);
app.component('ProDialog', ProDialog);
app.component('ProDrawer', ProDrawer);
app.use(pinia).use(router).use(ElementPlus, { locale: zhCn, zIndex: 3000 });
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}
app.mount('#app');
