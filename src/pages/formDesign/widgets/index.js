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
import CardSetting from './settings/CardSetting.vue';
import TabsSetting from './settings/TabsSetting.vue';
import CascaderSetting from './settings/CascaderSetting.vue';
import SliderSetting from './settings/SliderSetting.vue';

// 纯净容器排版组件
import GridContainer from './containers/GridContainer.vue';
import CardContainer from './containers/CardContainer.vue';
import TabsContainer from './containers/TabsContainer.vue';

// 自闭环基础字段物料组件
import SelectWidget from '../components/widgets/SelectWidget.vue';
import RadioWidget from '../components/widgets/RadioWidget.vue';
import CheckboxWidget from '../components/widgets/CheckboxWidget.vue';
import FileUploadWidget from '../components/widgets/FileUploadWidget.vue';

/**
 * 生成全局高熵唯一的组件 ID (形如: input_1728552000000_a3x9f)
 * 解决高频拖拽或快速操作时产生重复 ID 导致 Virtual DOM 渲染死锁的问题
 */
export const generateWidgetId = (type) => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${type}_${timestamp}_${randomSuffix}`;
};

/**
 * 🌟 软件工程级通用的表单树遍历器 (树形深搜 Tree Traversal)
 * 依赖统一 slots 规范，对所有已知及未来扩展容器 (Grid/Card/Tabs/Collapse/Steps) 100% 通用，零 if/else 判断！
 */
export const traverseWidgets = (items, callback) => {
    if (!Array.isArray(items)) return;
    items.forEach(item => {
        if (!item || typeof item !== 'object') return;
        callback(item);
        if (item.slots && typeof item.slots === 'object') {
            Object.values(item.slots).forEach(slotList => {
                if (Array.isArray(slotList)) {
                    traverseWidgets(slotList, callback);
                }
            });
        }
    });
};

/**
 * 🌟 深度递归克隆物料（保持所有配置，重置自身及所有层级子组件的唯一 ID）
 * 基于统一 slots 协议，完全消除一切兼容分支，优雅高效！
 */
export const cloneWidgetWithNewIds = (element) => {
    if (!element) return null;
    const cloned = JSON.parse(JSON.stringify(element));
    traverseWidgets([cloned], node => {
        if (node.type) {
            node.id = generateWidgetId(node.type);
        }
    });
    return cloned;
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
        component: markRaw(SelectWidget),
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
        component: markRaw(RadioWidget),
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
        component: markRaw(CheckboxWidget),
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
        type: 'cascader',
        label: '级联选择',
        icon: 'Connection',
        category: 'basic',
        isContainer: false,
        component: 'el-cascader',
        settingComponent: markRaw(CascaderSetting),
        createDefault: () => ({
            id: generateWidgetId('cascader'),
            type: 'cascader',
            component: 'el-cascader',
            props: {
                label: '级联选择',
                placeholder: '请选择层级选项',
                required: false,
                disabled: false,
                clearable: true,
                filterable: true,
                showAllLevels: true,
                props: {
                    checkStrictly: false,
                    multiple: false,
                    emitPath: true,
                },
                apiUrl: '',
                options: [
                    {
                        value: 'zhejiang',
                        label: '浙江省',
                        children: [
                            {
                                value: 'hangzhou',
                                label: '杭州市',
                                children: [
                                    { value: 'xihu', label: '西湖区' },
                                    { value: 'binjiang', label: '滨江区' },
                                ],
                            },
                            {
                                value: 'ningbo',
                                label: '宁波市',
                                children: [
                                    { value: 'haishu', label: '海曙区' },
                                ],
                            },
                        ],
                    },
                    {
                        value: 'guangdong',
                        label: '广东省',
                        children: [
                            {
                                value: 'guangzhou',
                                label: '广州市',
                                children: [
                                    { value: 'tianhe', label: '天河区' },
                                ],
                            },
                            {
                                value: 'shenzhen',
                                label: '深圳市',
                                children: [
                                    { value: 'nanshan', label: '南山区' },
                                ],
                            },
                        ],
                    },
                ],
            },
        }),
    },
    {
        type: 'slider',
        label: '滑块',
        icon: 'Operation',
        category: 'basic',
        isContainer: false,
        component: 'el-slider',
        settingComponent: markRaw(SliderSetting),
        createDefault: () => ({
            id: generateWidgetId('slider'),
            type: 'slider',
            component: 'el-slider',
            props: {
                label: '滑块',
                required: false,
                disabled: false,
                min: 0,
                max: 100,
                step: 1,
                showInput: true,
                showStops: false,
            },
        }),
    },
    {
        type: 'upload',
        label: '附件',
        icon: 'UploadFilled',
        category: 'basic',
        isContainer: false,
        component: markRaw(FileUploadWidget),
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

// 容器/布局物料定义列表（全部标准化为统一的 slots 协议规范）
export const containerWidgets = [
    {
        type: 'grid',
        label: '栅格布局',
        icon: 'Grid',
        category: 'layout',
        isContainer: true,
        containerComponent: markRaw(GridContainer),
        settingComponent: markRaw(GridSetting),
        createDefault: () => ({
            id: generateWidgetId('grid'),
            type: 'grid',
            props: {
                gutter: 20,
                columns: [
                    { span: 12, slot: 'col_0' },
                    { span: 12, slot: 'col_1' },
                ],
            },
            slots: {
                col_0: [],
                col_1: [],
            },
        }),
    },
    {
        type: 'card',
        label: '分组卡片',
        icon: 'CreditCard',
        category: 'layout',
        isContainer: true,
        containerComponent: markRaw(CardContainer),
        settingComponent: markRaw(CardSetting),
        createDefault: () => ({
            id: generateWidgetId('card'),
            type: 'card',
            props: {
                title: '分组卡片',
                shadow: 'always',
                bordered: true,
            },
            slots: {
                default: [],
            },
        }),
    },
    {
        type: 'tabs',
        label: '标签页',
        icon: 'CollectionTag',
        category: 'layout',
        isContainer: true,
        containerComponent: markRaw(TabsContainer),
        settingComponent: markRaw(TabsSetting),
        createDefault: () => {
            const tab1 = `tab_${Date.now()}`;
            const tab2 = `tab_${Date.now() + 1}`;
            return {
                id: generateWidgetId('tabs'),
                type: 'tabs',
                props: {
                    tabType: 'border-card',
                    tabPosition: 'top',
                    activeTab: tab1,
                    panes: [
                        { label: '标签一', slot: tab1 },
                        { label: '标签二', slot: tab2 },
                    ],
                },
                slots: {
                    [tab1]: [],
                    [tab2]: [],
                },
            };
        },
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
 * 根据类型获取纯净容器排版组件
 */
export const getContainerComponent = (type) => {
    const widget = widgetMap.get(type);
    return widget?.containerComponent || null;
};

/**
 * 根据类型获取基础字段渲染组件 (优先物料专属自闭环组件，否则原生 element 标签)
 */
export const getFieldComponent = (type) => {
    const widget = widgetMap.get(type);
    return widget?.component || 'el-input';
};

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
