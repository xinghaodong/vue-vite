<template>
    <el-container class="main" :class="{ 'dark-mode': isDarkMode }">
        <el-aside :style="{ width: isCollapse ? '64px' : '200px' }" class="el-aside">
            <el-menu router :default-active="route.fullPath" @select="handleSelect" :collapse="isCollapse">
                <MenuItem v-for="(item, index) in userData" :key="index" :item="item" :isCollapse="isCollapse" />
            </el-menu>
        </el-aside>
        <el-container>
            <el-header style="text-align: right; font-size: 12px; height: 90px; padding: 0px">
                <div class="top">
                    <div class="flex flex-row items-center">
                        <!-- 点击 折叠   -->
                        <el-icon style="display: block; font-size: 24px; cursor: pointer" @click="foldEvent"><Fold /></el-icon>
                    </div>
                    <div class="flex items-center gap-5">
                        <!-- 主题切换按钮 -->
                        <el-icon class="theme-switch" style="font-size: 28px; cursor: pointer" @click="toggleDarkMode">
                            <Moon v-if="isDarkMode" />
                            <Sunny v-else />
                        </el-icon>
                        <el-dropdown trigger="click" @command="handleContextOut">
                            <div style="cursor: pointer">
                                <span class="absolute -inset-1.5"></span>
                                <span class="sr-only">Open user menu</span>
                                <img class="h-9 w-9 rounded-full" style="object-fit: cover;cu" :src="`${proxy.$api.img_url}${userInfo.avatar?.filePath}`" alt="" />
                            </div>
                            <template #dropdown>
                                <el-dropdown-menu>
                                    <el-dropdown-item command="contextout">退出登录</el-dropdown-item>
                                </el-dropdown-menu>
                            </template>
                        </el-dropdown>
                    </div>
                </div>
                <!-- tab-click 事件名字 -->
                <el-tabs @contextmenu.prevent="handleContextMenu($event)" v-model="editableTabsValue" type="card" @tab-click="handleClick" @tab-remove="removeTab">
                    <el-tab-pane :closable="item.url == activeTabArray[0].url ? false : true" v-for="item in activeTabArray" :label="item.name" :key="item.url" :name="item.url">
                    </el-tab-pane>
                </el-tabs>
            </el-header>
            <el-main>
                <!-- <transition name="sidebarLogoFade" mode="out-in"> -->
                <router-view v-if="isShowRouter"> </router-view>
                <!-- </transition> -->
            </el-main>
        </el-container>
        <ul v-if="contextMenuVisible" :style="{ left: left + 'px', top: top + 'px' }" class="contextmenu">
            <!-- 右键点击的不是当当前路由将他隐藏 -->
            <li v-if="isActiveMenu" @click="refresh">刷新</li>
            <li v-if="isLeftMenu" @click="closeLeftAll">关闭左侧</li>
            <li v-if="isRightMenu" @click="closeRightAll">关闭右侧</li>
            <li @click="closeOtherAll">关闭其他</li>
            <li @click="closeAll">全部关闭</li>
        </ul>
    </el-container>
</template>
<script setup>
import MenuItem from './components/menuItem.vue';
import { ref, getCurrentInstance, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import menuStore from '@/stortes/menu'; //引入仓库
import useUserInfoStore from '@/stortes/user'; //引入仓库
import { storeToRefs } from 'pinia'; //引入pinia转换
import { useRouter, useRoute } from 'vue-router';
import { ElNotification, ElTabs, ElTabPane } from 'element-plus';
import { Moon, Sunny } from '@element-plus/icons-vue';
let route = useRoute();
const router = useRouter();
const { proxy } = getCurrentInstance();
const menuInfoStore = menuStore();
const userStore = useUserInfoStore();
const { activeTabArray, editableTabsValue, allArray, allMenuArray } = storeToRefs(menuInfoStore); // 响应式
const { userInfo } = storeToRefs(userStore);
const userData = ref(null);
const breadList = ref([]);
// 一定一个当前右键点击的 菜单对象不是函数
const rightMouseData = ref(null);
const rightMouseKey = ref(null);
// 一定一个波尔变量是否显示关闭右侧菜单
const isRightMenu = ref(false);
const isShowRouter = ref(false);
const isActiveMenu = ref(false);
const isLeftMenu = ref(false);
// 定义contextMenuVisible默认为 false
const contextMenuVisible = ref(false);
// 定义top和left默认都是空字符串
const left = ref('');
const top = ref('');
const contextMenuElement = ref(null);
const isCollapse = ref(false);

const isDarkMode = ref(localStorage.getItem('theme') === 'dark');

const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value;
    let params = {
        id: userInfo.value.id,
        theme: isDarkMode.value ? 'dark' : 'light',
    };
    proxy.$api.updateTheme(params).then(res => {
        localStorage.setItem('theme', res.data);
        if (isDarkMode.value) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        nextTick(() => {
            window.location.reload();
        });
    });
};

