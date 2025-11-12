import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import Unocss from 'unocss/vite';

export default defineConfig(({ mode, command }) => {
    const { VITE_PORT, VITE_BASE_URL, VITE_PROXY_DOMAIN_REAL } = loadEnv(mode, process.cwd());
    const alias = {
        '@': path.resolve(__dirname, './src'),
    };

    const commonConfig = {
        base: VITE_BASE_URL,
        plugins: [vue(), Unocss()],
        resolve: {
            alias,
            extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
        },
        assetsInclude: ['**/*.gltf', '**/*.glb'], // 移除静态资源包含，避免误打包
    };

    const devServerConfig = {
        server: {
            host: '0.0.0.0',
            port: 5173,
        },
    };

    // 业务构建配置
    const appBuildConfig = {
        build: {
            outDir: 'dist', // 业务输出到 dist
            emptyOutDir: true, // 清理 dist 目录
            copyPublicDir: true, // 业务需要 public 目录
        },
    };

    // 组件库构建配置
    const libConfig = (entry, name, fileNamePrefix) => ({
        build: {
            lib: {
                entry,
                name,
                fileName: format => `${fileNamePrefix}.${format === 'es' ? 'es' : 'umd'}.js`, // 调整为 es.js
                formats: ['es', 'umd'], // 明确生成 ESM 和 UMD
            },
            rollupOptions: {
                external: ['vue', 'element-plus', 'cesium'], // 排除外部依赖
                output: {
                    globals: {
                        vue: 'Vue',
                        'element-plus': 'ElementPlus',
                        cesium: 'Cesium',
                    },
                },
            },
            outDir: `dist-lib/${fileNamePrefix}`, // 组件输出到 dist-lib
            emptyOutDir: true, // 清理组件输出目录
            copyPublicDir: false, // 禁用 public 目录复制
        },
    });

    if (command === 'build' && mode.startsWith('lib-')) {
        const component = mode.split('lib-')[1];
        let entry, name, fileNamePrefix;
        switch (component) {
            case 'input':
                entry = 'src/my-input-entry.js';
                name = 'MyInputNumber';
                fileNamePrefix = 'my-input-number';
                break;
            case 'button':
                entry = 'src/my-button-entry.js';
                name = 'MyCustomButton';
                fileNamePrefix = 'my-custom-button';
                break;
            default:
                throw new Error(`Unknown component mode: ${mode}. Use 'lib-input' or 'lib-button'.`);
        }
        return {
            ...commonConfig,
            ...libConfig(entry, name, fileNamePrefix),
        };
    }

    return {
        ...commonConfig,
        ...devServerConfig,
        ...appBuildConfig, // 业务构建使用默认配置
        server: {
            port: VITE_PORT,
            proxy: {
                '/api': {
                    target: `${VITE_PROXY_DOMAIN_REAL}`,
                    changeOrigin: true,
                    rewrite: path => path.replace(/^\/api/, ''),
                },
            },
        },
    };
});
