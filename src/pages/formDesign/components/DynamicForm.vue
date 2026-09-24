<!-- 表单渲染器 -->
<template>
    <el-form
        v-if="enhancedSchema.length > 0"
        ref="formRef"
        :rules="formRules"
        :model="innerData"
        :label-position="uiConfig?.labelPosition || 'right'"
        :size="uiConfig?.size || 'default'"
        :label-width="`${uiConfig?.labelWidth || 100}px`"
        class="dynamic-form"
    >
        <template v-for="(item, index) in enhancedSchema" :key="item.id">
            <!-- 栅格布局 -->
            <div v-if="item.type === 'grid'" class="grid-container">
                <el-row :gutter="item.props.gutter">
                    <el-col v-for="(col, colIndex) in item.props.columns" :key="colIndex" :span="col.span">
                        <div class="grid-col-content">
                            <template v-for="(colItem, colItemIndex) in col.list" :key="colItem.id">
                                <el-form-item :label="colItem.props.label" :prop="colItem.id" :required="colItem.props.required" style="margin-bottom: 16px">
                                    <!-- 附件/发票上传组件 -->
                                    <template v-if="colItem.type === 'upload'">
                                        <div style="width: 100%">
                                            <el-upload
                                                v-if="!noApproval"
                                                :action="uploadUrl"
                                                name="avatar"
                                                :headers="uploadHeaders"
                                                :accept="colItem.props.accept || '.jpg,.jpeg,.png,.pdf'"
                                                :limit="colItem.props.limit || 10"
                                                :show-file-list="false"
                                                :on-success="(res, file) => handleUploadSuccess(res, file, colItem.id)"
                                                :before-upload="(file) => beforeUploadCheck(file, colItem.props)"
                                            >
                                                <el-button type="primary" plain size="small">
                                                    <el-icon style="margin-right: 4px"><UploadFilled /></el-icon>
                                                    上传发票/凭证
                                                </el-button>
                                                <template #tip>
                                                    <div class="el-upload__tip" style="font-size: 12px; color: #909399; margin-top: 4px">
                                                        {{ colItem.props.tip || '支持jpg/png/pdf格式发票附件，单文件不超过10MB' }}
                                                    </div>
                                                </template>
                                            </el-upload>

                                            <!-- 自定义稳定发票附件卡片列表 (无闪烁、支持PDF专属徽标) -->
                                            <div v-if="innerData[colItem.id] && innerData[colItem.id].length > 0" class="custom-file-list">
                                                <div
                                                    v-for="(file, fIdx) in innerData[colItem.id]"
                                                    :key="file.id || file.fileName || fIdx"
                                                    class="custom-file-item"
                                                >
                                                    <!-- 左侧图标/缩略图 -->
                                                    <div class="file-icon-box" :class="{ 'is-pdf': isPdf(file) }">
                                                        <template v-if="isPdf(file)">
                                                            <div class="pdf-badge">
                                                                <el-icon :size="16"><Document /></el-icon>
                                                                <span class="pdf-tag">PDF</span>
                                                            </div>
                                                        </template>
                                                        <template v-else-if="isImage(file)">
                                                            <img :src="getFileUrl(file)" class="img-thumb" @error="(e) => e.target.style.display = 'none'" />
                                                            <el-icon :size="20" color="#409EFF" class="img-fallback"><Picture /></el-icon>
                                                        </template>
                                                        <template v-else>
                                                            <el-icon :size="22" color="#409EFF"><Document /></el-icon>
                                                        </template>
                                                    </div>

                                                    <!-- 中间文件详情 -->
                                                    <div class="file-info-box">
                                                        <div class="file-name" :title="getFileName(file)">{{ getFileName(file) }}</div>
                                                        <div class="file-meta">
                                                            <span v-if="file.size || file.fileSize" class="file-size">{{ formatFileSize(file.size || file.fileSize) }}</span>
                                                            <span class="file-status-tag">
                                                                <el-icon color="#67C23A" :size="12"><CircleCheckFilled /></el-icon>
                                                                已上传
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <!-- 右侧操作按钮 -->
                                                    <div class="file-actions-box">
                                                        <el-tooltip content="在新窗口查看/下载" placement="top">
                                                            <el-button link type="primary" size="small" @click="handlePreviewFile(file)">
                                                                <el-icon :size="16"><View /></el-icon>
                                                            </el-button>
                                                        </el-tooltip>
                                                        <el-tooltip content="移除文件" placement="top" v-if="!noApproval">
                                                            <el-button link type="danger" size="small" @click="handleRemoveFile(file, colItem.id)">
                                                                <el-icon :size="16"><Delete /></el-icon>
                                                            </el-button>
                                                        </el-tooltip>
                                                    </div>
                                                </div>
                                            </div>

                                            <div v-else-if="noApproval" style="color: #909399; font-size: 13px; padding: 4px 0">
                                                未上传发票/附件
                                            </div>
                                        </div>
                                    </template>

                                    <component
                                        v-else
                                        :is="colItem.component"
                                        v-model="innerData[colItem.id]"
                                        v-bind="getComponentProps(colItem)"
                                        :placeholder="colItem.props.placeholder"
                                        :loading="colItem.loading"
                                    >
                                        <!-- 下拉选项 -->
                                        <template v-if="colItem.type === 'select'">
                                            <el-option v-for="option in colItem.options" :key="option.value" :label="option.label" :value="option.value" />
                                        </template>
                                        <!-- 单选 -->
                                        <template v-if="colItem.type === 'radio'">
                                            <el-radio v-for="option in colItem.props.options" :key="option.value" :label="option.value">
                                                {{ option.label }}
                                            </el-radio>
                                        </template>
                                        <!-- 多选 -->
                                        <template v-if="colItem.type === 'checkbox'">
                                            <el-checkbox v-for="option in colItem.props.options" :key="option.value" :label="option.value">
                                                {{ option.label }}
                                            </el-checkbox>
                                        </template>
                                    </component>
                                </el-form-item>
                            </template>
                        </div>
                    </el-col>
                </el-row>
            </div>

            <!-- 普通组件 -->
            <el-form-item v-else :label="item.props.label" :prop="item.id" :required="item.props.required" style="margin-bottom: 16px">
                <!-- 附件/发票上传组件 -->
                <template v-if="item.type === 'upload'">
                    <div style="width: 100%">
                        <el-upload
                            v-if="!noApproval"
                            :action="uploadUrl"
                            name="avatar"
                            :headers="uploadHeaders"
                            :accept="item.props.accept || '.jpg,.jpeg,.png,.pdf'"
                            :limit="item.props.limit || 10"
                            :show-file-list="false"
                            :on-success="(res, file) => handleUploadSuccess(res, file, item.id)"
                            :before-upload="(file) => beforeUploadCheck(file, item.props)"
                        >
                            <el-button type="primary" plain size="small">
                                <el-icon style="margin-right: 4px"><UploadFilled /></el-icon>
                                上传发票/凭证
                            </el-button>
                            <template #tip>
                                <div class="el-upload__tip" style="font-size: 12px; color: #909399; margin-top: 4px">
                                    {{ item.props.tip || '支持jpg/png/pdf格式发票附件，单文件不超过10MB' }}
                                </div>
                            </template>
                        </el-upload>

                        <!-- 自定义稳定发票附件卡片列表 (无闪烁、支持PDF专属徽标) -->
                        <div v-if="innerData[item.id] && innerData[item.id].length > 0" class="custom-file-list">
                            <div
                                v-for="(file, fIdx) in innerData[item.id]"
                                :key="file.id || file.fileName || fIdx"
                                class="custom-file-item"
                            >
                                <!-- 左侧图标/缩略图 -->
                                <div class="file-icon-box" :class="{ 'is-pdf': isPdf(file) }">
                                    <template v-if="isPdf(file)">
                                        <div class="pdf-badge">
                                            <el-icon :size="16"><Document /></el-icon>
                                            <span class="pdf-tag">PDF</span>
                                        </div>
                                    </template>
                                    <template v-else-if="isImage(file)">
                                        <img :src="getFileUrl(file)" class="img-thumb" @error="(e) => e.target.style.display = 'none'" />
                                        <el-icon :size="20" color="#409EFF" class="img-fallback"><Picture /></el-icon>
                                    </template>
                                    <template v-else>
                                        <el-icon :size="22" color="#409EFF"><Document /></el-icon>
                                    </template>
                                </div>

                                <!-- 中间文件详情 -->
                                <div class="file-info-box">
                                    <div class="file-name" :title="getFileName(file)">{{ getFileName(file) }}</div>
                                    <div class="file-meta">
                                        <span v-if="file.size || file.fileSize" class="file-size">{{ formatFileSize(file.size || file.fileSize) }}</span>
                                        <span class="file-status-tag">
                                            <el-icon color="#67C23A" :size="12"><CircleCheckFilled /></el-icon>
                                            已上传
                                        </span>
                                    </div>
                                </div>

                                <!-- 右侧操作按钮 -->
                                <div class="file-actions-box">
                                    <el-tooltip content="在新窗口查看/下载" placement="top">
                                        <el-button link type="primary" size="small" @click="handlePreviewFile(file)">
                                            <el-icon :size="16"><View /></el-icon>
                                        </el-button>
                                    </el-tooltip>
                                    <el-tooltip content="移除文件" placement="top" v-if="!noApproval">
                                        <el-button link type="danger" size="small" @click="handleRemoveFile(file, item.id)">
                                            <el-icon :size="16"><Delete /></el-icon>
                                        </el-button>
                                    </el-tooltip>
                                </div>
                            </div>
                        </div>

                        <div v-else-if="noApproval" style="color: #909399; font-size: 13px; padding: 4px 0">
                            未上传发票/附件
                        </div>
                    </div>
                </template>

                <component v-else :is="item.component" v-model="innerData[item.id]" v-bind="getComponentProps(item)" :placeholder="item.props.placeholder" :loading="item.loading">
                    <!-- 下拉选项（支持动态加载） -->
                    <template v-if="item.type === 'select'">
                        <el-option v-for="option in item.options" :key="option.value" :label="option.label" :value="option.value" />
                    </template>
                    <!-- 单选 -->
                    <template v-if="item.type === 'radio'">
                        <el-radio v-for="option in item.props.options" :key="option.value" :label="option.value">
                            {{ option.label }}
                        </el-radio>
                    </template>
                    <!-- 多选 -->
                    <template v-if="item.type === 'checkbox'">
                        <el-checkbox v-for="option in item.props.options" :key="option.value" :label="option.value">
                            {{ option.label }}
                        </el-checkbox>
                    </template>
                </component>
            </el-form-item>
        </template>
    </el-form>
