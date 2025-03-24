<template>
    <div class="flex h-screen overflow-hidden">
        <!-- 移动端遮罩层 - 仅在移动端且侧边栏打开时显示 -->
        <div v-if="isSidebarOpen && isMobile" class="fixed inset-0 bg-black bg-opacity-50 z-40" @click="closeSidebar"></div>
        <!-- 左侧边栏 -->
        <div
            :class="[
                'bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out',
                isSidebarOpen ? 'w-64' : 'w-0',
                isMobile ? 'fixed top-0 left-0 bottom-0 z-50' : '',
            ]"
        >
            <template v-if="isSidebarOpen">
                <!-- 固定的顶部Logo部分 -->
                <div class="flex justify-between h-16 border-b border-gray-200 items-center px-2 flex-shrink-0">
                    <div class="flex items-center space-x-2">
                        <span class="font-semibold">{{ selectedModel }}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <svg
                            class="cursor-pointer h-6 w-6 flex items-center justify-center rounded-md hover:bg-gray-100"
                            @click="toggleSidebar"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                        <svgicon @click="newConversation" />
                    </div>
                </div>
                <!-- 可滚动的历史记录部分 -->
                <div class="flex-1 overflow-auto custom-scrollbar">
                    <div class="p-4" v-if="sidebarList.length > 0">
                        <!-- <div class="text-sm text-gray-600">今天</div>
                        <div @click="getConversation" class="text-sm text-gray-800 p-2 hover:bg-gray-100 rounded">{{ sidebarList[0].content }}</div> -->

                        <!-- <div class="text-sm text-gray-600 mt-4">前 30 天</div> -->
                        <div class="space-y-1">
                            <div
                                @click="getConversation(item)"
                                v-for="(item, index) in sidebarList"
                                :key="index"
                                :class="[
                                    'truncate text-sm p-2 hover:bg-gray-100 rounded cursor-pointer',
                                    item.conversation_id == conversationId ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' : 'text-gray-800',
                                ]"
                            >
                                <span>
                                    {{ item.content }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <!-- 主要内容区域 -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <!-- 固定的顶部栏 -->
            <div class="h-16 border-b border-gray-200 flex items-center px-2 flex-shrink-0">
                <svg
                    v-if="!isSidebarOpen"
                    class="cursor-pointer h-6 w-6 flex items-center justify-center rounded-md hover:bg-gray-100"
                    @click="toggleSidebar"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
                <svgicon v-if="!isSidebarOpen" @click="newConversation" />
                <div class="flex-1 flex items-center ml-4">
                    <!-- <span class="text-xl font-semibold">{{ selectedModel }}</span> -->
                </div>
                <!-- 下拉选择大模型 -->
                <div class="relative">
                    <select
                        v-model="selectedModel"
                        class="appearance-none bg-white border border-gray-300 rounded-md py-2 px-4 pr-8 leading-tight focus:outline-none focus:border-blue-500"
                    >
                        <option v-for="model in modelList" :key="model.model" :value="model.model">{{ model.name }}</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- 可滚动的聊天区域 -->
            <div @scroll="onScroll" class="flex-1 overflow-auto custom-scrollbar p-4 bor" :class="[chatList.length > 0 ? 'h-16' : 'max-h-18']" ref="chatContainer">
                <!-- 聊天消息列表 -->
                <div v-for="(message, index) in chatList" :key="index" class="w-full max-w-5xl mx-auto mb-5 overflow-auto rounded-lg">
                    <div :class="['flex', 'relative', message.role === 'user' ? 'justify-end' : 'justify-start']">
                        <div
                            v-html="message.content"
                            :class="['overflow-hidden p-3 text-sm py-0', message.role === 'user' ? 'bg-blue-500 text-white rounded-lg' : 'bg-gray-100 w-full pt-3 pb-3']"
                        ></div>
                    </div>
                    <!-- 如果是AI的消息，显示操作按钮 -->
                    <div v-if="message.role === 'assistant' && message.isCompleted" class="top-2 right-2 flex gap-2 bg-gray-100 pl-2 pb-2">
                        <!-- 复制按钮 -->
                        <button @click="copyMessage(message.content)" class="text-gray-500 hover:text-gray-700 cursor-pointer" style="all: unset; cursor: pointer">
                            <svg t="1742692441761" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6848" width="26" height="26">
                                <path
                                    d="M753.312 698.848 753.312 383.6736c0-62.048-50.3104-112.3264-112.288-112.3264L395.3024 271.3472 324.288 271.3472l-53.7344 0-29.536 0c-62.048 0-112.288 50.272-112.288 112.3264l0 400.0512c0 61.9776 50.24 112.2752 112.288 112.2752l400.0128 0c62.048 0 112.288-50.2976 112.288-112.2752l0-31.0656 0.8768 0 0-54.0352C753.888 698.624 753.6768 698.7776 753.312 698.848zM660.6016 681.728l0 42.5984c0 0.864-0.2368 1.792-0.2368 2.6688-1.4272 42.3552-36.064 76.3008-78.7328 76.3008L300.3392 803.296c-43.5968 0-78.9056-35.3664-78.9056-78.9696L221.4336 442.9888c0-42.2336 33.2608-76.4928 75.0144-78.5984 1.2928-0.064 2.5984-0.3712 3.8912-0.3712l41.4272 0L581.632 364.0192c43.6608 0 78.9696 35.4048 78.9696 78.9696L660.6016 681.728zM895.1232 555.5008 895.1232 240.3264c0-62.048-50.3104-112.3264-112.288-112.3264L537.1136 128 466.0992 128l-53.7344 0-29.536 0c-62.048 0-112.288 50.272-112.288 112.3264l0 4.4736 115.0784 0c13.4912-13.8112 32.0256-22.72 52.6464-23.7568 1.2864-0.064 2.592-0.3712 3.8848-0.3712l41.4272 0 239.8656 0c43.6608 0 78.9696 35.4048 78.9696 78.9696l0 238.7328 0 42.5984c0 0.864-0.2368 1.792-0.2368 2.6688-0.8768 25.9136-14.208 48.6336-34.176 62.4l0 106.6048 14.8352 0c62.048 0 112.288-50.2976 112.288-112.2752l0-31.0656L896 609.3056l0-54.0352C895.6992 555.2768 895.488 555.424 895.1232 555.5008z"
                                    fill="#272636"
                                    p-id="6849"
                                ></path>
                            </svg>
                        </button>

                        <!-- 重新生成按钮 -->
                        <button @click="regenerateMessage(index)" class="text-gray-500 hover:text-gray-700 cursor-pointer" style="all: unset; cursor: pointer">
                            <svg t="1742692388521" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5551" width="24" height="24">
                                <path
                                    d="M233.152 189.12a426.624 426.624 0 0 1 628.352 567.744L725.376 512h128a341.312 341.312 0 0 0-577.728-246.272l-42.496-76.608z m557.824 645.76A426.624 426.624 0 0 1 162.56 267.072l136.064 244.864h-128a341.312 341.312 0 0 0 577.728 246.272l42.56 76.544z"
                                    p-id="5552"
                                ></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div class="border-t border-gray-200 bg-white p-4">
                <h1 v-if="chatList.length == 0" class="text-3xl font-semibold mb-8 text-center">有什么可以帮忙的?</h1>
                <div class="w-full max-w-5xl mx-auto">
                    <div class="relative max-w-5xl mx-auto border-solid border-black border-4 rounded-2xl p-4 pb-1.5">
                        <svgbot v-if="showScrollToBottomButton" @click="scrollToBottom" />
                        <textarea
                            @keydown.enter="handleEnter"
                            v-model="inputText"
                            rows="3"
                            placeholder="你想问什么呢"
                            class="max-h-48 w-full p-1 focus:outline-none resize-none overflow-auto custom-scrollbar"
                            style="width: -webkit-fill-available; font-size: 18px; border: none"
                        ></textarea>
                        <!-- @input="adjustTextareaHeight" -->
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex items-center space-x-2">
                                <svg
                                    @click="toggleSwitch"
                                    class="icon cursor-pointer"
                                    :style="{ fill: isSwitchOn ? 'rgb(59 130 247)' : '' }"
                                    t="1742264837221"
                                    viewBox="0 0 1024 1024"
                                    version="1.1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    p-id="3363"
                                    width="24"
                                    height="24"
                                >
                                    <path
                                        d="M608 249.6c-6.4-25.6-12.8-51.2-19.2-70.4-12.8-38.4-32-70.4-44.8-89.6-12.8-12.8-25.6-19.2-32-19.2s-19.2 6.4-32 19.2c-12.8 19.2-32 51.2-44.8 89.6-6.4 19.2-12.8 44.8-19.2 70.4C448 256 480 256 512 256s64 0 96-6.4zM352 243.2c12.8-70.4 38.4-128 64-166.4-89.6 19.2-160 57.6-217.6 115.2 6.4 6.4 12.8 6.4 25.6 12.8 32 12.8 76.8 25.6 128 38.4zM806.4 204.8c6.4-6.4 19.2-6.4 25.6-12.8-64-57.6-134.4-96-217.6-115.2 25.6 44.8 44.8 96 64 166.4 44.8-12.8 89.6-25.6 128-38.4zM704 480h256c-6.4-89.6-38.4-172.8-89.6-236.8-44.8 25.6-108.8 51.2-185.6 64 12.8 51.2 19.2 108.8 19.2 172.8zM684.8 716.8c70.4 12.8 134.4 32 185.6 64 51.2-64 83.2-147.2 89.6-236.8h-256c0 64-6.4 121.6-19.2 172.8zM627.2 326.4v-12.8C588.8 320 550.4 320 512 320s-76.8 0-108.8-6.4v12.8c-12.8 51.2-19.2 102.4-19.2 153.6h256c0-51.2-6.4-102.4-12.8-153.6zM320 544H64c6.4 89.6 38.4 172.8 89.6 236.8 44.8-25.6 108.8-51.2 185.6-64-12.8-51.2-19.2-108.8-19.2-172.8zM339.2 307.2c-70.4-12.8-134.4-32-185.6-64-51.2 64-83.2 147.2-89.6 236.8h256c0-64 6.4-121.6 19.2-172.8zM396.8 697.6v12.8C435.2 704 473.6 704 512 704s76.8 0 108.8 6.4v-12.8c12.8-51.2 19.2-102.4 19.2-153.6H384c0 51.2 6.4 102.4 12.8 153.6zM416 774.4c6.4 25.6 12.8 51.2 19.2 70.4 12.8 38.4 32 70.4 44.8 89.6 12.8 12.8 19.2 19.2 32 19.2s19.2-6.4 32-19.2c19.2-19.2 32-51.2 44.8-89.6 6.4-19.2 12.8-44.8 19.2-70.4C576 768 544 768 512 768s-64 0-96 6.4zM217.6 819.2c-6.4 6.4-19.2 6.4-25.6 12.8 57.6 57.6 134.4 102.4 217.6 121.6-25.6-44.8-44.8-96-64-166.4-44.8 6.4-89.6 19.2-128 32zM672 780.8c-12.8 70.4-38.4 128-64 166.4 83.2-19.2 160-57.6 217.6-121.6-6.4-6.4-12.8-6.4-25.6-12.8-32-6.4-76.8-19.2-128-32z"
                                        p-id="3364"
                                    ></path>
                                </svg>
                                <!-- 上传图片按钮 -->
                                <svg
                                    t="1742268872076"
                                    class="icon cursor-pointer pl-2"
                                    viewBox="0 0 1024 1024"
                                    version="1.1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    p-id="3394"
                                    width="24"
                                    height="24"
                                >
                                    <path
                                        d="M520.4 884.9H214c-49.6 0-90-40.4-90-90v-580c0-49.6 40.4-90 90-90h580c49.6 0 90 40.4 90 90v303.3c0 16.6-13.4 30-30 30s-30-13.4-30-30V214.9c0-16.5-13.5-30-30-30H214c-16.5 0-30 13.5-30 30v580c0 16.5 13.5 30 30 30h306.4c16.6 0 30 13.4 30 30s-13.4 30-30 30z m325.8-122.8H615.6c-16.6 0-30-13.4-30-30s13.4-30 30-30h230.7c16.6 0 30 13.4 30 30s-13.5 30-30.1 30zM730.9 877.4c-16.6 0-30-13.4-30-30V616.8c0-16.6 13.4-30 30-30s30 13.4 30 30v230.7c0 16.5-13.4 29.9-30 29.9zM327.8 429.1c-45 0-81.7-36.6-81.7-81.7 0-45 36.6-81.7 81.7-81.7s81.7 36.6 81.7 81.7c0 45-36.7 81.7-81.7 81.7z m0-117.4c-19.7 0-35.7 16-35.7 35.7s16 35.7 35.7 35.7 35.7-16 35.7-35.7-16-35.7-35.7-35.7zM157 678.2c-8.9 0-17.7-3.9-23.6-11.5-10.2-13-8-31.9 5.1-42.1l162.6-127.7c13-10.2 31.9-8 42.1 5.1 10.2 13 8 31.9-5.1 42.1L175.5 671.8c-5.5 4.3-12 6.4-18.5 6.4z m329.5-13.5c-6.2 0-12.5-1.9-17.9-5.9L308.3 539.5c-13.3-9.9-16-28.7-6.2-42s28.7-16 42-6.2l160.3 119.3c13.3 9.9 16 28.7 6.2 42-5.9 7.9-14.9 12.1-24.1 12.1z m0 0c-8.6 0-17.2-3.7-23.1-10.9-10.6-12.8-8.8-31.7 4-42.2l367.5-304c12.8-10.6 31.7-8.8 42.2 4 10.6 12.8 8.8 31.7-4 42.2l-367.5 304c-5.5 4.7-12.3 6.9-19.1 6.9z"
                                        fill="#333333"
                                        p-id="3395"
                                    ></path>
                                </svg>
                                <!-- 语音按钮 -->
                                <svg
                                    t="1742268730610"
                                    class="icon cursor-pointer pl-2"
                                    viewBox="0 0 1024 1024"
                                    version="1.1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    p-id="2391"
                                    width="23"
                                    height="23"
                                >
                                    <path
                                        d="M511.546501 703.829938c125.165633 0 224.028344-98.86271 224.028344-224.028344V224.028344C735.574845 98.86271 636.712135 0 511.546501 0 387.287865 0 287.518158 98.86271 287.518158 224.028344v255.77325c0 125.165633 99.769708 224.028344 224.028343 224.028344zM351.914969 224.028344c0-89.792737 70.745793-159.631532 159.631532-159.631533 89.792737 0 160.53853 69.838795 160.53853 159.631533v255.77325c0 89.792737-70.745793 160.53853-160.53853 160.53853-88.88574 0-159.631532-70.745793-159.631532-160.53853V224.028344z"
                                        fill="#2c2c2c"
                                        p-id="2392"
                                    ></path>
                                    <path
                                        d="M896.113375 479.801594h-64.396812c0 175.957484-144.212578 320.170062-320.170062 320.170062S192.283437 655.759079 192.283437 479.801594H127.886625c0 201.35341 153.282551 364.612932 351.914969 380.938884v163.259522h64.396812V860.740478c197.725421-16.325952 351.914969-179.585474 351.914969-380.938884z"
                                        fill="#2c2c2c"
                                        p-id="2393"
                                    ></path>
                                </svg>
                            </div>
                            <button v-if="isBtn" @click="sendMessage" class="cursor-pointer h-8 px-4 bg-black text-white rounded-lg flex items-center justify-center">发送</button>
                            <button v-if="!isBtn" @click="sttobFun" class="cursor-pointer h-8 px-4 bg-black text-white rounded-lg flex items-center justify-center">停止</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { getCurrentInstance, ref, onMounted, nextTick, computed, watchEffect } from 'vue';
const { VITE_STATIC_URL } = import.meta.env;
const { proxy } = getCurrentInstance();
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
// import 'highlight.js/styles/github.css'; // 引入样式
import 'highlight.js/styles/atom-one-dark.css';
import svgicon from './comp/svg.vue';
import svgbot from './comp/svgbot.vue';
import xml from 'highlight.js/lib/languages/xml'; // Vue 代码用 XML 高亮
hljs.registerLanguage('vue', xml);

import { useCodeCopy } from './hooks/useCodeCopy';
useCodeCopy();

// 初始化 markdown-it 并启用代码高亮
const md = new MarkdownIt({
    html: true, // 启用 HTML 渲染
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
        let highlightedCode = '';
        if (lang && hljs.getLanguage(lang)) {
            try {
                highlightedCode = hljs.highlight(str, { language: lang }).value;
            } catch (__) {
                highlightedCode = md.utils.escapeHtml(str); // 如果高亮失败，转义原始代码
            }
        } else {
            highlightedCode = md.utils.escapeHtml(str); // 无语言指定时，转义代码
        }

        // 返回没有包裹 <pre> 的代码，避免嵌套问题
        return `<code class="hljs${lang ? ' ' + lang : ''}">${highlightedCode}</code>`;
    },
});

