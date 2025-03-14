<template>
    <div class="flex h-screen overflow-hidden">
        <!-- 移动端遮罩层 - 仅在移动端且侧边栏打开时显示 -->
        <div v-if="isSidebarOpen && isMobile" class="fixed inset-0 bg-black bg-opacity-50 z-40" @click="closeSidebar"></div>
        <!-- <img
            style="width: 100px; height: 100px"
            :src="img"
        ></img> -->
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
                        <span class="font-semibold">ChatGPT11</span>
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
                    <span class="text-xl font-semibold">ChatGPT</span>
                </div>
            </div>

            <!-- 可滚动的聊天区域 -->
            <div @scroll="onScroll" class="flex-1 overflow-auto custom-scrollbar p-4" :class="[chatList.length > 0 ? 'h-16' : 'max-h-18']" ref="chatContainer">
                <!-- 聊天消息列表 -->
                <div v-for="(message, index) in chatList" :key="index" class="w-full max-w-5xl mx-auto mb-5 overflow-auto">
                    <div :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']">
                        <div
                            v-html="message.content"
                            :class="['rounded-lg overflow-hidden p-3 text-sm py-0', message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 w-full']"
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
import { getCurrentInstance, ref, onMounted, watch, nextTick, computed } from 'vue';
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
// const img = ref('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAFACAIAAABC8jL9AAAACXBIWXMAAA7EAAAOxAGVKw4bAAARHklEQVR4nO3daVMb15rA8XNOtzaE2DEgg7FZzGpjO\/Fys98kldTMfIr5GPNxUjOv5uVU3RdzMzN36k5u3SR2Ei8Y8AIOeMF4BcQiCbV6XrjKdhyQWtC0z4P\/v0pVqhwsdZD+nJb09EGrZ7MKgEzmbR8AgN0jYEAwAgYEI2BAMAIGBCNgQDACBgQjYEAwAgYEcyv\/Z7+5L5rjsJB+Plf1a8L6\/oR1X7bdThBR3pdElb8\/rMCAYAQMCEbAgGAEDAhGwIBgBAwIRsCAYAQMCEbAgGAEDAhGwIBgVWahgwgyy2qbd3mON8p56SjZdjxB7P25wQoMCEbAgGAEDAhGwIBgBAwIRsCAYAQMCEbAgGAEDAhGwIBgBAwIFsIsdBBRzgPbNhMb5bx0WDPMYX0PbZupPnjPQ1ZgQDACBgQjYEAwAgYEI2BAMAIGBCNgQDACBgQjYEAwAgYEI2BAsIhmoQ+qKPeXjtJB\/f86eFiBAcEIGBCMgAHBCBgQjIABwQgYEIyAAcEIGBCMgAHBCBgQjIABwZiF3hPbZn1t24cZ+40VGBCMgAHBCBgQjIABwQgYEIyAAcEIGBCMgAHBCBgQjIABwQgYECyiWWjmbyuzbR\/mILcT5Jhtm80+eM9DVmBAMAIGBCNgQDACBgQjYEAwAgYEI2BAMAIGBCNgQDACBgQjYECwEGahw5rjlSjKWd+w5pNtu52wvJvPQ1ZgQDACBgQjYEAwAgYEI2BAMAIGBCNgQDACBgQjYEAwAgYEI2BAMK2ezb7tYzjgJM4VR+ng7dUcJVZgQDACBgQjYEAwAgYEI2BAMAIGBCNgQDACBgQjYEAwAgYEI2BAsBD2hQ5C4jywxP2Tw5orjnK\/6yjvKwhZ\/++swIBgBAwIRsCAYAQMCEbAgGAEDAhGwIBgBAwIRsCAYAQMCEbAgGBVZqHDmguVOA98UO8rynnyd\/m+wuqiMlZgQDACBgQjYEAwAgYEI2BAMAIGBCNgQDACBgQjYEAwAgYEI2BAsCqz0BL3ag4iyrnr\/d5n2C2pRNEki7o55\/zbRsfSor+66q+t+cV8eTOvlVKppB9Pmvp63dCgO7r0YN29Zw1eIebnE2XP2fXdhoZ58r2IaGN37If0hm5bcY8sxY8sxXoX4+lN879+6bX\/rl\/8azOvN\/P+yrJ\/X6npKfXPumW13nvQVrrdXXjQtvWksbRe57+V48feEbA82lf1G6ZnKTY8nzy6GD+0XNuD6Pi6Oec259yxO8lHTaX5zsLc4eLs4WIuXfb1Ph0y9gsByzNyJ3HmZir7ONa45jh7a+7Qstu27AwvJB+0bf1yfPPy8XxYB4loELAkDevm6+8zQwuJVN7sMd2XjNKZDWdwwXQ\/ih97EP\/rqfWnTV4ot4wIELAMyYIeuZP44qdM28q+PGRG6XRen59KD95N\/M\/7a9f684U4L4wFIGABmnLm4yv1Z6fq4qV9f5HaknP\/6W8NnU\/d7ybWlzPl\/b477BEB2679ufvFxfrxuaRbjugtplTRXJhM1xXMX86sP24uVf8LeHsI2GrZx+5XP2SGF5IR369b1hM3U3Wb5s\/ncw\/aadheTGLZq\/25+9UPmcG7ibdy746vB+8mvvoh0\/6cn\/L2ImBLNeXMH39OD95NhPVu8y44vh5eSH5xsb4px\/PEUvxwtVGiqD+6kj55K1VrvcmU7u427muP6sqKv\/hgT+9Fjc8l1+vK357N5RO8L22dEPaFDiLKmeqwZo+D3M4+zcSemE2+N1O3i3etTp12\/vBBLP7aSffdhfKf\/qO4srL79tyyPjtVd6+t+MtwzWMeUc45ByHx+Vz5vjg1sk7rsvP5pfpUseaHJnvYnJxw4799ydzRacZPOrHYng4pXtJfXso0rPNssQ4PiXU+uZxuydX80sZx1PhJp6HxzUU7HlfDI+7h7r1edtS66n79fWaPN4LQ8RrYItpXE7eS43OpWv+iMWpwyOnvd5ztOm1r16NjzupKubi14y34ZbW56ZcrvlgeWkiMziWmjxW45sEeBGyRzLo5fTOVytfcR2OjHj+xzfL70vEh09Ye39ra8ZVwoaAu\/VhamK9UcCpvztxM3e3YyqWZ0LIFAVuk\/348+yRmVG0BO4460ut0VzxJTiR1V7bKzcbj+uFioVjc+Y58nX0c61mKTfUVajpC7B9eA9sivaH77sfTGzU\/Io2NeuK0k9jzsNbhbjM0UuUHeuOaMzyfTG9wDm0LArZF24rb+zBR6\/KrlBo76XR0hvA4uq46856TTFY6AMfXRxfj+3RFFHaBgK3geCr7JFZ1bw2tVTKl6zOv\/nFdtbXzSW+tWtvM++eqHMOhZffIUtxlPtoO\/Ci1QrJgBu5Vn3lubNLnzrutba8WyWtXvKlJb3gknEXY8\/z19eojH0eWYj8fNyWXt7LePgK2QmJLZ59UeSyMUaNjztgJNx5\/9YfpevPoUeHqFe\/TFvP6n+\/OoyX\/xnT17Th6F+PJol6v2+vdYe84hbZCy6rTsFZl1qKzywwed96otLVVnzrt3r7p3ZkLYR+cSz+WNjaqr8DpTdOcs2BDWkS2L\/R+741c6+1EORMbxCdP6ypft5BM6dFx59ChbX7g9g04M9Pe9HWvq8tU+Ci4qtu3vLnZQD8FHF9nn7q3e6q\/+I7y+2zDHt212vt9cQpthcOPqpz+HjqkBwcds92yl8no0++5\/\/3t1r9+U0intQ6csDHq9S9+9KjsBV7FDz+KK7UR9KuxbwjYCk3Vzp9LJVXc8tV2HzIZo470mv4B59qV0lou6FVHbW0m261d59UNNjXrG9NeKdjby1UPGNEgYCvUV5vfePq0PDPtnT1rth3YqKvTwyPO3QXv2dNAASeT+twf3NGx38xOe54qFoq3bgZahaseMKLBw2CFukKVE99CXk1Neo8f7\/jJTXePGRoOdNmgMaqv3xw9at648sFx1LkLblNzoFPwqgeMaBCwFRKF6g\/E8nN\/ZtorFLZfY11XnZhw0+nqXTU26pExpz6zzVd2dpqTE4FOyoIcMCLAwyCG76vr17xf7+y4CDc3648\/i5mKD6njqGP95lifs+17XW5M9Q+a7h4T\/J0wvF0EbIVCItBUUz7vf\/\/3UoX3mUbHnMPdlR7TtnZz+r3YtpcNv9DaYsZPVF\/JAx4w9hsBW2Ej8H5xDx+UZyoOS5097yZ2viDh5Cmnra3i5QquGjhuurJVFuHgB4x9RcBWWKurYUG79GPpyZMd+znS64yf2H6F7cya0dHqH\/+k03p03EmlKhVc0wFj\/xCwFZbraxiEfPqkfP3ajqfRiYQaGnZaWt\/Mz3XV+QtusmKWLw0MOv0DlVKv6YCxfwjYCvcP1XBNYKmklh76uZ1nNrqy5uTEb06ktVaj407v0aAPt++\/mBvZUU0HjP0T0SBHWPOlYc2yRjkvHcQ3R9v\/\/e9FP9jrykRCHeszme0+B3rBdVX\/gDM3691d8F\/cZmurHht3K1+s\/5Lvqxsz3sKvO54ka62+Odp+tFneMJbEOfnKWIGt0Nio0+mgX9zRacZ2eJX7Ulu7Hhpx4gmtlIrF1PCoW\/V9qZeWl\/2pyVI+v+OPk4YG3dTEB01WIGArxBO68sc\/r7vwQayurno\/wyNOb69RSrW0mr5+E3Bvd6+kZm95i4vlCqcDHR06FidgKzALbYVEQmW7zY2Z6m\/tDgwGfSlbV6e7e8z8fHn8hHOoY\/u\/4vtqebn85PGrWJ898y\/\/VMpvVrrl3mNOMupfeIrtEbAVXFdns6alVVe9GmFry\/c8VXnc6oX1df\/GjNfVpU+d2X7Dd6VULuf\/139uzc3W8JlQS6s+1KEdhxXYCpxC26K5JdAM4\/yv5ckr1S\/5K3tqatJbfu6fu+C67o43evumN19xM\/ffO9ytm1t42tiCR8IW6bTuHzCZhuor2+XLXtXfNvjkSfnGjHeszxzr2\/HtrrWc\/+MPJa+W\/SXTaXWk1wlyyQSiQcAW6cqazq7qW2osPy9fu+Jt7fyLjgoFNTPtbW76Z96v9BLp6hVvZbm2icjOTtN7VN6nRwcYr4EtUl+vx8adewvljYqb1RSL6tqVUqHgN+9w7e7qqj993Rs74bS27fgD+u5CefJqbZs7p1JqdNypr2f5tQgBW0RrfXzIvXWzPHm1yqDi6qp\/6ccq+a2u+J63\/S48+U3\/0sWt5RqX36FhZ3ScJ4xdOIW2zqefuY1hjEncvuU9uL9NouWympstLz7wAw5+vdDQqM9eoF7rELB16jPmo09cd8+xFArq4g+l4u9+keDKsn990sut1pBvIqE+\/Mht4c1n+1R5moQ1exzlfKlt97WLmdiBQefh6fIvP3mVf+N2VffvedeuliZOv\/pxUCyqqcnS3YUariUqGf+7ofV\/6VzLP\/9N8wfg+7yvtxMNTopslEzqc+fdjXU1PbWnq\/ZKJfXdX0u\/\/Fx6+dZ2ueyvr6sK72C\/wdP+1cHN7ybW81zBbyUCtlRDo\/nwY7dQ8O\/MVRpLriqf9\/N5pdRubsLT\/q2ewl\/OrC9nuHzfUryqsVdrm\/n409ixvre2xdytnsKfz+ceN\/OrRO1FwFbr7DKffxkbGzdBhp9DVDL+5YHNP32Ye9BOvVbjFNp2L9bhVKp09YpX+N1byvvBddXfRjf+b2KNM2f7sQIL0NBoPvg49vmXsb388sGAGpv0V\/8Q+\/ZsjnpFYAWWIZnUJ0+53UfMxe9LN2a8zYrX6+6C1iqVUn0DzqefufUZ88YnRrAWAUvS0mK+\/sd4z5HS1KT38GF5fT2E29RaZRp0Z5ceG3eOD\/F8EIYHTJ6RMben15n\/1VuY9+7f8wP+RsJttbTq7h7TP2C6soarFCQiYHm0VpmMHj\/hHutznj8rP1ry5+94S0v+6mqg8WatVTqtDnebbLfJZk1zi+H6XrkIWLB0WqfTTlfWHxpxtor+8rK\/tFReWvRXV\/21Nb+YL2\/mtVIqlfTjSVNfrxsadEeX7ugwjY06ntCJhKqwWQdE0OrZ7B5v4qDOxIblXT5m2\/ZYPnjPVT5GAgQjYEAwAgYEI2BAMAIGBCNgQDACBgQjYEAwAgYEI2BAMAIGBItoX+ggwppTte2+DqqD+nhFub\/03vtiBQYEI2BAMAIGBCNgQDACBgQjYEAwAgYEI2BAMAIGBCNgQDACBgQLYV\/od5ltM7pR7udsz97IwR28\/a5ZgQHBCBgQjIABwQgYEIyAAcEIGBCMgAHBCBgQjIABwQgYEIyAAcFC2Bf6oAoypxrlnti2zfFGybaZ6rC+z+wLDbzTCBgQjIABwQgYEIyAAcEIGBCMgAHBCBgQjIABwQgYEIyAAcGqzEIHEeUMaljCmgeOcn9ge\/YifsG2PbHfTazAgGAEDAhGwIBgBAwIRsCAYAQMCEbAgGAEDAhGwIBgBAwIRsCAYCHMQgfB3GxlUX5\/wtpjOcq9kSWK5nnICgwIRsCAYAQMCEbAgGAEDAhGwIBgBAwIRsCAYAQMCEbAgGAEDAgW0Sz0QRXlfs5B2DZXHNb3J8r5dtv2366MFRgQjIABwQgYEIyAAcEIGBCMgAHBCBgQjIABwQgYEIyAAcEIGBCMWeg9kbjfdVh7NUc552zbvHSUj0Xl+2IFBgQjYEAwAgYEI2BAMAIGBCNgQDACBgQjYEAwAgYEI2BAMAIGBItoFjrKOdUo2bYvdBD2zPGGS9Z+zmFhBQYEI2BAMAIGBCNgQDACBgQjYEAwAgYEI2BAMAIGBCNgQDACBgQLYRbatlnfd5lt88lhkThTHQ1WYEAwAgYEI2BAMAIGBCNgQDACBgQjYEAwAgYEI2BAMAIGBCNgQDCtns2+7WMAsEuswIBgBAwIRsCAYAQMCEbAgGAEDAhGwIBgBAwIRsCAYP8PiS8qANro1e8AAAAASUVORK5CYII=')

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
    const eventSource = new EventSource(`${VITE_STATIC_URL}ai/stream?prompt=${encodeURIComponent(prompt)}&conversationId=${encodeURIComponent(conversationId.value)}`);

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
});

const actions = [{ icon: '🖼️', text: '创建图片' }];
</script>

<style>
/* 导入样式文件 */
@import '../../assets/css/ai.css';
</style>
