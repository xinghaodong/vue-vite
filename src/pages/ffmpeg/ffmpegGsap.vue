<template>
    <div class="frame-body">
        <!-- 加载 -->
        <div class="loading-screen" id="loadingScreen">
            <div class="loading-text">正在加载帧动画...</div>
            <div class="loading-progress">
                <div class="loading-fill" ref="loadingFill" id="loadingFill"></div>
            </div>
        </div>

        <!-- 第一屏 -->
        <section class="hero-section">
            <div class="hero-content">
                <h1 class="hero-title">苹果风格动画</h1>
                <p class="hero-subtitle">滚动帧动画</p>
            </div>
            <div class="scroll-hint">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
            </div>
        </section>

        <!-- 第二屏 -->
        <div class="frame-container">
            <div class="frame-sticky">
                <div class="frame-box" v-for="(item, index) in fromData.frames" :key="index">
                    <img :src="`${proxy.$api.baseUrl}/${item}`" alt="" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
// 注册 ScrollTrigger
gsap.registerPlugin(ScrollTrigger);
const { proxy } = getCurrentInstance();
const loadingFill = ref(null);
const fromData = ref({
    frames: [],
});
const getData = async () => {
    let res = await proxy.$api.getVideoFrames({ id: proxy.$route.query.idkey });
    fromData.value = res.data;
    console.log('详情', fromData.value);
    preloadImages();
};

// 初始化滚动动画
const initScrollAnimation = () => {
    const frameContainer = document.querySelector('.frame-container');
    const images = document.querySelectorAll('.frame-box img');
};

// 预加图片
const preloadImages = () => {
    const totalFrames = fromData.value.frames.length;
    let loadedFrames = 0;
    fromData.value.frames.forEach(frame => {
        console.log('图片地址', frame);
        const img = new Image();
        img.src = `${proxy.$api.baseUrl}/${frame}`;
        img.onload = () => {
            console.log('图片加载完成', img);
            loadedFrames++;
            const progress = (loadedFrames / totalFrames) * 100;
            if (loadingFill.value) {
                loadingFill.value.style.width = `${progress}%`;
            }
            if (loadedFrames === totalFrames) {
                document.getElementById('loadingScreen').style.opacity = 0;
                setTimeout(() => {
                    document.getElementById('loadingScreen').style.display = 'none';
                }, 500);
                initScrollAnimation();
            }
        };
    });
};

onMounted(() => {
    getData();
});
</script>

<style lang="css" scoped>
.frame-body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #000;
    color: #fff;
    overflow-x: hidden;
}

.hero-section {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

.hero-content {
    text-align: center;
    z-index: 10;
}

.hero-title {
    font-size: 4rem;
    font-weight: 700;
    margin-bottom: 1rem;
    background: linear-gradient(45deg, #fff, #ccc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.hero-subtitle {
    font-size: 1.5rem;
    opacity: 0.8;
    margin-bottom: 2rem;
}

.scroll-hint {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0.6;
    animation: bounce 2s infinite;
}

@keyframes bounce {
    0%,
    20%,
    50%,
    80%,
    100% {
        transform: translateX(-50%) translateY(0);
    }

    40% {
        transform: translateX(-50%) translateY(-10px);
    }

    60% {
        transform: translateX(-50%) translateY(-5px);
    }
}

.frame-container {
    height: 500vh;
    position: relative;
}

.frame-sticky {
    background: #000;
}

.frame-box {
    width: 100vw;
    height: 100vh;
}

.frame-canvas-wrapper {
    position: relative;
    width: 100vw;

    height: 90vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.frame-canvas {
    max-width: 100%;
    max-height: 100%;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(255, 255, 255, 0.1);
    transition: transform 0.3s ease;
}

.progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 4px;
    background: linear-gradient(90deg, #007aff, #00d4ff);
    z-index: 100;
    transform-origin: left;
    transform: scaleX(0);
}

.frame-counter {
    position: fixed;
    top: 2rem;
    right: 2rem;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 1rem 1.5rem;
    border-radius: 50px;
    font-weight: 600;
    z-index: 100;
}

.loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    transition: opacity 0.5s ease;
}

.loading-text {
    font-size: 1.5rem;
    margin-bottom: 2rem;
}

.loading-progress {
    width: 300px;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
}

.loading-fill {
    height: 100%;
    background: linear-gradient(90deg, #007aff, #00d4ff);
    width: 0%;
    transition: width 0.3s ease;
}

.end-section {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
}

.end-content {
    text-align: center;
}

.end-title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 1rem;
}

@media (max-width: 768px) {
    .hero-title {
        font-size: 2.5rem;
    }

    .hero-subtitle {
        font-size: 1.2rem;
    }

    .frame-canvas-wrapper {
        width: 95vw;
        height: 70vh;
    }

    .frame-counter {
        top: 1rem;
        right: 1rem;
        padding: 0.8rem 1.2rem;
    }
}
</style>
