<!-- 
  ========================================================================
  文件名称: HeaderActions.vue
  所属模块: 顶栏系统 (src/layout/components/Header)
  功能说明:
    顶栏右侧工具操作集：
    1. 【View Transitions 原生全屏圆形扩散暗黑模式切换】(对标 Element Plus 官网同款)；
    2. 【全屏切换 (FullScreen)】支持快捷全屏与退出；
    3. 【用户中心下拉】头像展示、昵称以及安全注销退出。
  ========================================================================
-->
<template>
    <div class="header-actions-container">
        <!-- 1. 全屏切换按钮 -->
        <!-- <el-tooltip :content="isFullscreen ? '退出全屏' : '全屏展示'" placement="bottom">
            <div class="action-icon-btn" @click="toggleFullscreen">
                <el-icon :size="18">
                    <Aim v-if="!isFullscreen" />
                    <FullScreen v-else />
                </el-icon>
            </div>
        </el-tooltip> -->

        <!-- 2. 暗黑模式切换按钮 (触发 View Transitions 圆形扩散特效) -->
        <el-tooltip :content="isDark ? '切换至亮色模式' : '切换至暗黑模式'" placement="bottom">
            <div class="action-icon-btn theme-toggle-btn" @click="handleToggleTheme($event)">
                <el-icon :size="19">
                    <Sunny v-if="isDark" />
                    <Moon v-else />
                </el-icon>
            </div>
        </el-tooltip>

        <!-- 3. 用户头像与下拉菜单 -->
        <el-dropdown trigger="click" class="user-dropdown-box" @command="handleUserCommand">
            <div class="user-profile-trigger">
                <el-avatar
                    v-if="avatarUrl"
                    :size="32"
                    :src="avatarUrl"
                    class="user-avatar-img"
                />
                <el-avatar v-else :size="32" class="user-avatar-text">
                    {{ displayInitial }}
                </el-avatar>
                <span class="user-name-text">{{ displayName }}</span>
                <el-icon :size="12" class="arrow-down-icon"><ArrowDown /></el-icon>
            </div>

            <template #dropdown>
                <el-dropdown-menu>
                    <el-dropdown-item command="logout" divided>
                        <el-icon color="#f56c6c"><SwitchButton /></el-icon>
                        <span style="color: #f56c6c">退出登录</span>
                    </el-dropdown-item>
                </el-dropdown-menu>
            </template>
        </el-dropdown>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Moon, Sunny, FullScreen, Aim, ArrowDown, SwitchButton } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import useUserInfoStore from '@/stortes/user';
import { useTheme } from '@/composables/useTheme';

const { proxy } = getCurrentInstance();
const router = useRouter();
const userStore = useUserInfoStore();
const { userInfo } = storeToRefs(userStore);

// 🌟 引入基于 View Transitions API 的圆形扩散主题切换
const { isDark, toggleTheme } = useTheme();

const handleToggleTheme = (event) => {
    toggleTheme(event, userInfo.value);
};

// 头像与昵称计算
const avatarUrl = computed(() => {
    if (userInfo.value?.avatar?.filePath) {
        const cleanPath = userInfo.value.avatar.filePath.replace(/^[/\\]+/, '');
        return `${proxy.$api.img_url}${cleanPath}`;
    }
    return '';
});

const displayName = computed(() => {
    return userInfo.value?.name || userInfo.value?.username || '用户';
});

const displayInitial = computed(() => {
    return displayName.value ? displayName.value.slice(0, 1) : '用';
});

// 全屏控制
const isFullscreen = ref(Boolean(document.fullscreenElement));

const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.warn('全屏请求失败:', err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
};

const handleFullscreenChange = () => {
    isFullscreen.value = Boolean(document.fullscreenElement);
};

// 用户下拉菜单点击
const handleUserCommand = (command) => {
    if (command === 'logout') {
        ElMessageBox.confirm('确定退出当前登录系统吗？', '提示', {
            type: 'warning',
            confirmButtonText: '确定退出',
            cancelButtonText: '取消',
        }).then(async () => {
            try {
                // 安全注销后端会话与 Redis 缓存
                await proxy.$api.logout();
            } catch (err) {
                console.warn('注销请求异常(已忽略):', err);
            }
            // 清理本地凭据
            sessionStorage.clear();
            localStorage.removeItem('token');
            router.push('/login');
        });
    }
};

onMounted(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
});
</script>

<style scoped>
.header-actions-container {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 100%;
}

.action-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    color: var(--el-text-color-regular);
    transition: all 0.2s ease;
}

.action-icon-btn:hover {
    background: var(--el-fill-color-light);
    color: var(--el-color-primary);
}

.user-dropdown-box {
    cursor: pointer;
}

.user-profile-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 20px;
    transition: all 0.2s ease;
}

.user-profile-trigger:hover {
    background: var(--el-fill-color-light);
}

.user-avatar-img {
    object-fit: cover;
}

.user-avatar-text {
    background: var(--el-color-primary);
    color: #ffffff;
    font-weight: 600;
}

.user-name-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
}

.arrow-down-icon {
    color: var(--el-text-color-placeholder);
    transition: transform 0.2s;
}

.user-profile-trigger:hover .arrow-down-icon {
    color: var(--el-text-color-regular);
}
</style>