</template>

<script setup>
import { oGet } from '@/utils/request';
import { ref, reactive, watch, onMounted, getCurrentInstance, computed, nextTick } from 'vue';
import { UploadFilled, Document, Picture, Delete, View, CircleCheckFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
const { proxy } = getCurrentInstance();
const formRef = ref(null);

const uploadUrl = computed(() => `${proxy?.$api?.baseUrl || 'http://127.0.0.1:3001/api'}/upload/uploadFile`);
const uploadHeaders = computed(() => {
    const token = sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
});

// 文件类型与预览辅助
const isPdf = file => {
    const name = file?.name || file?.fileName || file?.url || '';
    return name.toLowerCase().endsWith('.pdf') || (file?.contentType && file.contentType.includes('pdf'));
};

const isImage = file => {
    const name = file?.name || file?.fileName || file?.url || '';
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name) || (file?.contentType && file.contentType.startsWith('image/'));
};

const formatFileSize = bytes => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileName = file => {
    return file?.name || file?.fileName || '发票凭证附件';
};

const getFileUrl = file => {
    if (!file) return '';
    if (file.url && file.url.startsWith('http')) return file.url;
    // 优先使用环境变量中配置的静态服务地址 (默认 3001)
    const staticBase = import.meta.env.VITE_STATIC_URL || proxy?.$api?.img_url || 'http://127.0.0.1:3001/api/';
    const filePath = file.filePath || file.path;
    if (filePath) {
        const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
        return `${staticBase.replace(/\/+$/, '')}/${cleanPath}`;
    }
    if (file.fileName) {
        return `${staticBase.replace(/\/+$/, '')}/uploads/${file.fileName}`;
    }
    return file.url || '';
};

