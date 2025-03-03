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
                        <span class="font-semibold">ChatGPT</span>
                    </div>
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
                </div>
                <!-- 可滚动的历史记录部分 -->
                <div class="flex-1 overflow-auto custom-scrollbar">
                    <div class="p-4">
                        <div class="text-sm text-gray-600">今天</div>
                        <div class="text-sm text-gray-800 p-2 hover:bg-gray-100 rounded">业界服务修改优化</div>

                        <div class="text-sm text-gray-600 mt-4">前 30 天</div>
                        <div class="space-y-1">
                            <div v-for="(item, index) in historyItems" :key="index" class="text-sm text-gray-800 p-2 hover:bg-gray-100 rounded cursor-pointer">
                                {{ item }}
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

                <div class="flex-1 flex items-center ml-2">
                    <span class="text-xl font-semibold">ChatGPT</span>
                </div>
            </div>

            <!-- 可滚动的聊天区域 -->
            <div @scroll="onScroll" class="flex-1 overflow-auto custom-scrollbar p-4" :class="[chatList.length > 0 ? 'h-16' : 'max-h-18']" ref="chatContainer">
                <!-- 聊天消息列表 -->
                <div v-for="(message, index) in chatList" :key="index" class="w-full max-w-5xl mx-auto mb-5 overflow-auto">
                    <div :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']">
                        <div
                            v-if="show"
                            v-html="message.content"
                            :class="['rounded-lg p-3 text-sm overflow-hidden', message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 w-full']"
                        ></div>
                    </div>
                </div>
            </div>

            <div class="border-t border-gray-200 bg-white p-4">
                <h1 v-if="chatList.length == 0" class="text-3xl font-semibold mb-8 text-center">有什么可以帮忙的?</h1>
                <div class="w-full max-w-5xl mx-auto">
                    <div class="relative w-full max-w-5xl mx-auto">
                        <svg
                            v-if="showScrollToBottomButton"
                            class="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10 bg-white icon cursor-pointer text-white px-4 py-2 rounded-full shadow-md transition-colors"
                            @click="scrollToBottom"
                            t="1741071381431"
                            viewBox="0 0 1024 1024"
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            p-id="9645"
                            width="24"
                            height="24"
                        >
                            <path
                                d="M512 64C213.3 64 64 213.3 64 512s149.3 448 448 448 448-149.3 448-448S810.7 64 512 64z m0 803.2c-236.8 0-355.3-118.4-355.3-355.3S275.1 156.7 512 156.7 867.3 275.1 867.3 512 748.8 867.2 512 867.2z"
                                fill="#040000"
                                p-id="9646"
                            ></path>
                            <path
                                d="M692.4 503c-9.2-0.1-92-4.2-176.3-5.2-84.3-0.9-155.8 3.3-161.8 1.3-22.4-7.5-36.7 21.1-27.2 32.8 7.6 9.4 162 181.4 175.1 197.4 14.9 23.2 44.8 6.5 44.8 6.5 9.8-11.3 157.2-188.3 168.2-201.7 8-9.9 8.6-30.8-22.8-31.1z"
                                fill="#040000"
                                p-id="9647"
                            ></path>
                            <path
                                d="M589.5 527.7V317.4c0-32.7-26.4-59.1-59-59.1h-14.8c-32.6 0-59 26.4-59 59.1v210.3c0 32.7 26.4 59 59 59h14.8c32.6 0.1 59-26.3 59-59z"
                                fill="#040000"
                                p-id="9648"
                            ></path>
                        </svg>
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
import { getCurrentInstance, ref, onMounted, watch, nextTick, computed } from 'vue';
const { VITE_STATIC_URL } = import.meta.env;
import { ElMessage } from 'element-plus';
const { proxy } = getCurrentInstance();
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/github.css'; // 引入样式

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

const inputText = ref('');
const textareaHeight = ref(84); // 初始高度
const isSidebarOpen = ref(true);
const conversationId = ref(''); // 当前回话id
// 当前回话内容的list
const chatList = ref([]);
const chatContainer = ref(null);
const show = ref(false);
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
        container.scrollTop = container.scrollHeight;
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

