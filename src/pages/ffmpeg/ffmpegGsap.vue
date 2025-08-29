<template>
    <div class="frame-body">
        <div class="loading-screen" id="loadingScreen">
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
            <div class="loading-text">正在加载帧动画...</div>
            <div class="loading-progress">
                <div class="loading-fill" ref="loadingFill" id="loadingFill"></div>
            </div>
            <div class="loading-percentage" ref="loadingPercentage">0%</div>
        </div>
        <section class="hero-section">
            <div class="video-container">
                <video ref="heroVideo" :src="`${proxy.$api.baseUrl}/${fromData.filepath}`" muted autoplay loop></video>
                <div class="video-overlay"></div>
            </div>
            <div class="hero-content">
                <h1 class="hero-title">GSAP动画</h1>
                <h2 class="hero-video">当前是video</h2>
            </div>
            <div class="scroll-hint">
                <div class="scroll-icon">
                    <div class="scroll-wheel"></div>
                </div>
                <span class="scroll-text">向下滚动</span>
            </div>
        </section>
        <div class="frame-container">
            <div class="frame-sticky">
                <div class="frame-wrapper">
                    <img ref="frameImg" class="frame-img" :src="`${proxy.$api.baseUrl}/${fromData.frames[0]}`" />
                    <div class="frame-overlay">
                        <p class="hero-subtitle">滚动帧动画</p>
                    </div>
                </div>
            </div>
        </div>
        <!-- 添加第三屏横向滚动图片画廊 -->
        <section class="gallery-section">
            <div class="gallery-sticky">
                <div class="gallery-header">
                    <h2 class="gallery-title">图片画廊</h2>
                    <p class="gallery-subtitle">横向滚动浏览</p>
                </div>
                <div class="gallery-container" ref="galleryContainer">
                    <div class="gallery-track" ref="galleryTrack">
                        <div v-for="(frame, index) in fromData.frames" :key="index" class="gallery-item">
                            <img :src="`${proxy.$api.baseUrl}/${frame}`" :alt="`Frame ${index + 1}`" class="gallery-img" />
                            <div class="gallery-item-overlay">
                                <span class="gallery-item-number">{{ index + 1 }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <section class="end-section">
            <div class="end-content">
                <h2 class="end-title">动画完成</h2>
                <p class="end-subtitle">感谢观看</p>
            </div>
        </section>
    </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const { proxy } = getCurrentInstance();
const loadingFill = ref(null);
const loadingPercentage = ref(null);
const fromData = ref({
    frames: [],
});
const frameImg = ref(null);
const heroVideo = ref(null);
const galleryContainer = ref(null);
const galleryTrack = ref(null);

const getData = async () => {
    let res = await proxy.$api.getVideoFrames({ id: proxy.$route.query.idkey });
    fromData.value = res.data;
    console.log('详情', fromData.value);
    preloadImages();
};

const initScrollAnimation = () => {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());

    gsap.timeline({
        scrollTrigger: {
            trigger: '.hero-section',
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
            pin: true,
        },
    })
        .to('.hero-title', {
            opacity: 0,
            y: -50,
            duration: 0.5,
            ease: 'power2.out',
        })
        .fromTo('.hero-video', { opacity: 0, scale: 0.8, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0.3);

    if (!fromData.value.frames.length) return;

    const frameCount = fromData.value.frames.length;
    let obj = { frame: 0 };

    // const scrollDistance = Math.max(frameCount * 100, 3000);
    const galleryScrollDistance = Math.max(frameCount * 100, 3000);

    // console.log('frameCount', frameCount * 100, window.innerHeight * 2);
    // console.log('scrollDistance', scrollDistance, galleryScrollDistance);

    // gsap.set('.frame-body', {
    //     height: window.innerHeight * 2 + scrollDistance + galleryScrollDistance + window.innerHeight,
    // });
    // scrollDistance;
    gsap.to(obj, {
        frame: frameCount - 1,
        snap: 'frame',
        ease: 'none',
        scrollTrigger: {
            trigger: '.frame-container',
            start: 'top top',
            end: () => `+=${(frameCount * window.innerHeight) / 4}`,
            scrub: 0.5,
            pin: '.frame-sticky',
            anticipatePin: 1,
            // 动态撑开容器，不需要手动设 body 高
        },
        onUpdate: () => {
            const frame = Math.round(obj.frame);
            if (frameImg.value && fromData.value.frames[frame]) {
                frameImg.value.src = `${proxy.$api.baseUrl}/${fromData.value.frames[frame]}`;
            }
        },
    });

    gsap.fromTo(
        '.hero-subtitle',
        { scale: 1.2, opacity: 1 },
        {
            scale: 0.6,
            opacity: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: '.frame-container',
                start: 'top top',
                end: `+=${frameCount * window.innerHeight}`,
                scrub: 1,
            },
        },
    );

    if (galleryTrack.value) {
        const galleryItems = galleryTrack.value.children;
        const totalWidth = galleryItems.length * (300 + 20); // 每个item宽度300px + 间距20px

        gsap.set(galleryTrack.value, {
            width: totalWidth + 'px',
        });

        gsap.fromTo(
            galleryTrack.value,
            { x: window.innerWidth },
            {
                x: -totalWidth + window.innerWidth,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.gallery-section',
                    start: 'top top',
                    end: `+=${window.innerHeight}`,
                    scrub: 1,
                    pin: '.gallery-sticky',
                    anticipatePin: 1,
                    scrub: 0.5,
                    onUpdate: self => {
                        // console.log(`${Math.round(self.progress * 100)}%`);
                    },
                },
            },
        );

        gsap.fromTo(
            '.gallery-header',
            { opacity: 1, y: 0 },
            {
                opacity: 0,
                y: -50,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: '.gallery-section',
                    start: 'top top',
                    end: `+=${galleryScrollDistance * 0.3}`,
                    scrub: 1,
                },
            },
        );
    }

    gsap.fromTo(
        '.end-section',
        { opacity: 0, y: 100 },
        {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: '.end-section',
                start: 'top 90%',
                end: 'top 10%',
                scrub: 1,
            },
        },
    );
};