// 修改代码块渲染，避免重复 <pre> 包裹
md.renderer.rules.fence = function (tokens, idx) {
    const token = tokens[idx];
    // 通过高亮生成的 HTML 渲染，而不使用 MarkdownIt 默认的 <pre><code>
    const highlightedCode = md.options.highlight(token.content, token.info);
    return `<pre style="position: relative; padding-top: 20px;">
                <button class="copy-button" style="position: absolute; top: 4px; right: 4px;">复制</button>
                ${highlightedCode}
            </pre>`;
};

const selectedModel = ref('');

const modelList = ref([{ model: 'qwen-plus', name: 'qwen-plus' }]);

const inputText = ref('');
const isSidebarOpen = ref(true);
const conversationId = ref(''); // 当前回话id
// 当前回话内容的list
const chatList = ref([]);
const sidebarList = ref([]);
const chatContainer = ref(null);
const windowWidth = ref(window.innerWidth);
const isMobile = computed(() => windowWidth.value < 768);

const showScrollToBottomButton = ref(false);
const isUserInteracting = ref(false);
const isSwitchOn = ref(false);

const isBtn = ref(true);

const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value;

    // 在移动设备上打开侧边栏时，阻止背景滚动
    if (isMobile.value && isSidebarOpen.value) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
};