// 定义函数 foldEvent
const foldEvent = () => {
    // 折叠菜单
    isCollapse.value = !isCollapse.value;
};

const getMatched = () => {
    breadList.value = route.matched.filter(item => item.meta && item.meta.title);
};

// 定义点击外部关闭菜单的方法
const handleClickOutside = e => {
    // 确保 contextMenuElement 已经被赋值
    if (contextMenuElement.value && !contextMenuElement.value.contains(e.target)) {
        contextMenuVisible.value = false;
    } else {
        contextMenuVisible.value = false;
    }
};
// 定义函数 refresh
const refresh = () => {
    nextTick(async () => {
        isShowRouter.value = false;
        await proxy.$router.push(route.fullPath);
        isShowRouter.value = true;
        // isShowRouter.value = false;
        // await proxy.$router.replace(rightMouseKey.value);
        // isShowRouter.value = true;
        // contextMenuVisible.value = false;
    });
};
// 定义上边的函数
const closeLeftAll = () => {
    menuInfoStore.changeRemoveLeftAll(rightMouseKey.value);
    contextMenuVisible.value = false;
    nextTick(() => {
        proxy.$router.push(editableTabsValue.value);
    });
};

const closeRightAll = () => {
    menuInfoStore.changeRemoveRightAll(rightMouseKey.value);
    contextMenuVisible.value = false;
    nextTick(() => {
        console.log(activeTabArray.value, '不走这里么 ', editableTabsValue.value);
        proxy.$router.push(editableTabsValue.value);
        //  proxy.$router.push跳转  activeTabArray.value 数组最后一项的url
        if (activeTabArray.value.length > 1) {
            proxy.$router.push(activeTabArray.value[activeTabArray.value.length - 1].url);
            menuInfoStore.changeTabsValue(activeTabArray.value[activeTabArray.value.length - 1].url);
        } else {
            proxy.$router.push(editableTabsValue.value);
        }
    });
};
const closeOtherAll = () => {
    menuInfoStore.changeRemoveOtherAll(rightMouseKey.value);
    contextMenuVisible.value = false;
    nextTick(() => {
        proxy.$router.push(editableTabsValue.value);
    });
};
const closeAll = () => {
    menuInfoStore.changeRemoveAll(rightMouseKey.value);
    contextMenuVisible.value = false;
    nextTick(() => {
        proxy.$router.push(editableTabsValue.value);
    });
};

const handleContextOut = e => {
    if (e === 'contextout') {
        // 退出登录
        proxy.$messageBox
            .confirm('确定退出登录吗？', '提示', {
                type: '提示',
            })
            .then(() => {
                proxy.$router.push('/login');
            });
    }
};
const handleContextMenu = e => {
    isLeftMenu.value = false;
    isRightMenu.value = false;
    isActiveMenu.value = false;
    contextMenuVisible.value = false;
    rightMouseKey.value = e.srcElement.id.split('-')[1];
    // 判断当前右键点击的菜单项是否是当前路由
    if (rightMouseKey.value == editableTabsValue.value) {
        isActiveMenu.value = true;
    } else {
        isActiveMenu.value = false;
    }
    if (rightMouseKey.value) {
        contextMenuVisible.value = true;
        left.value = e.clientX - 10;
        top.value = e.clientY + 15;
    }
    let result = findNodeById(allMenuArray.value, e.srcElement.id.split('-')[1]);
    if (result) {
        // rightMouseKey.value = e.srcElement.id.split('-')[1];
        // 获取地址栏的菜单的路由参数 拼接在rightMouseKey后边
        rightMouseData.value = result;
        // 判断当前右键点击的是否是第0或者是第一项
        let index = activeTabArray.value.findIndex(item => item.url === rightMouseKey.value);
        if (index == 0 || index == 1) {
            isLeftMenu.value = false;
        } else {
            isLeftMenu.value = true;
        }
        // 如果当前右键点击的菜单项是最后一项那就就不显示 关闭右侧的li
        if (rightMouseKey.value == activeTabArray.value[activeTabArray.value.length - 1].url) {
            // isRightMenu 设置为false
            isRightMenu.value = false;
        } else {
            isRightMenu.value = true;
        }
    }
};

