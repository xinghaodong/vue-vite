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
            <div class="flex-1 overflow-auto custom-scrollbar p-4" :class="[chatList.length > 0 ? 'h-16' : 'max-h-18']" ref="chatContainer">
                <!-- 聊天消息列表 -->
                <div v-for="(message, index) in chatList" :key="index" class="w-full max-w-4xl mx-auto mb-5">
                    <div :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']">
                        <!-- style="white-space: pre-wrap" -->
                        <div v-html="message.content" :class="['max-w-[80%] rounded-lg p-3 text-sm', message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100']"></div>
                    </div>
                </div>
            </div>
            <div class="border-t border-gray-200 bg-white p-4">
                <h1 v-if="chatList.length == 0" class="text-3xl font-semibold mb-8 text-center">有什么可以帮忙的?</h1>
                <div class="w-full max-w-4xl mx-auto">
                    <div class="relative">
                        <textarea
                            v-model="inputText"
                            placeholder="你想问什么呢"
                            rows="1"
                            class="w-full p-4 border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200 ease-in-out shadow-md resize-none overflow-hidden"
                            style="width: -webkit-fill-available"
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
import { ref, onMounted, watch, nextTick } from 'vue';
const { VITE_PROXY_DOMAIN_REAL, VITE_STATIC_URL, VITE_PROXY_DOMAIN } = import.meta.env;
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/github.css'; // 引入样式

// 初始化 markdown-it 并启用代码高亮
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(str, { language: lang }).value;
            } catch (__) {}
        }
        return ''; // 使用默认的 <pre> 包裹
    },
});

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
// 发送消息
// const sendMessage = async () => {
//     if (!inputText.value) return;
//     // inputText.value = inputText.value.replace(/\n/g, '<br>');
//     // 添加用户消息
//     chatList.value.push({
//         role: 'user',
//         content: inputText.value,
//     });
//     // chatList.value.push({
//     //     role: 'assistant',
//     //     content: '正在思考...',
//     // });
//     let prompt = inputText.value;
//     const eventSource = new EventSource(`${VITE_STATIC_URL}ai/stream?prompt=${encodeURIComponent(prompt)}`);

//     let result = ''; // 用来拼接流式响应内容
//     // 处理接收到的数据
//     eventSource.onmessage = event => {
//         requestAnimationFrame(() => {
//             result += event.data;
//             // 使用 markdown-it 渲染 Markdown 内容
//             const renderedContent = md.render(result);
//             if (chatList.value.length > 0) {
//                 const lastIndex = chatList.value.length - 1;
//                 if (chatList.value[lastIndex].role === 'assistant') {
//                     chatList.value[lastIndex].content = renderedContent;
//                 } else {
//                     // 否则，添加新的一项作为助手的回答
//                     chatList.value.push({
//                         role: 'assistant',
//                         content: renderedContent,
//                     });
//                 }
//             } else {
//                 // 如果没有项目，添加第一项作为助手的回答
//                 chatList.value.push({
//                     role: 'assistant',
//                     content: result,
//                 });
//             }
//             nextTick(() => {
//                 scrollToBottom();
//             });
//         });
//     };
//     // 错误处理
//     eventSource.onerror = error => {
//         console.error('EventSource 发生错误', error);
//         eventSource.close();
//     };
//     // 当连接打开时
//     eventSource.onopen = async () => {
//         console.log('连接已打开');
//         adjustTextareaHeight({ target: document.querySelector('textarea') });
//         // 滚动到底部
//         await nextTick();
//         scrollToBottom();
//     };
//     // 监听结束事件
//     eventSource.addEventListener('end', () => {
//         console.log('数据流结束');
//         console.log('最终响应:', result);
//         eventSource.close();
//     });
//     // 清空输入框
//     inputText.value = '';
// };

const sendMessage = async () => {
    if (!inputText.value) return;

    // 添加用户消息
    chatList.value.push({
        role: 'user',
        content: inputText.value,
    });

    let prompt = inputText.value;
    const eventSource = new EventSource(`${VITE_STATIC_URL}ai/stream?prompt=${encodeURIComponent(prompt)}`);

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

            // 更新最后一项内容
            chatList.value[lastIndex].content = renderedContent;

            // 滚动到底部
            nextTick(() => {
                scrollToBottom();
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
// 滚动到底部
const scrollToBottom = () => {
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
};

// 处理消息内容，进行代码高亮和清理
// 处理消息内容，进行代码高亮和清理
const processMessageContent = content => {
    // 使用 DOMPurify 清理 HTML 内容，防止 XSS 攻击
    const cleanContent = DOMPurify.sanitize(content);

    // 处理代码块（使用 pre 和 code 标签包裹）
    const codeBlockRegex = /```(.*?)```/gs;
    let formattedContent = cleanContent.replace(codeBlockRegex, (match, code) => {
        // 使用 highlight.js 对代码块进行高亮
        const highlightedCode = hljs.highlightAuto(code).value;
        return `<pre class="bg-gray-800 text-white p-4 rounded"><code class="hljs">${highlightedCode}</code></pre>`;
    });

    // 将换行符替换为 <br> 标签
    formattedContent = formattedContent.replace(/\n/g, '<br>');

    return formattedContent;
};
// 复制消息内容
const copyMessage = async text => {
    try {
        await navigator.clipboard.writeText(text);
        alert('复制成功！');
    } catch (err) {
        console.error('复制失败：', err);
    }
};

onMounted(() => {
    adjustTextareaHeight({ target: document.querySelector('textarea') });
    checkWindowSize();
    window.addEventListener('resize', checkWindowSize);
    // chatList.value[0].content = processMessageContent(chatList.value[0].content);
    // setTimeout(() => {
    //     show.value = true;
    // }, 0);
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
    border-radius: 5px;
    overflow-x: auto;
    display: block;
    background: #2c2c36;
    color: rgb(248, 248, 242);
    padding: 16px 8px;
    margin: 0px;
    font-size: 13px;
}

code {
    font-family: 'Courier New', monospace;
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