const handlePreviewFile = file => {
    const url = getFileUrl(file);
    if (url) {
        window.open(url, '_blank');
    } else {
        ElMessage.warning('暂无可用预览地址');
    }
};

const handleRemoveFile = (targetFile, fieldId) => {
    if (!Array.isArray(innerData.value[fieldId])) return;
    innerData.value[fieldId] = innerData.value[fieldId].filter(
        f => f !== targetFile && (f.id ? f.id !== targetFile.id : f.fileName !== targetFile.fileName)
    );
    ElMessage.info('已移除该附件');
};

const beforeUploadCheck = (file, props) => {
    const maxSize = (props?.maxSize || 10) * 1024 * 1024;
    if (file.size > maxSize) {
        ElMessage.error(`上传文件大小不能超过 ${props?.maxSize || 10}MB`);
        return false;
    }
    return true;
};

const handleUploadSuccess = (response, file, fieldId) => {
    console.log('发票附件上传成功:', response);
    const fileData = response?.data || response;
    const itemInfo = {
        id: fileData?.id,
        name: file.name || fileData?.fileName,
        fileName: fileData?.fileName,
        filePath: fileData?.filePath,
        contentType: fileData?.contentType || file?.raw?.type || (file.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : ''),
        size: file.size || fileData?.fileSize,
        url: getFileUrl(fileData),
    };
    if (!Array.isArray(innerData.value[fieldId])) {
        innerData.value[fieldId] = [];
    }
    innerData.value[fieldId].push(itemInfo);
    ElMessage.success(`${file.name} 上传成功`);
};

