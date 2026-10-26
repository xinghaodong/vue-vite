<template>
    <div class="login-page">
        <!-- 柔和的主题色氛围光晕 -->
        <div class="ambient-glow glow-1"></div>
        <div class="ambient-glow glow-2"></div>

        <div class="login-card">
            <!-- 探头小熊视窗  -->
            <div class="bear-avatar-wrapper">
                <div class="bear-circle">
                    <canvas ref="riveCanvasRef" class="bear-canvas"></canvas>
                </div>
            </div>

            <div class="card-header">
                <h2>欢迎登录</h2>
                <p>请输入您的账号和密码进入系统</p>
            </div>

            <el-form ref="ruleFormRef" :rules="rules" :model="ruleForm" class="modern-form">
                <el-form-item prop="username">
                    <el-input 
                        class="modern-input" 
                        v-model="ruleForm.username"
                        placeholder="请输入账号"
                        :prefix-icon="User"
                        clearable
                        @focus="onUsernameFocus"
                        @blur="onUsernameBlur"
                        @input="onUsernameInput"
                    ></el-input>
                </el-form-item>

                <el-form-item prop="password">
                    <el-input 
                        class="modern-input" 
                        type="password"
                        show-password
                        v-model="ruleForm.password"
                        placeholder="请输入密码"
                        :prefix-icon="Lock"
                        @focus="onPasswordFocus"
                        @blur="onPasswordBlur"
                        @keyup.enter="onSubmit(ruleFormRef)"
                    ></el-input>
                </el-form-item>

                <el-button 
                    class="submit-btn" 
                    type="primary"
                    size="large"
                    :loading="loading" 
                    :disabled="loading"
                    @click="onSubmit(ruleFormRef)"
                >
                    {{ loading ? '正在验证...' : '登 录' }}
                </el-button>
            </el-form>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import useUserInfoStore from '@/stores/user';
import menuStore from '@/stores/menu';
import useLayoutStore from '@/stores/layout';
import { initTheme } from '@/composables/useTheme.js';
import { storeToRefs } from 'pinia';
import { login as loginApi } from '@/api/auth';
import { Rive, Layout, Fit, Alignment, RuntimeLoader } from '@rive-app/canvas';
import bearRivUrl from '@/assets/5204-10423-bear.riv?url';

// 强制底层使用本地 WASM，彻底避免从海外 unpkg CDN 下载导致卡死/慢
RuntimeLoader.setWasmUrl('/rive.wasm');
RuntimeLoader.setWasmFallbackUrl(null);

const router = useRouter();
const userInfoStore = useUserInfoStore();
const layoutStore = useLayoutStore();
const { userInfo } = storeToRefs(userInfoStore);
const menuInfoStore = menuStore();
const { editableTabsValue, btnPermsArry } = storeToRefs(menuInfoStore);

// --- 🐻 Rive 交互小熊控制器 ---
const riveCanvasRef = ref(null);
let riveInstance = null;
let checkInput = null;
let lookInput = null;
let handsUpInput = null;
let successInput = null;
let failInput = null;
const loading = ref(false);

// 状态机实时状态与待触发标记
let currentBearState = 'idle';
let isPendingSuccess = false;

const initRive = () => {
    if (!riveCanvasRef.value) return;

    riveInstance = new Rive({
        src: bearRivUrl,
        canvas: riveCanvasRef.value,
        autoplay: true,
        stateMachines: 'State Machine 1',
        layout: new Layout({
            fit: Fit.Cover,
            alignment: Alignment.Center,
        }),
        onStateChange: (event) => {
            const states = event?.data || [];
            if (states.length > 0) {
                currentBearState = states[0];
                console.log('🐻 [Rive 状态机变更]:', currentBearState);
                // 一旦放手动作结束进入非 hands 状态（如 idle），若有待执行的成功动画，立刻触发！
                if (isPendingSuccess && !/hands/i.test(currentBearState)) {
                    console.log('🐻 [Rive] 放手动作完成，状态机精准触发欢呼大笑！');
                    if (successInput) successInput.fire();
                    isPendingSuccess = false;
                }
            }
        },
        onLoad: () => {
            riveInstance.resizeDrawingSurfaceToCanvas();
            const inputs = riveInstance.stateMachineInputs('State Machine 1');
            if (inputs) {
                checkInput = inputs.find(i => i.name === 'Check');
                lookInput = inputs.find(i => i.name === 'Look');
                handsUpInput = inputs.find(i => i.name === 'hands_up');
                successInput = inputs.find(i => i.name === 'success');
                failInput = inputs.find(i => i.name === 'fail');
            }
        },
    });
};

