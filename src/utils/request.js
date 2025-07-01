import axios from 'axios';
import QS from 'qs';
import { ElMessage } from 'element-plus';
import router from '@/router';
import { setActivePinia } from 'pinia';
const { VITE_PROXY_DOMAIN_REAL, VITE_STATIC_URL, VITE_PROXY_DOMAIN } = import.meta.env;
const baseUrl = VITE_PROXY_DOMAIN;
const img_url = VITE_STATIC_URL;
axios.defaults.baseURL = baseUrl;
console.log('当前环境：', VITE_PROXY_DOMAIN_REAL, '当前附件资源：', VITE_STATIC_URL);
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
        config.headers.Authorization = `Bearer ${sessionStorage.getItem('token') || ''}`;

        // 检查 URL 是否是 /api/ai/invoke，设置流式响应
        if (config.url.includes('/api/ai/stream')) {
            config.responseType = 'stream';
        }
        console.log('请求config：', config.responseType);
        return config;
    },
    error => {
        // 错误处理：将错误封装成Promise.reject形式
        return Promise.reject(error);
    },
);
// 响应拦截器
axios.interceptors.response.use(
    response => {
        if (response.data.code === 401) {
            if (!isRefreshing) {
                isRefreshing = true;
                //调用刷新token的接口
                return axios
                    .post('/auth/refresh', {
                        refreshToken: sessionStorage.getItem('refreshToken') || '',
                    })
                    .then(res => {
                        const { token, refreshToken } = res.data.data;
                        // 替换token
                        sessionStorage.setItem('token', token);
                        sessionStorage.setItem('refreshToken', refreshToken);
                        response.headers.Authorization = `Bearer ${sessionStorage.getItem('token') || ''}`;
                        // token 刷新后将数组的方法重新执行
                        requests.forEach(cb => cb(token));
                        requests = []; // 重新请求完清空
                        return axios(response.config);
                    })
                    .catch(err => {
                        sessionStorage.removeItem('token');
                        sessionStorage.removeItem('refreshToken');
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
                        response.headers.Authorization = `Bearer ${sessionStorage.getItem('token') || ''}`;
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
            ElMessage.warning(response.data.message);
        }

        // return response && response.data;
        return Promise.resolve(response); //进行中
    },
    // 服务器状态码不是200的情况
    async error => {
        console.log(error, 'error');
        ElMessage.warning(error.response.data.message);
        if (error.response.status) {
            return Promise.reject(error.response);
        }
    },
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
    // 修改菜单
    updatemenu(params) {
        return oPost(baseUrl + '/menus/update', params);
    },
    // 菜单详情
    detail(params) {
        return oGet(baseUrl + '/menus/detail', params);
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
    // 用户详情
    internalusersDetail(params) {
        return oGet(baseUrl + '/internalusers/detail', params);
    },
    // 禁用
    ban(params) {
        return oPost(baseUrl + '/internalusers/ban', params);
    },

    // 获取角色列表
    getRolsList(params) {
        return oGet(baseUrl + '/role/findAll', params);
    },
    // 添加角色
    addRoles(params) {
        return oPost(baseUrl + '/role/create', params);
    },
    // 删除角色
    deleteRoles(params) {
        return oPost(baseUrl + '/role/remove', params);
    },
    // 修改角色
    updateRoles(params) {
        return oPost(baseUrl + '/role/update', params);
    },
    // 角色详情
    detailRoles(params) {
        return oGet(baseUrl + '/role/detail', params);
    },

    // 给角色分配菜单
    assignMenusToRole(params) {
        return oPost(baseUrl + '/role/assignMenusToRole', params);
    },
    getRoleMenus(params) {
        return oGet(baseUrl + '/role/getRoleMenus', params);
    },

    // 组织列表
    getOrganizationList(params) {
        return oGet(baseUrl + '/orgManagement', params);
    },
    // 添加组织
    addOrganization(params) {
        return oPost(baseUrl + '/orgManagement/add', params);
    },
    // 组织详情
    detailOrganization(params) {
        return oGet(baseUrl + '/orgManagement/detail', params);
    },
    // 修改组织
    updateOrganization(params) {
        return oPost(baseUrl + '/orgManagement/update', params);
    },
    // 删除组织
    deleteOrganization(params) {
        return oPost(baseUrl + '/orgManagement/delete', params);
    },
    // 新增流程图
    addFlowChart(params) {
        return oPost(baseUrl + '/process-approval', params);
    },
    // 模板列表
    getFlowChartList(params) {
        return oGet(baseUrl + '/process-approval', params);
    },
    // 模板详情
    detailFlowChart(params) {
        return oGet(baseUrl + '/process-approval/detail', params);
    },
    // 删除模板
    deleteFlowChart(params) {
        return oPost(baseUrl + '/process-approval/delete', params);
    },
    // 更新当前用户主题
    updateTheme(params) {
        return oPost(baseUrl + '/internalusers/updateTheme', params);
    },
    // 获取ai流
    getAi(params) {
        return oGet(baseUrl + '/ai/stream', params);
    },
    // 保存第一次对话生成对话id
    saveFirstDialogue(params) {
        return oPost(baseUrl + '/ai/start-conversation', params);
    },
    // 查询回话记录
    getAllConversations(params) {
        return oGet(baseUrl + '/ai/all-conversations', params);
    },

    // 查询历史对话记录
    getHistory(params) {
        return oGet(baseUrl + '/ai/history', params);
    },
    // 保存聊天记录
    seteRecord(params) {
        return oPost(baseUrl + '/ai/save-record', params);
    },
    // 根据对话id查询对话记录
    getRecord(params) {
        return oGet(baseUrl + '/ai/conversation-history', params);
    },
    // 查询天气
    getWeather(params) {
        return oGet(baseUrl + '/ai/weather', params);
    },
    // 获取本机ollama模型
    getOllamaList(params) {
        return oGet(baseUrl + '/ai/ollama-models', params);
    },
    // 谷歌搜索
    getGoogleSearch(params) {
        return oGet(baseUrl + '/ai/google-search', params);
    },
    // 停止当前AI回复
    stopAi(params) {
        return oGet(baseUrl + '/ai/stop-ai', params);
    },
    // 航线列表
    getRouteList(params) {
        return oGet(baseUrl + '/cesium/list', params);
    },
    // 新增航线
    addRoute(params) {
        return oPost(baseUrl + '/cesium/create', params);
    },
    // 删除航线
    routeDelete(params) {
        return oPost(baseUrl + '/cesium/delete', params);
    },
    // 获取航线详情
    routeDetail(params) {
        return oGet(baseUrl + '/cesium/detail', params);
    },
    // 修改航线
    updateRoute(params) {
        return oPost(baseUrl + '/cesium/update', params);
    },
};

//封装post/get请求
// export default {
//     post(url, data) {
//         return new Promise((resolve, reject) => {
//             axios({
//                 method: 'post',
//                 url,
//                 // data,
//                 data: QS.stringify(data), //参数序列化
//             })
//                 .then(res => {
//                     if (res) {
//                         resolve(res.data);
//                     }
//                 })
//                 .catch(err => {
//                     reject(err);
//                 });
//         });
//     },
//     get(url, data) {
//         return new Promise((resolve, reject) => {
//             axios({
//                 method: 'get',
//                 url,
//                 params: data,
//             })
//                 .then(res => {
//                     if (res) {
//                         resolve(res.data);
//                     }
//                 })
//                 .catch(err => {
//                     reject(err);
//                 });
//         });
//     },
//     baseURL: axios.defaults.baseURL,
//     img_url,
// };