const props = defineProps({
    schema: {
        type: Array,
        required: true,
    },
    uiConfig: {
        type: Object,
        default: () => ({}),
    },
    modelValue: {
        type: Object,
        default: () => ({}),
    },
    noApproval: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue']);

// 内部数据
const innerData = ref({ ...props.modelValue });

// 动态生成校验规则
const formRules = computed(() => {
    const rules = {};
    const processItem = item => {
        if (item.props?.required) {
            rules[item.id] = [
                {
                    required: true,
                    message: item.props.label ? `${item.props.label}不能为空` : '该字段不能为空',
                    trigger: ['blur', 'change'],
                },
            ];
        }
    };

    enhancedSchema.forEach(item => {
        if (item.type === 'grid') {
            item.props.columns.forEach(col => {
                col.list.forEach(colItem => {
                    processItem(colItem);
                });
            });
        } else {
            processItem(item);
        }
    });

    return rules;
});

// 加载 API 数据源
const loadApiOptions = async item => {
    // if (item.id === 'sqr' && !props.noApproval) {
    console.log('loadApiOptions', item);
    if (item.id === 'sqr' && innerData.value[item.id]) {
        const savedValue = innerData.value[item.id];
        if (savedValue) {
            try {
                // 调用接口，根据 ID 获取用户信息
                const userRes = await oGet(`/internalusers/detail?id=${savedValue}`);
                const user = userRes.data || userRes;
                item.options = [
                    {
                        label: user.name || user.realName || user.username || `用户(${savedValue})`,
                        value: savedValue,
                    },
                ];
                if (!innerData.value[item.id]) {
                    innerData.value[item.id] = savedValue;
                }
            } catch (error) {
                console.error('获取用户信息失败:', error);
                item.options = [{ label: `用户(${savedValue})`, value: savedValue }];
            }
        } else {
            item.options = [];
        }
        return;
    }

    if (!item.props.apiUrl) return;
    item.loading = true;
    try {
        const res = await oGet(item.props.apiUrl);
        let data = [];
        if (Array.isArray(res)) {
            data = res;
        } else if (res.data && Array.isArray(res.data)) {
            data = res.data;
        } else if (res.list && Array.isArray(res.list)) {
            data = res.list;
        } else {
            data.push(res.data);
        }
        // 默认取 label/value，可以扩展字段映射
        item.options = data.map(d => ({
            label: d.label || d.name || d.title || String(d),
            value: d.value || d.id || d.code || d,
        }));
        // 如果只有一项的话就默认选中
        if (item.options.length == 1) {
            innerData.value[item.id] = item.options[0].value;
        }
    } catch (error) {
        console.error(`加载数据源失败 ${item.props.apiUrl}:`, error);
        item.options = [];
    } finally {
        item.loading = false;
    }
};

// 获取组件属性
const getComponentProps = item => {
    const propsCol = { ...item.props };
    // 检查 propsCol 自身没有disabled 属性
    // if (!propsCol.hasOwnProperty('disabled')) {
    //     propsCol.disabled = props.noApproval;
    // }
    if (propsCol.disabled === false) {
        propsCol.disabled = props.noApproval;
    }

    // 删除不需要传递给组件的属性
    // delete props.label;
    // delete props.options;
    // delete props.apiUrl;
    return propsCol;
};

// 监听外部数据变化
watch(
    () => props.modelValue,
    newVal => {
        innerData.value = { ...newVal };
    },
    { deep: true },
);

// 监听内部数据变化，同步到外部
watch(
    innerData,
    newVal => {
        // 避免循环，检查是否有实际变化
        const hasChanges = Object.keys(newVal).some(key => newVal[key] !== props.modelValue[key]);
        if (hasChanges) {
            emit('update:modelValue', { ...newVal }); // 浅拷贝发送
        }
    },
    { deep: true },
);

// 增强 schema，添加 options 和 loading 状态
let enhancedSchema = reactive([]);

watch(
    () => props.schema,
    async newSchema => {
        if (!newSchema || newSchema.length === 0) return;

        // 清空并重新构建
        enhancedSchema.length = 0; //  清空数组

        // 复制并增强每个组件
        for (let item of newSchema) {
            let newItem;
            if (item.type === 'grid') {
                newItem = {
                    ...item,
                    props: {
                        ...item.props,
                        columns: item.props.columns.map(col => ({
                            ...col,
                            list: col.list.map(colItem => ({
                                ...colItem,
                                options: colItem.props?.options || [],
                                loading: false,
                            })),
                        })),
                    },
                };
            } else {
                newItem = {
                    ...item,
                    options: item.props?.options || [],
                    loading: false,
                };
            }
            enhancedSchema.push(newItem);
        }
        console.log('enhancedSchema:', enhancedSchema);

        // 加载动态数据源
        for (let item of enhancedSchema) {
            if (item.type === 'grid') {
                for (let col of item.props.columns) {
                    for (let colItem of col.list) {
                        if (colItem.type === 'select' && colItem.props.apiUrl) {
                            await loadApiOptions(colItem);
                        }
                    }
                }
            } else if (item.type === 'select' && item.props.apiUrl) {
                await loadApiOptions(item);
            }
        }
        setupComputedFields(); // 设置计算字段
    },
    { immediate: true, deep: true },
);

const setupComputedFields = () => {
    // 辅助函数：处理单个字段的计算逻辑
    const processField = field => {
        if (field.props?.isComputed && field.props.dependencies?.length && field.props.computedExpression) {
            watch(
                () => field.props.dependencies.map(dep => innerData.value[dep]),
                newValues => {
                    try {
                        // 构建上下文：{ fieldId: value, ... }
                        const context = field.props.dependencies.reduce((acc, dep, idx) => {
                            let val = newValues[idx];
                            if (typeof val === 'string' && !isNaN(Date.parse(val))) {
                                val = new Date(val).getTime(); // 日期字符串转时间戳
                            } else if (val instanceof Date) {
                                val = val.getTime(); // Date 对象转时间戳
                            }
                            acc[dep] = val;
                            return acc;
                        }, {});
                        // 使用 new Function 执行表达式
                        const exprFn = new Function('context', `with(context) { return ${field.props.computedExpression}; }`);
                        const result = exprFn(context);
                        innerData.value[field.id] = Number.isFinite(result) ? result.toFixed(1) : '';
                    } catch (error) {
                        console.error(`计算字段 ${field.id} 失败:`, error);
                        innerData.value[field.id] = '计算错误';
                    }
                },
                { immediate: true, deep: true },
            );
        }
    };

    // 遍历 enhancedSchema，处理非 grid 和 grid 内的字段
    enhancedSchema.forEach(item => {
        if (item.type !== 'grid') {
            processField(item); // 处理普通字段
        } else {
            // 处理 grid 内的字段
            item.props.columns.forEach(col => {
                col.list.forEach(field => {
                    processField(field); // 处理 grid 内的每个字段
                });
            });
        }
    });
};

defineExpose({
    async validate() {
        await formRef.value.validate();
    },
});
</script>

<style scoped>
.dynamic-form {
    width: 100%;
}

.grid-container {
    width: 100%;
}

.grid-col-content {
    min-height: 40px;
    padding: 2px 0;
}

/* 🌟 高性能发票/附件卡片列表 (杜绝闪烁、支持PDF专属图标) */
.custom-file-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
    width: 100%;
}

.custom-file-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    transition: all 0.2s ease;
    box-sizing: border-box;
}

.custom-file-item:hover {
    background: #ffffff;
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.file-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eff6ff;
    margin-right: 12px;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    border: 1px solid #dbeafe;
}

.file-icon-box.is-pdf {
    background: #fef2f2;
    border: 1px solid #fee2e2;
}

.pdf-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #ef4444;
}

.pdf-tag {
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    margin-top: 2px;
    letter-spacing: 0.5px;
}

.img-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.img-fallback {
    display: none;
}

.file-info-box {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.file-name {
    font-size: 13px;
    font-weight: 500;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 22px;
}

.file-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: #94a3b8;
    line-height: 22px;
}

.file-status-tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: #16a34a;
    font-size: 11px;
}

.file-actions-box {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 10px;
    flex-shrink: 0;
}

</style>
