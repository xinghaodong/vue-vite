<template>
    <div class="flex h-screen overflow-hidden">
        <!-- 左侧边栏 -->
        <div :class="['bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-100 ease-in-out', isSidebarOpen ? 'w-64' : 'w-0']">
            <template v-if="isSidebarOpen">
                <!-- 固定的顶部Logo部分 -->
                <div class="p-4">
                    <div class="flex items-center space-x-2 mb-6">
                        <span class="font-semibold">ChatGPT</span>
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
                            <span>ChatGPT</span>
                        </div>
                        <div class="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
                            <span>探索 GPT</span>
                        </div>
                    </div>
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
                <el-icon class="h-6 w-6 text-2xl px-3" style="display: block; cursor: pointer" @click="toggleSidebar"><Fold /></el-icon>
                <div class="flex-1 flex items-center">
                    <span class="text-xl font-semibold">ChatGPT</span>
                </div>
            </div>

            <!-- 可滚动的聊天区域 -->
            <div @scroll="onScroll" class="flex-1 overflow-auto custom-scrollbar p-4" :class="[chatList.length > 0 ? 'h-16' : 'max-h-18']" ref="chatContainer">
                <!-- 聊天消息列表 -->
                <div v-for="(message, index) in chatList" :key="index" class="w-full max-w-4xl mx-auto mb-5">
                    <div :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']">
                        <!-- style="white-space: pre-wrap" -->
                        <div v-if="show" v-html="message.content" :class="['rounded-lg p-3 text-sm', message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100']"></div>
                    </div>
                </div>
            </div>
            <div class="border-t border-gray-200 bg-white p-4">
                <h1 v-if="chatList.length == 0" class="text-3xl font-semibold mb-8 text-center">有什么可以帮忙的?</h1>
                <div class="w-full max-w-4xl mx-auto">
                    <div class="relative w-full max-w-4xl mx-auto">
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

                        <!-- 滚动到底部按钮 -->
                        <div class="flex justify-center right-0 left-0 -top-14 absolute cuper-pointer">
                            <button
                                v-if="showScrollToBottomButton"
                                class="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-full shadow-md hover:bg-blue-600 transition-colors"
                                @click="scrollToBottom"
                            >
                                ↓
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { getCurrentInstance, ref, onMounted, watch, nextTick } from 'vue';
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
                <button class="copy-button" style="position: absolute; top: 4px; right: 4px;">Copy</button>
                ${highlightedCode}
            </pre>`;
};

const inputText = ref('');
const textareaHeight = ref(84); // 初始高度
const isSidebarOpen = ref(true);
// 当前回话内容的list
const chatList = ref([
    // {
    //     role: 'assistant',
    //     content:
    //         "如果你想要删除当前操作项，首先需要明确这个“操作项”是如何在你的代码或应用中表示的。例如，它可能是一个列表中的项目、一个表格行、或者是某个特定的数据结构中的元素等。\n\n这里我给出一个简单的例子：假设你有一个网页上的待办事项列表（To-Do List），每个事项都有一个删除按钮。点击删除按钮时，你需要从DOM（文档对象模型）中移除该项，并且如果有必要的话，也从存储这些数据的数据结构中移除（比如一个数组）。\n\n以下是一个简单的示例代码：\n\n```javascript\n// 假设我们有一个待办事项的列表，存储在一个数组中\nlet todos = [\n    { id: 1, text: '学习JavaScript' },\n    { id: 2, text: '练习编程题目' },\n    { id: 3, text: '完成项目作业' }\n];\n\n// 渲染函数，用于将todos数组中的数据渲染到页面上\nfunction renderTodos() {\n    const todoListElement = document.getElementById('todoList');\n    todoListElement.innerHTML = ''; // 清空现有内容\n\n    todos.forEach(todo => {\n        const li = document.createElement('li');\n        li.textContent = todo.text;\n\n        const deleteButton = document.createElement('button');\n        deleteButton.textContent = '删除';\n        \n        // 绑定点击事件，使用闭包保存当前todo的id\n        deleteButton.onclick = ((id) => {\n            return () => deleteTodo(id);\n        })(todo.id);\n\n        li.appendChild(deleteButton);\n        todoListElement.appendChild(li);\n    });\n}\n\n// 删除函数，根据ID删除对应的待办事项\nfunction deleteTodo(id) {\n    todos = todos.filter(todo => todo.id !== id); // 从数组中过滤掉要删除的项\n    renderTodos(); // 重新渲染列表\n}\n\n// 页面加载完成后调用renderTodos渲染初始列表\nwindow.onload = () => {\n    renderTodos();\n};\n```\n\n在这个例子中，`deleteTodo` 函数会根据传入的 `id` 来删除对应的待办事项，并且调用 `renderTodos` 函数来更新显示。请确保在HTML文件中有相应的元素，如具有 `id=\"todoList\"` 的元素，以供这段脚本正确运行。\n\n请注意，这只是一个非常基础的例子，实际的应用可能会涉及到更复杂的逻辑和状态管理。如果你能提供更多的上下文信息，我可以提供更加具体的帮助。",
    // },
]);
const chatContainer = ref(null);
const show = ref(false);

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
};

const checkWindowSize = () => {
    if (window.innerWidth < 768) {
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
        console.log(event, 'handleEnter');
        event.preventDefault(); // 阻止默认行为（如换行）
        sendMessage(); // 调用发送消息方法
    }
};
const sendMessage = async e => {
    console.log(e, 'sendMessage');
    if (!inputText.value) return;
    let data = '';
    // 如果 chatList 数据是空的
    if (chatList.value.length === 0) {
        // 保存第一次对话生成对话id调用 初始接口
        data = await proxy.$api.saveFirstDialogue({ content: inputText.value });
    }
    // 添加用户消息
    chatList.value.push({
        role: 'user',
        content: inputText.value,
    });
    //

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
    window.addEventListener('resize', checkWindowSize);

    // 查询历史聊天记录
    proxy.$api.getAllConversations().then(res => {
        if (res.code === 200) {
            res.data[0].messages.forEach(element => {
                console.log(element, 'element');
                chatList.value.push({
                    role: element.role,
                    content: element.content,
                });
            });
            show.value = true;
        }
    });

    // const fullContent = chatList.value[0].content; // 解码数据
    // // 使用 markdown-it 渲染完整的 Markdown 内容
    // const renderedContent = md.render(fullContent);
    // chatList.value[0].content = renderedContent;
    // setTimeout(() => {
    //     show.value = true;
    // }, 100);
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

watch(isSidebarOpen, newValue => {
    if (newValue && window.innerWidth < 768) {
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
    background: #ccc;
    border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #888;
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
