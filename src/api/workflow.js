import { oGet, oPost } from '@/utils/request';

/**
 * 获取我发起的流程实例列表（支持分页、按标题搜索）
 */
export function getMyInstances(params = {}) {
    return oGet('/logic-flow/getMyInstances', params);
}

/**
 * 获取当前用户的待办审批任务列表（支持分页、按标题搜索）
 */
export function getMyTodoInstances(params = {}) {
    return oGet('/logic-flow/getMyTodoInstances', params);
}

/**
 * 审批处理（同意/驳回/特批放行）
 */
export function approveWorkflow(params) {
    return oPost('/logic-flow/approve', params);
}

/**
 * 兼容旧命名别名
 */
export const approve = approveWorkflow;

/**
 * 获取审批流实例的历史流转记录与表单快照
 */
export function getApprovalHistory(params) {
    return oGet('/logic-flow/getApprovalHistory', params);
}

/**
 * 按表单 ID 查询其绑定的工作流流程列表
 */
export function getWorkflowsByFormId(params) {
    return oGet('/logic-flow/findByFormId', params);
}

/**
 * 别名兼容
 */
export const logicFindByFormId = getWorkflowsByFormId;

/**
 * 发起新的工作流审批
 */
export function startWorkflow(params) {
    return oPost('/logic-flow/startWorkflow', params);
}

/**
 * 分页查询工作流设计列表
 */
export function getWorkflowList(params = {}) {
    return oGet('/logic-flow/find', params);
}

/**
 * 新增工作流设计
 */
export function addWorkflow(params) {
    return oPost('/logic-flow/add', params);
}

/**
 * 获取工作流设计详情
 */
export function getWorkflowDetail(params) {
    return oGet('/logic-flow/detail', params);
}

/**
 * 修改工作流设计
 */
export function updateWorkflow(params) {
    return oPost('/logic-flow/update', params);
}

/**
 * 删除工作流设计
 */
export function deleteWorkflow(params) {
    return oPost('/logic-flow/remove', params);
}

/**
 * 别名兼容
 */
export const logicfind = getWorkflowList;
export const logicadd = addWorkflow;
export const logicdetail = getWorkflowDetail;
export const logicupdate = updateWorkflow;
export const logicdelete = deleteWorkflow;