const toggleSwitch = () => {
    isSwitchOn.value = !isSwitchOn.value;
};

const closeSidebar = () => {
    isSidebarOpen.value = false;
    document.body.style.overflow = '';
};

const checkWindowSize = () => {
    windowWidth.value = window.innerWidth;
    if (windowWidth.value < 768) {
        isSidebarOpen.value = false;
        document.body.style.overflow = 'hidden';
    } else {
        isSidebarOpen.value = true;
    }
};

const onScroll = () => {
    const container = chatContainer.value;
    if (container) {
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
        showScrollToBottomButton.value = !isAtBottom;
        isUserInteracting.value = !isAtBottom; // 如果在底部，重置为 false
    }
};

// 滚动到底部
const scrollToBottom = () => {
    const container = chatContainer.value;
    if (container) {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth', // 启用平滑滚动
        });
        showScrollToBottomButton.value = false;
        isUserInteracting.value = false; // 重置用户交互状态
    }
};

// 处理回车事件
const handleEnter = event => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // 阻止默认行为（如换行）
        sendMessage(); // 调用发送消息方法
    }
};

// 创建一个新会话
const newConversation = () => {
    // 清空chatList数据和conversationId
    chatList.value = [];
    conversationId.value = '';
};
// 会话id聊天记录
const getHistory = conversationId => {
    proxy.$api.getRecord({ conversationId: conversationId }).then(res => {
        // 遍历数据，过滤掉 role 是 tool的数据已经 存在字段 tool_calls的数据
        res.data = res.data.filter(item => item.role !== 'tool' && !item.tool_calls);
        chatList.value = res.data.map(item => {
            const fullContent = item.content; // 解码数据
            // 使用 markdown-it 渲染完整的 Markdown 内容
            const renderedContent = md.render(fullContent);
            return {
                role: item.role,
                content: renderedContent,
                isCompleted: item.isCompleted,
            };
        });
        // 滚动到最底部
        nextTick(() => {
            scrollToBottom();
        });
    });
};

