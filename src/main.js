import { createApp } from 'vue';
import App from './App.vue';
import router from '@/router';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import axios from './utils/request';
import pinia from './stortes'; //引入
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn'; // 引入中文语言包
// import '@/assets/css/tailwind.css';
import 'uno.css';
const app = createApp(App);
app.config.globalProperties.$api = axios;
app.config.globalProperties.$icon = ElementPlusIconsVue;
// size: 'small',
app.use(pinia).use(router).use(ElementPlus, { locale: zhCn, zIndex: 3000 });
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}
app.mount('#app');