const preloadImages = () => {
    const totalFrames = fromData.value.frames.length;
    let loadedFrames = 0;

    fromData.value.frames.forEach(frame => {
        const img = new Image();
        img.src = `${proxy.$api.baseUrl}/${frame}`;
        img.onload = () => {
            loadedFrames++;
            const progress = (loadedFrames / totalFrames) * 100;

            if (loadingFill.value) {
                gsap.to(loadingFill.value, {
                    width: `${progress}%`,
                    duration: 0.3,
                    ease: 'power2.out',
                });
            }

            if (loadingPercentage.value) {
                gsap.to(loadingPercentage.value, {
                    innerHTML: `${Math.round(progress)}%`,
                    duration: 0.3,
                    ease: 'power2.out',
                });
            }

            if (loadedFrames === totalFrames) {
                gsap.to('#loadingScreen', {
                    opacity: 0,
                    duration: 0.8,
                    ease: 'power2.out',
                    onComplete: () => {
                        document.getElementById('loadingScreen').style.display = 'none';
                        initScrollAnimation();
                    },
                });
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
    line-height: 1.6;
    overflow: hidden;
}

.loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    transition: opacity 0.8s ease;
}

.loading-spinner {
    margin-bottom: 2rem;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top: 3px solid #007aff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

.loading-text {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    opacity: 0.8;
    font-weight: 300;
}

.loading-progress {
    width: 320px;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 1rem;
}

.loading-fill {
    height: 100%;
    background: linear-gradient(90deg, #007aff, #00d4ff);
    width: 0%;
    border-radius: 3px;
    transition: width 0.3s ease;
}

.loading-percentage {
    font-size: 0.9rem;
    opacity: 0.6;
    font-weight: 500;
}

.hero-section {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 2rem;
}

.video-container {
    position: relative;
    width: 100%;
    max-width: 1200px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
}

.video-container video {
    width: 100%;
    height: auto;
    display: block;
}

.video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
}

.hero-content {
    position: absolute;
    text-align: center;
    z-index: 10;
}

.hero-title {
    font-size: clamp(2.5rem, 5vw, 4.5rem);
    font-weight: 700;
    margin-bottom: 1rem;
    background: linear-gradient(45deg, #fff, #007aff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
}

.hero-video {
    font-size: clamp(1.2rem, 3vw, 2rem);
    opacity: 0;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.9);
}

.scroll-hint {
    position: absolute;
    bottom: 4rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    opacity: 0.7;
    animation: float 3s ease-in-out infinite;
}

.scroll-icon {
    width: 30px;
    height: 50px;
    border: 2px solid rgba(255, 255, 255, 0.5);
    border-radius: 15px;
    position: relative;
    margin-bottom: 0.5rem;
}

.scroll-wheel {
    width: 4px;
    height: 8px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 2px;
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    animation: scroll-wheel 2s ease-in-out infinite;
}

.scroll-text {
    font-size: 0.8rem;
    font-weight: 300;
    opacity: 0.6;
}

@keyframes float {
    0%,
    100% {
        transform: translateX(-50%) translateY(0);
    }
    50% {
        transform: translateX(-50%) translateY(-10px);
    }
}

@keyframes scroll-wheel {
    0% {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
    100% {
        opacity: 0;
        transform: translateX(-50%) translateY(15px);
    }
}

.frame-container {
    min-height: 100vh;
    position: relative;
}

.frame-sticky {
    position: sticky;
    top: 0;
    width: 100vw;
    height: 100vh;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.frame-wrapper {
    position: relative;
    width: 90%;
    max-width: 1200px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
}

.frame-img {
    width: 100%;
    height: auto;
    object-fit: cover;
    display: block;
    will-change: transform;
}

.frame-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 10;
}

.hero-subtitle {
    font-size: clamp(1.5rem, 4vw, 2.5rem);
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    margin: 0;
}

.end-section {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
    position: relative;
}

.end-content {
    text-align: center;
    z-index: 10;
}

.end-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 700;
    margin-bottom: 1rem;
    background: linear-gradient(45deg, #007aff, #00d4ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.end-subtitle {
    font-size: 1.2rem;
    opacity: 0.7;
    font-weight: 300;
}

/* 添加第三屏画廊样式 */
.gallery-section {
    position: relative;
}

.gallery-sticky {
    position: sticky;
    top: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
}

.gallery-header {
    position: absolute;
    top: 10%;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    z-index: 10;
}

.gallery-title {
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 700;
    margin-bottom: 0.5rem;
    background: linear-gradient(45deg, #007aff, #00d4ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.gallery-subtitle {
    font-size: 1.2rem;
    opacity: 0.7;
    font-weight: 300;
    margin: 0;
}

.gallery-container {
    width: 100%;
    height: 60%;
    display: flex;
    align-items: center;
    overflow: hidden;
}

.gallery-track {
    display: flex;
    gap: 20px;
    height: 100%;
    align-items: center;
}

.gallery-item {
    position: relative;
    width: 300px;
    height: 400px;
    flex-shrink: 0;
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s ease;
}

.gallery-item:hover {
    transform: scale(1.05);
}

.gallery-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.gallery-item-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
    padding: 20px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
}

.gallery-item-number {
    font-size: 1.2rem;
    font-weight: 600;
    color: #fff;
    background: rgba(0, 122, 255, 0.8);
    padding: 8px 16px;
    border-radius: 20px;
    backdrop-filter: blur(10px);
}

@media (max-width: 768px) {
    .hero-section {
        padding: 1rem;
    }

    .video-container {
        border-radius: 15px;
    }

    .frame-wrapper {
        width: 95%;
        height: 70%;
        border-radius: 15px;
    }

    .scroll-hint {
        bottom: 2rem;
    }

    .loading-progress {
        width: 280px;
    }

    .gallery-item {
        width: 250px;
        height: 320px;
    }

    .gallery-title {
        font-size: 2rem;
    }
}

@media (max-width: 480px) {
    .hero-section {
        padding: 0.5rem;
    }

    .loading-progress {
        width: 240px;
    }

    .gallery-item {
        width: 200px;
        height: 280px;
    }
}
</style>
