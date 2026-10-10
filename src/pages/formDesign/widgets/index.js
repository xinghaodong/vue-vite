/**
 * ========================================================================
 * 文件名称: widgets/index.js
 * 所属模块: 表单设计器物料注册中心 (Widget Registry)
 * 功能说明:
 *   1. 统一管理和导出所有基础字段物料 (fieldWidgets) 与布局容器物料 (containerWidgets)；
 *   2. 提供安全的唯一 ID 生成机制，彻底杜绝拖拽克隆时的 ID 冲突；
 *   3. 导出物料查询与动态注册方法 (getWidget / registerWidget)，供后续自由扩展新物料。
 * ========================================================================
 */
import { markRaw } from 'vue';
import InputSetting from './settings/InputSetting.vue';
import NumberSetting from './settings/NumberSetting.vue';
import SelectSetting from './settings/SelectSetting.vue';
import DatePickerSetting from './settings/DatePickerSetting.vue';
import SwitchSetting from './settings/SwitchSetting.vue';
import UploadSetting from './settings/UploadSetting.vue';
import GridSetting from './settings/GridSetting.vue';

/**
 * 生成全局高熵唯一的组件 ID (形如: input_1728552000000_a3x9f)
 * 解决高频拖拽或快速操作时产生重复 ID 导致 Virtual DOM 渲染死锁的问题
 */