const removeTab = pane => {
    menuInfoStore.changeRemoveTab(pane);
    proxy.$router.push(editableTabsValue.value);
};
const handleClick = (pane, ev) => {
    // 路由跳转
    proxy.$router.replace(pane.paneName);
};

const handleSelect = (key, keyPath) => {
    if (key) {
        menuInfoStore.changeTabsValue(key);
        let obj = findNodeById(userData.value, key);
        menuInfoStore.changeMenu(obj);
    }
};
const getSocketData = res => {
    let data = JSON.parse(res.detail.data.data);
    if (data.action == 'logout') {
        let mesg = {
            message: data.reason,
            type: 'error',
            duration: 2000,
        };
        ElNotification(mesg);
        // proxy.$websocket.close();
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        setTimeout(() => {
            proxy.$router.push('/login');
        }, 500);
    }
};
const getscoket = () => {
    // 从本地缓存里取登录人id
    // const loginId = JSON.parse(sessionStorage.getItem('piniaStore'));
    // let url = `ws://localhost:3001?id=${loginId.userInfo.id}`;
    // proxy.$websocket.initWebSocket(url);
    // window.addEventListener('onmessageWS', getSocketData);
};

/**
 * 根据ID查找树中的对象
 * @param {Array} tree - 树结构数据
 * @param {Number|String} targetId - 目标ID
 * @return {Object|null} - 找到的对象或null
 */
const findNodeById = (tree, targetId) => {
    for (const node of tree) {
        if (node.url === targetId) {
            return node;
        }
        if (node.children) {
            // 如果节点有子节点，继续递归查找
            const foundNode = findNodeById(node.children, targetId);
            if (foundNode) {
                return foundNode;
            }
        }
    }
    return null; // 没有找到对应ID的节点
};
watch(
    () => route.path,
    (newValue, oldValue) => {
        //监听路由路径是否发生变化，之后更改面包屑
        breadList.value = route.matched.filter(item => item.meta && item.meta.title);
    },
);
onMounted(async () => {
    contextMenuElement.value = document.querySelector('.contextmenu');
    document.addEventListener('click', handleClickOutside);
    getMatched();

    if (isDarkMode.value) {
        document.documentElement.classList.add('dark');
    }
    try {
        userData.value = allArray.value;
        nextTick(() => {
            isShowRouter.value = true; // 确保在DOM更新后再显示路由
        });
        return;
        getscoket();
    } catch (error) {
        console.error('失败信息:', error);
    }
});
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
    // window.removeEventListener('onmessageWS', getSocketData);
    // proxy.$websocket.close();
});
</script>
<style>
.el-tabs__item {
    border-bottom: 1px solid #fff !important;
}
/* 添加暗色模式相关样式 */
:root {
    --bg-color: #ffffff;
    --text-color: #606266;
    --header-bg: #ffffff;
    --aside-bg: #ffffff;
    --main-bg: #f5f5fb;
    --border-color: #e2e7ec;
    --menu-bg: #ffffff;
    --menu-text: #303133;
    --menu-active-text: #409eff;
    --tab-bg: #ffffff;
    --submenu-bg: #ffffff;
    --table-bg: #ffffff;
    --table-header-bg: #f5f7fa;
    --table-border: #ebeef5;
    --button-bg: #ffffff;
    --hover-bg: #f5f7fa;
    --input-bg: #ffffff;
    --form-text: #606266;
    --table-hover-bg: #f5f7fa;
    --select-bg: #ffffff;
    --select-hover-bg: #f5f7fa;
    --pagination-text: #606266;
    --button-gradient: #409eff; /* 保持原来的蓝色 */
}

