<template>
    <div class="flex h-screen overflow-hidden">
        <!-- 左侧边栏 -->
        <div :class="['bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-100 ease-in-out', isSidebarOpen ? 'w-64' : 'w-0']">
            <!-- 固定的顶部Logo部分 -->
            <div class="p-4" v-if="isSidebarOpen">
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
        </div>

        <!-- 主要内容区域 -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <!-- 固定的顶部栏 -->
            <div class="h-16 border-b border-gray-200 flex items-center px-4 flex-shrink-0">
                <button @click="toggleSidebar" class="mr-4 focus:outline-none">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <div class="flex-1 flex items-center">
                    <span class="text-xl font-semibold">ChatGPT</span>
                </div>
            </div>

            <!-- 可滚动的聊天区域 -->
            <div class="flex-1 overflow-auto custom-scrollbar p-4" :class="[chatList.length > 0 ? 'h-16' : 'max-h-18']" ref="chatContainer">
                <!-- 增加固定的空白区域 定死高度 -->
                <!-- <div v-if="chatList.length > 0" class="h-10 flex flex-col gap-4 p-4"></div> -->
                <!-- 聊天消息列表 -->
                <div v-for="(message, index) in chatList" :key="index" class="w-full max-w-4xl mx-auto mb-5">
                    <div :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']">
                        <div style="white-space: pre-wrap" :class="['max-w-[80%] rounded-lg p-3 text-sm', message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100']">
                            {{ message.content }}
                        </div>
                    </div>
                    <!-- 消息操作按钮 -->
                    <!-- <div v-if="message.role === 'assistant'" class="flex items-center gap-2 mt-2 text-gray-500 text-sm">
                        <button class="hover:text-gray-700" @click="copyMessage(message.content)">
                            <span>复制</span>
                        </button>
                        <button class="hover:text-gray-700">
                            <span>👍</span>
                        </button>
                        <button class="hover:text-gray-700">
                            <span>👎</span>
                        </button>
                    </div> -->
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

const inputText = ref('');
const textareaHeight = ref(84); // 初始高度
const isSidebarOpen = ref(true);
// 当前回话内容的list
const chatList = ref([]);
const chatContainer = ref(null);

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
const sendMessage = async () => {
    if (!inputText.value) return;
    // inputText.value = inputText.value.replace(/\n/g, '<br>');
    // 添加用户消息
    chatList.value.push({
        role: 'user',
        content: inputText.value,
    });
    // chatList.value.push({
    //     role: 'assistant',
    //     content: '正在思考...',
    // });
    let prompt = inputText.value;
    const eventSource = new EventSource(`${VITE_STATIC_URL}ai/stream?prompt=${encodeURIComponent(prompt)}`);

    let result = ''; // 用来拼接流式响应内容
    // 处理接收到的数据
    eventSource.onmessage = event => {
        requestAnimationFrame(() => {
            result += event.data;
            if (chatList.value.length > 0) {
                const lastIndex = chatList.value.length - 1;
                if (chatList.value[lastIndex].role === 'assistant') {
                    chatList.value[lastIndex].content = result;
                } else {
                    // 否则，添加新的一项作为助手的回答
                    chatList.value.push({
                        role: 'assistant',
                        content: result,
                    });
                }
            } else {
                // 如果没有项目，添加第一项作为助手的回答
                chatList.value.push({
                    role: 'assistant',
                    content: result,
                });
            }
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
    // 当连接打开时
    eventSource.onopen = async () => {
        console.log('连接已打开');
        adjustTextareaHeight({ target: document.querySelector('textarea') });
        // 滚动到底部
        await nextTick();
        scrollToBottom();
    };
    // 监听结束事件
    eventSource.addEventListener('end', () => {
        console.log('数据流结束');
        console.log('最终响应:', result);
        eventSource.close();
    });
    // 清空输入框
    inputText.value = '';
    // adjustTextareaHeight({ target: document.querySelector('textarea') });
    // // 滚动到底部
    // await nextTick();
    // scrollToBottom();
    // 模拟AI回复
    // setTimeout(() => {
    //     chatList.value.push({
    //         role: 'assistant',
    //         content:
    //             '你好！我是ChatGPT，一个AI助手，能帮你解答问题、讨论各种话题，或者提供编程、技术等方面的帮助。有需要帮忙的吗？你好！我是ChatGPT，一个AI助手，能帮你解答问题、讨论各种话题，或者提供编程、技术等方面的帮助。有需要帮忙的吗？你好！我是ChatGPT，一个AI助手，能帮你解答问题、讨论各种话题，或者提供编程、技术等方面的帮助。有需要帮忙的吗？',
    //     });
    //     nextTick(() => {
    //         scrollToBottom();
    //         console.log(chatList.value, '6666');
    //     });
    // }, 1000);
};

// 滚动到底部
const scrollToBottom = () => {
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
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
