//饿了么 icon 集合
import * as Icons from '@element-plus/icons-vue';

export const iconLists = Object.keys(Icons).map(key => ({
    label: key, // 图标名称
    value: Icons[key], // 图标组件
}));
