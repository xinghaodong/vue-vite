import axios from 'axios';
import QS from 'qs';
import { ElMessage } from 'element-plus';
import router from '@/router';
const { VITE_PROXY_DOMAIN_REAL, VITE_STATIC_URL, VITE_PROXY_DOMAIN, MODE } = import.meta.env;
const baseUrl = MODE == 'development' ? VITE_PROXY_DOMAIN : VITE_PROXY_DOMAIN_REAL;
const img_url = VITE_STATIC_URL;
axios.defaults.baseURL = baseUrl;
console.log(baseUrl, '当前环境：', VITE_PROXY_DOMAIN_REAL, '当前图片资源：', VITE_STATIC_URL);
// axios.defaults.headers['Content-Type'] = 'application/json';
/**
 * 控制当前是否处于刷新状态的标志变量。
 */
let isRefreshing = false;

/**
 * 用于存储在刷新期间需要延迟执行的请求的数组。
 * 刷新过程中，新来的请求会被加入到这个数组中，等待刷新完成后逐一处理。
 */
let requests = [];
/**
 * 配置axios请求拦截器
 *
 * 该拦截器用于在每个HTTP请求发送前添加Authorization头，该头用于验证请求的授权状态。
 * 它从本地存储中获取令牌（如果存在），并将其添加到请求头中。如果不存在令牌，则不添加。
 * 此外，拦截器还处理了请求错误，将错误封装成Promise.reject形式，以便进一步的错误处理。
 *
 * @param {Object} config - axios请求配置对象
 * @returns {Object} - 处理后的请求配置对象
 */
axios.interceptors.request.use(
    async config => {
        // 从本地存储中获取令牌，并设置到请求头中
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`; // 确保使用 Bearer 方式
        }
        return config;
    },
    error => {
        // 错误处理：将错误封装成Promise.reject形式
        return Promise.reject(error);
    }
);
// 响应拦截器
axios.interceptors.response.use(
    response => {
        if (response.data.code === 401) {
            if (!isRefreshing) {
                isRefreshing = true;
                //调用刷新token的接口
                return axios
                    .post('/api/auth/refresh', {
                        refreshToken: localStorage.getItem('refreshToken') || '',
                    })
                    .then(res => {
                        const { token, refreshToken } = res.data.data;
                        // 替换token
                        localStorage.setItem('token', token);
                        localStorage.setItem('refreshToken', refreshToken);
                        response.headers.Authorization = `Bearer ${token}`;
                        // token 刷新后将数组的方法重新执行
                        requests.forEach(cb => cb(token));
                        requests = []; // 重新请求完清空
                        return axios(response.config);
                    })
                    .catch(err => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                        router.push('/login');
                        return Promise.reject(err);
                    })
                    .finally(() => {
                        isRefreshing = false;
                    });
            } else {
                // 返回未执行 resolve 的 Promise
                return new Promise(resolve => {
                    // 用函数形式将 resolve 存入，等待刷新后再执行
                    requests.push(token => {
                        response.headers.Authorization = `${token}`;
                        resolve(axios(response.config));
                    });
                });
            }
        }
        if (response.data.code === 400) {
            // 400 无token 跳转登录
            console.log('token消失了');
            router.push('/login');
            // return Promise.resolve(response); //进行中
        }
        if (response.data.code !== 200) {
            console.log('服务器异常', response);
            ElMessage.warning(response.data.message);
        }

        // return response && response.data;
        return Promise.resolve(response); //进行中
    },
    // 服务器状态码不是200的情况
    async error => {
        ElMessage.warning(error.response.data.message);
        if (error.response.status) {
            return Promise.reject(error.response);
        }
    }
);

/**
 * get方法，对应get请求
 * @param {String} url 请求的url地址
 * @param {Object} params 请求时携带的参数
 */
export const oGet = (url, params) => {
    return new Promise((resolve, reject) => {
        axios
            .get(url, {
                params: params,
            })
            .then(res => {
                resolve(res.data);
            })
            .catch(err => {
                reject(err.data);
            });
    });
};
/**
 * post方法，对应post请求
 * @param {String} url 请求的url地址
 * @param {Object} params 请求时携带的参数
 */
export const oPost = (url, params) => {
    return new Promise((resolve, reject) => {
        axios
            .post(url, QS.stringify(params))
            .then(res => {
                resolve(res.data);
            })
            .catch(err => {
                reject(err.data);
            });
    });
};

//接口方法 地址
export default {
    baseUrl,
    img_url,
    //登录
    login(params) {
        return oPost(baseUrl + '/auth/login', params);
    },
    //更新菜单
    updatemenu(params) {
        return oPost(baseUrl + '/menus/update', params);
    },
    // 菜单详情
    getmenu(params) {
        return oGet(baseUrl + '/menus/detail', params);
    },
    // 删除菜单
    deletemenu(params) {
        return oPost(baseUrl + '/menus/deletemenu', params);
    },
    // 添加菜单
    addmenu(params) {
        return oPost(baseUrl + '/menus/addmenu', params);
    },
    // 获取菜单列表
    menus(params) {
        return oGet(baseUrl + '/menus', params);
    },
    //用户管理查询
    find(params) {
        return oGet(baseUrl + '/internalusers/find', params);
    },
    //新增用户
    add(params) {
        return oPost(baseUrl + '/internalusers/add', params);
    },
    // 更新用户
    update(params) {
        return oPost(baseUrl + '/internalusers/update', params);
    },
    // 删除用户
    delete(params) {
        return oPost(baseUrl + '/internalusers/delete', params);
    },
    // 禁用
    ban(params) {
        return oPost(baseUrl + '/internalusers/ban', params);
    },
    // 新增活动
    addActivity(params) {
        return oPost(baseUrl + '/activity/addActivity', params);
    },
    // 活动列表
    getActivityList(params) {
        return oGet(baseUrl + '/activity/getActivityList', params);
    },
    // 活动详情接口
    getActivityDetail(params) {
        return oGet(baseUrl + '/activity/getActivityDetail', params);
    },
    // 删除活动
    deleteActivity(params) {
        return oPost(baseUrl + '/activity/deleteActivity', params);
    },
    // 角色列表
    getRoleList(params) {
        return oGet(baseUrl + '/role/findAll', params);
    },
    // 新增角色
    addRole(params) {
        return oPost(baseUrl + '/role/create', params);
    },
    // 删除角色
    deleteRole(params) {
        return oPost(baseUrl + '/role/remove', params);
    },
    // 更新角色
    updateRole(params) {
        return oPost(baseUrl + '/role/update', params);
    },
    // 获取角色详情
    getRoleDetail(params) {
        return oGet(baseUrl + '/role/detail', params);
    },
    // 角色配置权限
    assignMenusToRole(params) {
        return oPost(baseUrl + '/role/assignMenusToRole', params);
    },
    // 获取角色权限
    getRoleMenus(params) {
        return oGet(baseUrl + '/role/getRoleMenus', params);
    },
};