.dark-mode {
    --bg-color: #1a1a1a;
    --text-color: #ffffff;
    --header-bg: #242424;
    --aside-bg: #242424;
    --main-bg: #1a1a1a;
    --border-color: #333333;
    --menu-bg: #242424;
    --menu-text: #cfd3dc;
    --menu-active-text: #409eff;
    --tab-bg: #1a1a1a;
    --submenu-bg: #1a1a1a;
    --table-bg: #242424;
    --table-header-bg: #1a1a1a;
    --table-border: #333333;
    --button-bg: #242424;
    --hover-bg: #333333;
    --input-bg: #242424;
    --form-text: #ffffff;
    --table-hover-bg: #1d1d1d;
    --select-bg: #242424;
    --select-hover-bg: #333333;
    --pagination-text: #e5eaf3; /* 更亮的文字颜色 */
    --button-gradient: linear-gradient(90deg, #6a11cb, #2575fc);
}

/* 更新所有需要响应暗色模式的元素 */
.el-aside {
    background-color: var(--aside-bg) !important;
    border-right: 1px solid var(--border-color);
}

.el-menu {
    background-color: var(--menu-bg) !important;
    border-right: none !important;
}

.el-menu-item {
    color: var(--menu-text) !important;
}

.el-menu-item.is-active {
    color: var(--menu-active-text) !important;
}

.el-main {
    background: var(--main-bg) !important;
    color: var(--text-color);
}

.top {
    height: 50px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    justify-content: space-between;
    background-color: var(--header-bg);
    border-bottom: 1px solid var(--border-color);
    color: var(--text-color);
}

.el-tabs__item {
    color: var(--text-color) !important;
}

.el-tabs__item.is-active {
    color: var(--menu-active-text) !important;
}

.el-tabs__nav-wrap {
    background-color: var(--tab-bg);
}

.contextmenu {
    background-color: var(--bg-color);
    border-color: var(--border-color);
    color: var(--text-color);
}

.contextmenu li {
    color: var(--text-color);
}

.contextmenu li:hover {
    background: var(--main-bg);
}

/* 主题切换按钮样式 */
.theme-switch {
    transition: transform 0.3s ease;
}

.theme-switch:hover {
    transform: rotate(30deg);
}

.el-aside {
    height: 100vh;
    background-color: #ffffff;
    transition: width 0.3s ease;
    border-right: 1px solid #e2e7ec;
    overflow: hidden !important;
}
.contextmenu {
    position: absolute;
    z-index: 1001;
    border: solid 1px #e4e7ed;
    border-radius: 4px;
    background-color: #ffffff;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    box-sizing: border-box;
    margin: 5px 0;
    width: 150px;
    padding: 6px 0;
}

.contextmenu li {
    font-size: 13px;
    padding: 0 20px;
    position: relative;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #606266;
    height: 34px;
    line-height: 34px;
    box-sizing: border-box;
    cursor: pointer;
}

.contextmenu li:hover {
    background: #f5f7fa;
    cursor: pointer;
}

.sidebarLogoFade-enter-active {
    transition: all 0.8s;
}

.sidebarLogoFade-enter,
.sidebarLogoFade-leave-to {
    transform: translateX(-30px);
    opacity: 0;
}
.el-menu-demo {
    height: auto;
    height: 100%;
}
.el-menu {
    border: 0px !important;
}
.mb-2 {
    height: 60px;
    background: aquamarine;
    margin: 0;
    line-height: 60px;
}

.common-layout {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
}

.el-container {
    height: 100%;
}

.el-header {
    padding: 0;
}

.el-main {
    background: #f5f5fb;
    padding: 16px 16px 0;
    position: relative;
}

.main_box {
    position: relative;
    overflow: auto;
    height: 100%;
    background: #ffffff;
}

.el-dropdown-link {
    display: flex;
    align-items: center;

    > p {
        margin: 0 10px;
    }
}

/* 更新菜单样式 */
.el-menu {
    background-color: var(--menu-bg) !important;
    border-right: none !important;
}

.el-sub-menu__title {
    color: var(--menu-text) !important;
}

.el-menu-item {
    color: var(--menu-text) !important;
}

.el-menu-item:hover,
.el-sub-menu__title:hover {
    background-color: var(--hover-bg) !important;
}

.el-menu-item.is-active {
    color: var(--menu-active-text) !important;
    background-color: var(--hover-bg) !important;
}

/* 表格样式 */
.el-table {
    background-color: var(--table-bg) !important;
    color: var(--text-color) !important;
    border-color: var(--table-border) !important;
}

/* 修复表格边框颜色 */
.el-table--border::after,
.el-table--border::before,
.el-table--border .el-table__inner-wrapper::after,
.el-table__inner-wrapper::before {
    background-color: var(--table-border) !important;
}

.el-table--border .el-table__cell {
    border-right: 1px solid var(--table-border) !important;
}

.el-table__cell {
    border-bottom: 1px solid var(--table-border) !important;
}

.el-table--border .el-table__inner-wrapper {
    border: 1px solid var(--table-border) !important;
}

/* 表头样式 */
.el-table th.el-table__cell {
    background-color: var(--table-header-bg) !important;
    color: var(--text-color) !important;
    border-bottom: 1px solid var(--table-border) !important;
}

.el-table--border .el-table__cell:first-child {
    border-left: 1px solid var(--table-border) !important;
}

/* 确保表格内部所有边框颜色一致 */
.el-table__border-left-patch {
    background-color: var(--table-border) !important;
}

.el-table__fixed-right-patch {
    background-color: var(--table-border) !important;
    border-bottom: 1px solid var(--table-border) !important;
}

/* 固定列的边框 */
.el-table__fixed-right::before,
.el-table__fixed::before {
    background-color: var(--table-border) !important;
}

/* 表格行样式 */
.el-table tr {
    background-color: var(--table-bg) !important;
}

.el-table tr:hover > td.el-table__cell {
    background-color: var(--table-hover-bg) !important;
}

/* 斑马纹样式 */
.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell {
    background-color: var(--hover-bg) !important;
}

/* 按钮样式 */
.el-button {
    background-color: var(--button-bg) !important;
    border-color: var(--border-color) !important;
    color: var(--text-color) !important;
}

.el-button:hover {
    background-color: var(--hover-bg) !important;
}

/* 主要按钮样式 */
.dark-mode .el-button--primary {
    background: var(--button-gradient) !important;
    border: none !important;
    color: #ffffff !important;
}

.dark-mode .el-button--primary:hover {
    opacity: 0.9;
    background: var(--button-gradient) !important;
}

/* 分页器激活状态按钮 */
.dark-mode .el-pagination.is-background .el-pager li:not(.is-disabled).is-active {
    background: var(--button-gradient) !important;
    color: #ffffff !important;
}

/* 其他可能需要渐变背景的元素 */
.dark-mode .el-menu-item.is-active {
    background: var(--button-gradient) !important;
    color: #ffffff !important;
}

/* 确保渐变色文字可读 */
.dark-mode .el-button--primary,
.dark-mode .el-pagination.is-background .el-pager li:not(.is-disabled).is-active,
.dark-mode .el-menu-item.is-active {
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 输入框样式 */
.el-input__wrapper {
    background-color: var(--input-bg) !important;
}

.el-input__inner {
    color: var(--text-color) !important;
}

/* 下拉菜单样式 */
.el-dropdown-menu {
    background-color: var(--bg-color) !important;
    border-color: var(--border-color) !important;
}

.el-dropdown-menu__item {
    color: var(--text-color) !important;
}

.el-dropdown-menu__item:hover {
    background-color: var(--hover-bg) !important;
}

/* 弹窗样式 */
.el-dialog {
    background-color: var(--bg-color) !important;
}

.el-dialog__title {
    color: var(--text-color) !important;
}

/* 分页器样式 */
.el-pagination {
    color: var(--pagination-text) !important;
    background-color: var(--bg-color) !important;
}

.el-pagination button {
    background-color: var(--button-bg) !important;
}

/* 表格hover样式 */
.el-table tr:hover > td.el-table__cell {
    background-color: var(--table-hover-bg) !important;
}

/* 表单文字颜色 */
.el-form-item__label {
    color: var(--form-text) !important;
}

.el-form-item__content {
    color: var(--form-text) !important;
}

/* 下拉框样式 */
.el-select .el-input__wrapper {
    background-color: var(--select-bg) !important;
}

.el-select-dropdown {
    background-color: var(--select-bg) !important;
    border-color: var(--border-color) !important;
}

.el-select-dropdown__item {
    color: var(--form-text) !important;
}

.el-select-dropdown__item.hover,
.el-select-dropdown__item:hover {
    background-color: var(--select-hover-bg) !important;
}

.el-select-dropdown__item.selected {
    color: var(--menu-active-text) !important;
    background-color: var(--select-hover-bg) !important;
}

/* 输入框的placeholder颜色 */
.el-input__wrapper input::placeholder {
    color: var(--form-text) !important;
    opacity: 0.5;
}

/* 确保所有表单控件的文字颜色正确 */
.el-input__wrapper,
.el-textarea__wrapper,
.el-radio__label,
.el-checkbox__label,
.el-switch__label,
.el-radio-button__inner {
    color: var(--form-text) !important;
}

/* 日期选择器 */
.el-date-picker {
    background-color: var(--select-bg) !important;
    color: var(--form-text) !important;
}

.el-date-picker__header-label {
    color: var(--form-text) !important;
}

.el-date-table th,
.el-date-table td {
    color: var(--form-text) !important;
}

.el-date-table td.available:hover {
    background-color: var(--select-hover-bg) !important;
}

/* 级联选择器 */
.el-cascader-panel {
    background-color: var(--select-bg) !important;
    border-color: var(--border-color) !important;
}

.el-cascader-node {
    color: var(--form-text) !important;
}

.el-cascader-node:not(.is-disabled):hover {
    background-color: var(--select-hover-bg) !important;
}

/* 时间选择器 */
.el-time-panel {
    background-color: var(--select-bg) !important;
    border-color: var(--border-color) !important;
}

.el-time-panel__content::after,
.el-time-panel__content::before {
    background-color: var(--border-color) !important;
}

.el-time-spinner__item {
    color: var(--form-text) !important;
}

.el-time-spinner__item:hover {
    background-color: var(--select-hover-bg) !important;
}

/* 添加平滑过渡效果 */

/* 侧边栏边框 */
.el-aside {
    border-right: 1px solid var(--table-border) !important;
}

/* 标签页边框 */
.el-tabs__nav-wrap::after {
    background-color: var(--table-border) !important;
}

.el-tabs--card > .el-tabs__header .el-tabs__item {
    border-left: 1px solid var(--table-border) !important;
    border-top: 1px solid var(--table-border) !important;
    border-bottom: 1px solid var(--table-border) !important;
}

.el-tabs--card > .el-tabs__header .el-tabs__nav {
    border: 1px solid var(--table-border) !important;
}

/* 分页组件样式优化 */
.el-pagination {
    --el-pagination-font-size: 14px;
    color: var(--pagination-text) !important;
}

.el-pagination .el-pagination__total,
.el-pagination .el-pagination__jump,
.el-pagination .el-input__inner,
.el-pagination button:not(:disabled) {
    color: var(--pagination-text) !important;
}

.el-pagination .el-select .el-input .el-input__inner {
    color: var(--pagination-text) !important;
}

.el-pagination.is-background .el-pager li:not(.is-disabled) {
    color: var(--pagination-text) !important;
    background-color: var(--button-bg) !important;
}

.el-pagination.is-background .el-pager li:not(.is-disabled).is-active {
    background-color: var(--menu-active-text) !important;
    color: #ffffff !important;
}

.el-pagination.is-background .el-pager li:not(.is-disabled):hover {
    color: var(--menu-active-text) !important;
}

/* 标签页样式 */
.dark-mode .el-tabs--card > .el-tabs__header .el-tabs__item.is-active {
    background: var(--button-gradient) !important;
    border-bottom: none !important;
    color: #ffffff !important;
}

/* 标签页hover效果 */
.dark-mode .el-tabs--card > .el-tabs__header .el-tabs__item:not(.is-active):hover {
    color: var(--menu-active-text) !important;
}

/* 确保渐变色文字可读 */
.dark-mode .el-button--primary,
.dark-mode .el-pagination.is-background .el-pager li:not(.is-disabled).is-active,
.dark-mode .el-menu-item.is-active,
.dark-mode .el-tabs--card > .el-tabs__header .el-tabs__item.is-active {
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 修复标签页边框 */
.dark-mode .el-tabs--card > .el-tabs__header .el-tabs__nav {
    border: 1px solid var(--table-border) !important;
    border-bottom: none !important;
}

.dark-mode .el-tabs--card > .el-tabs__header .el-tabs__item {
    border: 1px solid var(--table-border) !important;
    border-bottom: none !important;
    background-color: var(--button-bg) !important;
}

/* 标签页底部边框 */
.dark-mode .el-tabs--card > .el-tabs__header {
    border-bottom: 1px solid var(--table-border) !important;
}

.dark-progress-bar .bar {
    background: linear-gradient(90deg, #6a11cb, #2575fc) !important;
}
.dark-progress-bar .peg {
    box-shadow: 0 0 10px #2575fc, 0 0 5px #2575fc !important;
}

/* 亮色模式保持默认样式 */
.light-progress-bar .bar {
    background: #29d !important;
}
.light-progress-bar .peg {
    box-shadow: 0 0 10px #29d, 0 0 5px #29d !important;
}
</style>