// 账号框聚焦：探头盯住输入框
const onUsernameFocus = () => {
    if (handsUpInput) handsUpInput.value = false;
    if (checkInput) checkInput.value = true;
    updateLookPosition();
};

// 账号框失焦：抬头发呆
const onUsernameBlur = () => {
    if (checkInput) checkInput.value = false;
};

// 账号打字：眼球追逐打字光标
const onUsernameInput = () => {
    if (checkInput && !checkInput.value) {
        checkInput.value = true;
    }
    updateLookPosition();
};

const updateLookPosition = () => {
    if (lookInput) {
        const length = ruleForm.username ? ruleForm.username.length : 0;
        lookInput.value = Math.min(Math.max(length * 5, 0), 100);
    }
};

// 密码框聚焦：害羞捂眼
const onPasswordFocus = () => {
    if (checkInput) checkInput.value = false;
    if (handsUpInput) handsUpInput.value = true;
};

// 密码框失焦：放下双手
const onPasswordBlur = () => {
    if (handsUpInput) handsUpInput.value = false;
};

onMounted(() => {
    initTheme(); // 自动对齐全局主题配置与色阶
    initRive();
});

onUnmounted(() => {
    if (riveInstance) {
        riveInstance.cleanup();
        riveInstance = null;
    }
});

const rules = {
    username: [
        { required: true, message: '请输入账号', trigger: 'blur' },
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
    ],
};

const ruleForm = reactive({
    username: '',
    password: '',
});
const ruleFormRef = ref(null);

const onSubmit = formEl => {
    // 防重复点击：若正在验证提交中，直接拦截
    if (!formEl || loading.value) return;

    // 1. 马上干失焦：强制退出输入状态（无论是回车还是直接点击按钮）
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }

    // 2. 马上通知小熊放下双手
    if (handsUpInput) handsUpInput.value = false;
    if (checkInput) checkInput.value = false;
    isPendingSuccess = false;

    // 封装欢呼庆祝触发器：状态机感知 + 脉冲兜底
    const triggerSuccess = () => {
        // 如果当前已经在正脸（非 hands 状态），立刻触发
        if (!/hands/i.test(currentBearState)) {
            if (successInput) successInput.fire();
        } else {
            // 否则挂起，等待 onStateChange 回到 Idle 后自动触发
            isPendingSuccess = true;
        }

        // 脉冲多点兜底：在 600ms, 900ms, 1200ms 重试触发（小熊进入 success 状态后重复 fire 完全无害）
        [600, 900, 1200].forEach(delay => {
            setTimeout(() => {
                if (successInput) {
                    successInput.fire();
                }
            }, delay);
        });
    };

    formEl.validate(async valid => {
        if (valid) {
            loading.value = true;
            try {
                const data = await loginApi(ruleForm);
                if (data.code == 200) {
                    triggerSuccess();

                    menuInfoStore.getPerms(data.data.perms);
                    userInfoStore.changeUserInfo(data.data.informationObject);

                    // 载入用户专属的布局与主题配置
                    const currentUid = data.data.informationObject?.id || data.data.informationObject?.userId;
                    layoutStore.initUserLayout(currentUid);

                    sessionStorage.setItem('token', data.data.token);
                    sessionStorage.setItem('refreshToken', data.data.refreshToken);
                    ElMessage.success(data.message || '登录成功');

                    // 成功时保持 loading 状态直到跳转，彻底防止重复点击
                    setTimeout(() => {
                        router.push('/index');
                    }, 2500);
                } else {
                    // 业务失败：关闭 loading 允许重新输入提交
                    loading.value = false;
                    setTimeout(() => {
                        if (failInput) failInput.fire();
                    }, 600);
                    ElMessage.error(data.message || '账号或密码错误');
                }
            } catch (error) {
                // 网络异常：关闭 loading 允许重新提交
                loading.value = false;
                setTimeout(() => {
                    if (failInput) failInput.fire();
                }, 600);
                ElMessage.error(error.message || '网络连接异常');
            }
        } else {
            // 表单校验未通过
            loading.value = false;
            setTimeout(() => {
                if (failInput) failInput.fire();
            }, 600);
            return false;
        }
    });
};
</script>

