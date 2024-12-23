import { createApp } from 'vue';
import App from './App.vue';
import router from '@/router';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import axios from './utils/request';
import pinia from './stortes'; //引入
import websocket from '@/utils/webScoket';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

//引入中文文件
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
// import '@/assets/css/tailwind.css';
import 'uno.css';
const app = createApp(App);
app.config.globalProperties.$api = axios;
app.config.globalProperties.$websocket = websocket;
app.use(pinia).use(router).use(ElementPlus, { zIndex: 3000, size: 'default', locale: zhCn });
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}
app.mount('#app');
