import { reactive, ref, computed, toRefs } from 'vue';

/**
 * useTable 组合式 API - 大厂级表格状态与数据请求驱动内核
 * 
 * @param {Function} api 表格数据请求函数，需返回 Promise，返回格式通常为 { list, total } 或 { rows, total } 或包含相应结构的对象
 * @param {Object} initParam 初始额外参数，例如固定的分类ID等，不会被重置清空
 * @param {Boolean} isPageable 是否启用分页，默认 true
 * @param {Function} dataCallBack 对接口返回数据进行自定义加工清洗的回调，形如 (data) => ({ list, total })
 * @param {Function} requestError 自定义请求失败处理回调
 */
export function useTable(api, initParam = {}, isPageable = true, dataCallBack, requestError) {
    const state = reactive({
        // 表格数据
        tableData: [],
        // 分页参数
        pageParam: {
            pageNum: 1,
            pageSize: 10,
            total: 0
        },
        // 搜索查询参数（由 SearchForm 双向绑定维护）
        searchParam: {},
        // 搜索初始参数（用于一键重置）
        searchInitParam: {},
        // 静态固有参数
        initParam: {},
        // 表格加载中
        loading: false,
        // 多选选中的行列表
        selectedList: []
    });

    // 选中的行主键集合（默认基于 id）
    const selectedListIds = computed(() => {
        return state.selectedList.map(item => item.id || item.key || item.uuid);
    });

    /**
     * 获取完整请求参数 (initParam + pageParam + searchParam)
     */
    const getFinalParams = () => {
        const params = {
            ...state.initParam,
            ...state.searchParam
        };
        if (isPageable) {
            params.pageNum = state.pageParam.pageNum;
            params.pageSize = state.pageParam.pageSize;
        }
        return params;
    };

    /**
     * 获取表格数据核心流程
     */
    const getTableList = async () => {
        if (!api || typeof api !== 'function') return;
        state.loading = true;
        try {
            const finalParams = getFinalParams();
            let res = await api(finalParams);

            // 如果有业务自定义加工回调
            if (dataCallBack && typeof dataCallBack === 'function') {
                res = dataCallBack(res);
            }

            // 智能兼容多种常见中后台返回结构：
            // 1. 标准结构: res.data.list / res.data.total
            // 2. RuoYi / Spring 结构: res.rows / res.total
            // 3. MyBatis-Plus / Spring Page 结构: res.data.records / res.data.total
            // 4. 直接返回数组
            let list = [];
            let total = 0;

            if (Array.isArray(res)) {
                list = res;
                total = res.length;
            } else if (res && typeof res === 'object') {
                const target = res.data || res;
                if (Array.isArray(target)) {
                    list = target;
                    total = target.length;
                } else {
                    list = target.list || target.rows || target.records || target.datalist || [];
                    total = Number(target.total || target.totalCount || target.count || list.length || 0);
                }
            }

            state.tableData = list;
            if (isPageable) {
                state.pageParam.total = total;
            }
        } catch (err) {
            console.error('[useTable] 获取表格数据失败:', err);
            if (requestError && typeof requestError === 'function') {
                requestError(err);
            }
        } finally {
            state.loading = false;
        }
    };

    /**
     * 触发搜索：重置到第 1 页并重新请求
     */
    const search = () => {
        state.pageParam.pageNum = 1;
        getTableList();
    };

    /**
     * 触发重置：重置搜索参数为初始配置，重置到第 1 页并重新请求
     */
    const reset = () => {
        state.pageParam.pageNum = 1;
        // 恢复初始搜索参数
        state.searchParam = { ...state.searchInitParam };
        getTableList();
    };

    /**
     * 局部/无感刷新：保持当前分页及当前状态不变
     */
    const refresh = () => {
        getTableList();
    };

    /**
     * 每页条数变更
     */
    const handleSizeChange = (val) => {
        state.pageParam.pageNum = 1;
        state.pageParam.pageSize = val;
        getTableList();
    };

    /**
     * 当前页码变更
     */
    const handleCurrentChange = (val) => {
        state.pageParam.pageNum = val;
        getTableList();
    };

    /**
     * 表格多选变化
     */
    const selectionChange = (val) => {
        state.selectedList = val || [];
    };

    // 初始化参数合并
    state.initParam = { ...initParam };

    return {
        ...toRefs(state),
        selectedListIds,
        getTableList,
        search,
        reset,
        refresh,
        handleSizeChange,
        handleCurrentChange,
        selectionChange
    };
}