<style scoped>
/* 全局动态自适应系统主题变量 (不硬编码写死颜色) */
.login-page {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--el-bg-color-page, #f2f3f5);
    background-image: 
        radial-gradient(at 0% 0%, var(--el-color-primary-light-9, rgba(64, 158, 255, 0.08)) 0px, transparent 60%),
        radial-gradient(at 100% 100%, var(--el-color-primary-light-8, rgba(64, 158, 255, 0.12)) 0px, transparent 60%);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    transition: background-color 0.3s ease;
}

/* 氛围光晕，使用当前品牌主题色 */
.ambient-glow {
    position: absolute;
    width: 550px;
    height: 550px;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.35;
    pointer-events: none;
    transition: all 0.4s ease;
}
.glow-1 {
    top: -120px;
    left: -120px;
    background: radial-gradient(circle, var(--el-color-primary-light-5, #a0cfff) 0%, transparent 70%);
}
.glow-2 {
    bottom: -120px;
    right: -120px;
    background: radial-gradient(circle, var(--el-color-primary, #409EFF) 0%, transparent 70%);
}

/* 核心登录卡片：使用 Element Plus 规范的 surface / overlay 变量 */
.login-card {
    position: relative;
    width: 400px;
    padding: 30px 36px 40px;
    background-color: var(--el-bg-color-overlay, #ffffff);
    border-radius: 24px;
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    box-shadow: var(--el-box-shadow-light);
    z-index: 10;
    transition: all 0.3s ease;
}

/* 探头小熊圆形头像视窗：自适应卡片与边框颜色 */
.bear-avatar-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: -85px;
    margin-bottom: 12px;
}

.bear-circle {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background-color: var(--el-fill-color-light, #f5f7fa);
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 
        0 12px 24px -6px rgba(0, 0, 0, 0.15),
        0 0 0 4px var(--el-bg-color-overlay, #ffffff),
        0 0 0 5px var(--el-border-color-lighter, #ebeef5);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, background-color 0.3s ease;
}

.bear-circle:hover {
    transform: translateY(-2px) scale(1.02);
}

.bear-canvas {
    width: 140px;
    height: 140px;
    display: block;
}

/* 卡片标题区 */
.card-header {
    text-align: center;
    margin-bottom: 24px;
}

.card-header h2 {
    font-size: 24px;
    font-weight: 700;
    color: var(--el-text-color-primary, #303133);
    margin: 0 0 6px 0;
    letter-spacing: -0.02em;
    transition: color 0.3s ease;
}

.card-header p {
    font-size: 13px;
    color: var(--el-text-color-secondary, #909399);
    margin: 0;
    transition: color 0.3s ease;
}

/* 表单样式定制 */
.modern-form {
    margin-top: 10px;
}

.modern-form :deep(.el-form-item) {
    margin-bottom: 18px;
}

/* 现代风格输入框：严格遵循主题变量 */
.modern-input :deep(.el-input__wrapper) {
    background-color: var(--el-fill-color-blank, #ffffff);
    border: 1px solid var(--el-border-color, #dcdfe6);
    box-shadow: none !important;
    border-radius: 12px;
    padding: 10px 14px;
    height: 48px;
    transition: all 0.2s ease;
}

.modern-input :deep(.el-input__wrapper:hover) {
    border-color: var(--el-border-color-darker, #c0c4cc);
}

.modern-input :deep(.el-input__wrapper.is-focus) {
    border-color: var(--el-color-primary) !important;
    box-shadow: 0 0 0 4px var(--el-color-primary-light-8) !important;
}

.modern-input :deep(.el-input__inner) {
    font-size: 14px;
    color: var(--el-text-color-primary, #303133);
}

.modern-input :deep(.el-input__prefix) {
    font-size: 17px;
    color: var(--el-text-color-placeholder, #a8abb2);
    margin-right: 6px;
}

/* 主题驱动的提交按钮 */
.submit-btn {
    width: 100%;
    height: 48px !important;
    border-radius: 12px;
    border: none;
    background-color: var(--el-color-primary, #409EFF);
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    letter-spacing: 0.05em;
    box-shadow: 0 8px 16px -4px var(--el-color-primary-light-5);
    transition: all 0.25s ease;
    cursor: pointer;
    margin-top: 20px;
}

.submit-btn:hover {
    background-color: var(--el-color-primary-light-3);
    box-shadow: 0 10px 20px -4px var(--el-color-primary-light-4);
    transform: translateY(-1px);
}

.submit-btn:active {
    transform: translateY(0);
    box-shadow: 0 4px 8px -2px var(--el-color-primary);
}
</style>