// 点击历史记录
const getConversation = item => {
    conversationId.value = item.conversation_id;
    getHistory(conversationId.value);
};
// 发送消息
const sendMessage = async e => {
    if (!inputText.value) return;
    let data = '';
    // 如果 chatList 数据是空的
    if (chatList.value.length === 0) {
        // 保存第一次对话生成对话id调用 初始接口
        data = await proxy.$api.saveFirstDialogue({ content: inputText.value });
        conversationId.value = data.data.conversation_id;
    }
    // 添加用户消息
    chatList.value.push({
        role: 'user',
        content: '',
    });
    const lastIndex = chatList.value.length - 1;
    const renderedContent = md.render(inputText.value);
    chatList.value[lastIndex].content = renderedContent;
    let prompt = inputText.value;
    const eventSource = new EventSource(
        `${VITE_STATIC_URL}ai/stream?prompt=${encodeURIComponent(prompt)}&conversationId=${encodeURIComponent(conversationId.value)}&model=${
            selectedModel.value
        }&enableInternetSearch=${isSwitchOn.value ? '1' : '0'}`,
    );

    // 初始化助手消息
    chatList.value.push({
        role: 'assistant',
        content: '', // 初始为空
        isCompleted: 0, //是否生成完毕
    });
    // 重置按钮显示
    isBtn.value = false;

    // 处理接收到的数据
    eventSource.onmessage = event => {
        requestAnimationFrame(() => {
            // 如果是正常的 AI 回复内容
            const lastIndex = chatList.value.length - 1;
            const data = JSON.parse(event.data); // 解码数据
            if (data.status === 'searching') {
                // 正在联网搜索中，显示提示信息
                chatList.value[lastIndex].content = '<i>正在联网搜索中，请稍候...</i>';
                nextTick(() => {
                    scrollToBottom();
                });
                return;
            }

            if (data.status === 'search_complete') {
                // 联网搜索完成，这里可以更新 UI 或者显示提示
                chatList.value[lastIndex].content = '';
                chatList.value[lastIndex].content = '<i>联网搜索已完成！</i>';
                console.log('联网搜索已完成！');
                return;
            }

            if (data.status === 'search_failed') {
                // 联网搜索失败，提示用户
                chatList.value[lastIndex].content = '<i>联网搜索失败，正在使用本地知识库回答。</i>';
                nextTick(() => {
                    scrollToBottom();
                });
                return;
            }

            if (lastIndex >= 0 && chatList.value[lastIndex].role === 'assistant' && chatList.value[lastIndex].content.includes('正在联网搜索中')) {
                // 找到之前显示的“正在联网搜索中...”的消息并替换
                chatList.value[lastIndex].content = md.render(data);
            } else {
                // 如果不存在“正在联网搜索中...”的消息，则正常添加
                const renderedContent = md.render(data);
                chatList.value[lastIndex].content = renderedContent;
            }
            // 在 DOM 更新后检查是否需要滚动
            nextTick(() => {
                const container = chatContainer.value;
                if (container && !isUserInteracting.value) {
                    scrollToBottom();
                }
            });
        });
    };

    // 错误处理
    eventSource.onerror = error => {
        console.error('EventSource 发生错误', error);
        eventSource.close();
    };
    // 监听结束事件
    eventSource.addEventListener('end', async () => {
        console.log('数据流结束');
        // 如果是正常的 AI 回复内容
        const lastIndex = chatList.value.length - 1;
        chatList.value[lastIndex].isCompleted = 1;

        eventSource.close();
        // 刷新左侧历史聊天记录
        sidebarList.value = await getAllConversations();
    });

    // 清空输入框
    inputText.value = '';
};
// 停止生成
const sttobFun = () => {
    proxy.$api.stopAi({ conversationId: conversationId.value }).then(res => {
        isBtn.value = true;
    });
};

