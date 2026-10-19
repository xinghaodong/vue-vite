import { oPost } from '@/utils/request';

/**
 * 用户登录
 */
export function login(params) {
    return oPost('/auth/login', params);
}

/**
 * 用户退出登录
 */
export function logout() {
    return oPost('/auth/logout');
}
