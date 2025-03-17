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
            <div @scroll="onScroll" class="flex-1 overflow-auto custom-scrollbar p-4" :class="[chatList.length > 0 ? 'h-16' : 'max-h-18']" ref="chatContainer">
                <!-- 聊天消息列表 -->
                <div v-for="(message, index) in chatList" :key="index" class="w-full max-w-5xl mx-auto mb-5 overflow-auto">
                    <div :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']">
                        <div
                            v-html="message.content"
                            :class="['rounded-lg overflow-hidden p-3 text-sm py-0', message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 w-full pt-3 pb-3']"
                        ></div>
                    </div>
                </div>
            </div>

            <div class="border-t border-gray-200 bg-white p-4">
                <h1 v-if="chatList.length == 0" class="text-3xl font-semibold mb-8 text-center">有什么可以帮忙的?</h1>
                <div class="w-full max-w-5xl mx-auto">
                    <div class="relative w-full max-w-5xl mx-auto">
                        <svgbot v-if="showScrollToBottomButton" @click="scrollToBottom" />
                        <textarea
                            @keydown.enter="handleEnter"
                            v-model="inputText"
                            placeholder="你想问什么呢"
                            rows="1"
                            class="max-h-48 w-full p-4 border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200 ease-in-out shadow-md resize-none overflow-auto custom-scrollbar"
                            style="width: -webkit-fill-available; font-size: 18px"
                            @input="adjustTextareaHeight"
                        ></textarea>
                        <button @click="sendMessage" class="cursor-pointer absolute right-3 bottom-3 h-8 px-4 bg-black text-white rounded-lg flex items-center justify-center">
                            发送
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { getCurrentInstance, ref, onMounted, watch, nextTick, computed, watchEffect } from 'vue';
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

const actions = [{ icon: '🖼️', text: '创建图片' }];

const selectedModel = ref('');

const modelList = ref([{ model: 'qwen-plus', name: 'qwen-plus' }]);

const inputText = ref('');
const textareaHeight = ref(84); // 初始高度
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

const adjustTextareaHeight = e => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    textareaHeight.value = textarea.scrollHeight;
};

const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value;

    // 在移动设备上打开侧边栏时，阻止背景滚动
    if (isMobile.value && isSidebarOpen.value) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
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
        }&enableInternetSearch=1`,
    );

    // 初始化助手消息
    chatList.value.push({
        role: 'assistant',
        content: '', // 初始为空
    });

    // 处理接收到的数据
    eventSource.onmessage = event => {
        requestAnimationFrame(() => {
            const data = JSON.parse(event.data); // 解码数据
            // 如果是正常的 AI 回复内容
            const lastIndex = chatList.value.length - 1;
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
            console.log(chatList.value, '.333');
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
        eventSource.close();
        // 刷新左侧历史聊天记录
        sidebarList.value = await getAllConversations();
    });

    // 清空输入框
    inputText.value = '';
};

// 获取父表
const getAllConversations = async () => {
    let list = await proxy.$api.getAllConversations();
    return list.data;
};

onMounted(async () => {
    // 查询天气
    // proxy.$api.getWeather({ city: '' }).then(res => {
    //     console.log(res.data, '66667777');
    // });

    // proxy.$api.getGoogleSearch({ query: '太原天气' }).then(res => {
    //     console.log(res.data, '66667777');
    // });

    adjustTextareaHeight({ target: document.querySelector('textarea') });
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
    proxy.$api.getOllamaList().then(res => {
        modelList.value.push(...res.data);
        if (modelList.value.length > 0) {
            if (sessionStorage.getItem('selectedModel')) {
                selectedModel.value = sessionStorage.getItem('selectedModel');
            } else {
                console.log('modelList.value', modelList.value);
                selectedModel.value = modelList.value[0].model;
                sessionStorage.setItem('selectedModel', selectedModel.value);
            }
        }
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