const sendMessage = async e => {
    if (!inputText.value) return;
    let data = '';
    // 如果 chatList 数据是空的
    if (chatList.value.length === 0) {
        // 保存第一次对话生成对话id调用 初始接口
        data = await proxy.$api.saveFirstDialogue({ content: inputText.value });
    } else {
        data = {
            data: {
                conversationId: conversationId.value,
            },
        };
        // 保存对话信息
        let res = await proxy.$api.seteRecord({
            role: 'user',
            content: inputText.value,
            conversationId: conversationId.value,
        });
    }

    // 添加用户消息
    chatList.value.push({
        role: 'user',
        content: inputText.value,
    });

    let prompt = inputText.value;
    const eventSource = new EventSource(`${VITE_STATIC_URL}ai/stream?prompt=${encodeURIComponent(prompt)}&conversationId=${encodeURIComponent(data.data.conversationId)}`);

    // 初始化助手消息
    chatList.value.push({
        role: 'assistant',
        content: '', // 初始为空
    });

    // 处理接收到的数据
    eventSource.onmessage = event => {
        requestAnimationFrame(() => {
            const fullContent = JSON.parse(event.data); // 解码数据
            // 获取最后一项（助手的消息）
            const lastIndex = chatList.value.length - 1;
            // 使用 markdown-it 渲染完整的 Markdown 内容
            const renderedContent = md.render(fullContent);
            // 更新内容
            chatList.value[lastIndex].content = renderedContent;
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
    eventSource.addEventListener('end', () => {
        console.log('数据流结束');
        eventSource.close();
    });

    // 清空输入框
    inputText.value = '';
};

onMounted(() => {
    adjustTextareaHeight({ target: document.querySelector('textarea') });
    checkWindowSize();
    window.addEventListener('resize', () => {
        checkWindowSize();
    });

    // 查询历史聊天记录
    proxy.$api.getAllConversations().then(res => {
        if (res.code === 200) {
            conversationId.value = res.data[0].conversationId;
            res.data[0].messages.forEach((element, index) => {
                chatList.value.push({
                    role: element.role,
                    content: element.content,
                });
                const fullContent = element.content; // 解码数据
                // 使用 markdown-it 渲染完整的 Markdown 内容
                const renderedContent = md.render(fullContent);
                chatList.value[index].content = renderedContent;
                // 滚动到最底部
                nextTick(() => {
                    scrollToBottom();
                });
            });
            show.value = true;
        }
    });

    // 动态绑定复制按钮的点击事件
    document.body.addEventListener('click', async event => {
        const target = event.target;

        // 检查是否点击了复制按钮
        if (target.classList.contains('copy-button')) {
            const preElement = target.closest('pre'); // 找到最近的 <pre> 元素
            const codeElement = preElement.querySelector('code'); // 获取 <code> 元素
            const codeText = codeElement.textContent; // 获取代码内容

            try {
                await navigator.clipboard.writeText(codeText); // 复制到剪贴板
                // element 提示
                ElMessage.success('复制成功');
            } catch (error) {}
        }
    });
});

// 监听侧边栏状态，控制body滚动
watch(isSidebarOpen, newValue => {
    if (newValue && isMobile.value) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
});

const historyItems = ['微信小程序页面布局', 'Docker MySQL 网络问题', 'Nest.js 阿里云部署'];

const actions = [{ icon: '🖼️', text: '创建图片' }];
</script>

<style>
/* 代码高亮样式 */
.hljs {
    display: block;
    overflow-x: auto;
    padding: 10px;
    background: #2d2d2d;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    color: #f8f8f2;
}

.hljs-comment {
    color: #7d8b8c;
}

.hljs-keyword {
    color: rgb(220, 198, 224);
}
.hljs-title.function_ {
    color: rgb(0, 224, 224);
}
.hljs-string {
    color: #a6e22e !important;
}

pre {
    position: relative; /* 确保复制按钮定位正确 */
    border-radius: 5px;
    overflow-x: auto;
    display: inline-flex;
    background: #2d2d2d;
    color: rgb(248, 248, 242);
    padding: 16px 8px;
    margin: 0px;
    font-size: 13px;
    width: -webkit-fill-available;
    /* padding-top: 0px !important;
        padding-bottom: 0px !important; */
}

code {
    font-family: 'Courier New', monospace;
}
code.hljs {
    padding-top: 0px !important;
    padding-bottom: 0px !important;
}
.copy-button {
    background: #fff;
    color: #333;
    font-size: 12px;
    padding: 4px 6px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s ease-in-out;
}

.copy-button:hover {
    background: rgba(254, 251, 251, 0.2);
}
</style>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(0, 1%, 79%);
    border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #999898;
    cursor: pointer;
}

@media (max-width: 767px) {
    .w-64 {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        z-index: 50;
    }
}
</style>