export const generateWidgetId = (type) => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${type}_${timestamp}_${randomSuffix}`;
};

// 基础字段物料定义列表
export const fieldWidgets = [
    {
        type: 'input',
        label: '单行文本',
        icon: 'Edit',
        category: 'basic',
        isContainer: false,
        component: 'el-input',
        settingComponent: markRaw(InputSetting),
        createDefault: () => ({
            id: generateWidgetId('input'),
            type: 'input',
            component: 'el-input',
            props: {
                label: '单行文本',
                placeholder: '请输入文本',
                required: false,
                disabled: false,
                ruleType: 'none', // 格式校验：none / number / positiveInteger / phone / email / idCard
                maxlength: 100,
                showWordLimit: true,
                clearable: true,
                isComputed: false,
                dependencies: [],
                computedExpression: '',
            },
        }),
    },
    {
        type: 'number',
        label: '数字输入',
        icon: 'Odometer',
        category: 'basic',
        isContainer: false,
        component: 'el-input-number',
        settingComponent: markRaw(NumberSetting),
        createDefault: () => ({
            id: generateWidgetId('number'),
            type: 'number',
            component: 'el-input-number',
            props: {
                label: '年龄/数量',
                placeholder: '请输入数值',
                required: false,
                disabled: false,
                min: 0,
                max: 150,
                step: 1,
                precision: 0, // 默认 0 位小数（纯整数，符合年龄场景）
                controls: true,
                isComputed: false,
                dependencies: [],
                computedExpression: '',
            },
        }),
    },
    {
        type: 'textarea',
        label: '多行文本',
        icon: 'Document',
        category: 'basic',
        isContainer: false,
        component: 'el-input',
        settingComponent: markRaw(InputSetting),
        createDefault: () => ({
            id: generateWidgetId('textarea'),
            type: 'textarea',
            component: 'el-input',
            props: {
                label: '多行文本',
                placeholder: '请输入详细内容',
                type: 'textarea',
                rows: 3,
                required: false,
                disabled: false,
                maxlength: 300,
                showWordLimit: true,
                clearable: true,
            },
        }),
    },
    {
        type: 'select',
        label: '下拉选择',
        icon: 'Select',
        category: 'basic',
        isContainer: false,
        component: 'el-select',
        settingComponent: markRaw(SelectSetting),
        createDefault: () => ({
            id: generateWidgetId('select'),
            type: 'select',
            component: 'el-select',
            props: {
                label: '下拉选择',
                placeholder: '请选择',
                required: false,
                disabled: false,
                multiple: false,
                clearable: true,
                filterable: true,
                apiUrl: '',
                options: [
                    { label: '选项一', value: 'opt1' },
                    { label: '选项二', value: 'opt2' },
                ],
            },
        }),
    },
    {
        type: 'radio',
        label: '单选框组',
        icon: 'List',
        category: 'basic',
        isContainer: false,
        component: 'el-radio-group',
        settingComponent: markRaw(SelectSetting),
        createDefault: () => ({
            id: generateWidgetId('radio'),
            type: 'radio',
            component: 'el-radio-group',
            props: {
                label: '单选框组',
                required: false,
                disabled: false,
                options: [
                    { label: '选项A', value: 'A' },
                    { label: '选项B', value: 'B' },
                ],
            },
        }),
    },
    {
        type: 'checkbox',
        label: '多选框组',
        icon: 'Menu',
        category: 'basic',
        isContainer: false,
        component: 'el-checkbox-group',
        settingComponent: markRaw(SelectSetting),
        createDefault: () => ({
            id: generateWidgetId('checkbox'),
            type: 'checkbox',
            component: 'el-checkbox-group',
            props: {
                label: '多选框组',
                required: false,
                disabled: false,
                options: [
                    { label: '多选1', value: '1' },
                    { label: '多选2', value: '2' },
                ],
            },
        }),
    },
    {
        type: 'switch',
        label: '开关',
        icon: 'Switch',
        category: 'basic',
        isContainer: false,
        component: 'el-switch',
        settingComponent: markRaw(SwitchSetting),
        createDefault: () => ({
            id: generateWidgetId('switch'),
            type: 'switch',
            component: 'el-switch',
            props: {
                label: '开关',
                required: false,
                disabled: false,
                activeText: '',
                inactiveText: '',
            },
        }),
    },
    {
        type: 'date-picker',
        label: '日期选择器',
        icon: 'Calendar',
        category: 'basic',
        isContainer: false,
        component: 'el-date-picker',
        settingComponent: markRaw(DatePickerSetting),
        createDefault: () => ({
            id: generateWidgetId('date'),
            type: 'date-picker',
            component: 'el-date-picker',
            props: {
                label: '日期选择',
                placeholder: '请选择日期',
                type: 'date',
                required: false,
                disabled: false,
                format: 'YYYY-MM-DD',
                valueFormat: 'YYYY-MM-DD',
            },
        }),
    },
    {
        type: 'upload',
        label: '附件',
        icon: 'UploadFilled',
        category: 'basic',
        isContainer: false,
        component: 'file-upload',
        settingComponent: markRaw(UploadSetting),
        createDefault: () => ({
            id: generateWidgetId('upload'),
            type: 'upload',
            component: 'file-upload',
            props: {
                label: '附件',
                required: false,
                disabled: false,
                accept: '.jpg,.jpeg,.png,.pdf',
                limit: 10,
                maxSize: 10,
                tip: '支持上传 jpg/png/pdf 格式附件，单文件不超过 10MB',
            },
        }),
    },
];

// 容器/布局物料定义列表
export const containerWidgets = [
    {
        type: 'grid',
        label: '栅格布局',
        icon: 'Grid',
        category: 'layout',
        isContainer: true,
        component: 'el-row',
        settingComponent: markRaw(GridSetting),
        createDefault: () => ({
            id: generateWidgetId('grid'),
            type: 'grid',
            component: 'el-row',
            props: {
                gutter: 20,
                columns: [
                    { span: 12, list: [] },
                    { span: 12, list: [] },
                ],
            },
        }),
    },
];

// 汇总索引映射
const allWidgets = [...containerWidgets, ...fieldWidgets];
export const widgetMap = new Map(allWidgets.map(w => [w.type, w]));

/**
 * 根据类型安全获取物料配置
 */
export const getWidget = (type) => widgetMap.get(type);

/**
 * 动态注册新物料 (支持未来插件式扩展富文本、Tabs、评分、级联等)
 */
export const registerWidget = (widget) => {
    widgetMap.set(widget.type, widget);
    if (widget.isContainer) {
        containerWidgets.push(widget);
    } else {
        fieldWidgets.push(widget);
    }
};