// 获取父表
const getAllConversations = async () => {
    let list = await proxy.$api.getAllConversations();
    return list.data;
};

// 复制消息内容到剪贴板
const copyMessage = content => {
    navigator.clipboard
        .writeText(content)
        .then(() => {
            console.log('复制成功', err);
        })
        .catch(err => {
            console.error('复制失败:', err);
        });
};

const stripHtmlTags = html => {
    return html.replace(/<[^>]+>/g, '').trim();
};
// 重新生成
const regenerateMessage = index => {
    inputText.value = stripHtmlTags(chatList.value[index - 1].content);
    sendMessage(); // 调用发送消息方法
};

onMounted(async () => {
    checkWindowSize();
    window.addEventListener('resize', () => {
        checkWindowSize();
    });
    const list = await getAllConversations();
    if (Array.isArray(list) && list.length > 0) {
        conversationId.value = list[0].conversation_id;
        sidebarList.value = list;
        getHistory(conversationId.value);
    }
    // 获取ollama列表
    proxy.$api
        .getOllamaList()
        .then(res => {
            if (res.data.length > 0) {
                modelList.value.push(...res.data);
                if (sessionStorage.getItem('selectedModel')) {
                    selectedModel.value = sessionStorage.getItem('selectedModel');
                } else {
                    selectedModel.value = modelList.value[0].model;
                    sessionStorage.setItem('selectedModel', selectedModel.value);
                }
            }
        })
        .catch(err => {
            selectedModel.value = 'qwen-plus';
            sessionStorage.setItem('selectedModel', selectedModel.value);
        });
});
watchEffect(() => {
    if (selectedModel.value) {
        sessionStorage.setItem('selectedModel', selectedModel.value);
    }
});
</script>

<style>
/* 导入样式文件 */
@import '../../assets/css/ai.css';
</style>
