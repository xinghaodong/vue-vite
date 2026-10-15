/**
 * ========================================================================
 * 文件名称: useCesiumModels.js
 * 所属模块: 组合式 API (src/composables)
 * 功能说明:
 *   实景三维与 3D Tileset 模型管控 Hook：
 *   1. 统一管理 3D Tiles 倾斜摄影实景三维模型的异步加载、缓存与卸载；
 *   2. 自动根据 Cesium 全球地形计算 ENU (东-北-天) 坐标矩阵贴地平移高差 (applyHeightOffset)；
 *   3. 提供基于包围球 (BoundingSphere) 的平滑相机聚焦与倾斜漫游视角定位。
 * ========================================================================
 */

import { ref, shallowRef } from 'vue';
import * as Cesium from 'cesium';

export function useCesiumModels() {
    const loadedTilesets = shallowRef({}); // 存储已加载的模型 primitives，Key 为 id 或 url
    const currentActiveModelId = ref(null);

    /**
     * 应用真实地形高程与用户偏移，使实景三维模型严丝合缝贴合地表
     * @param {Cesium.Viewer} viewer 
     * @param {Cesium.Cesium3DTileset} tileset 
     * @param {number} [additionalOffset=0] 自定义垂直微调偏移 (米)
     */
    const applyHeightOffset = async (viewer, tileset, additionalOffset = 0) => {
        if (!viewer || !tileset) return;
        const boundingSphere = tileset.boundingSphere;
        if (!boundingSphere) return;

        const cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
        let terrainHeight = viewer.scene.globe.getHeight(cartographic);

        // 如果开启了 Cesium 真实地形，尝试采样更精细的网格高程
        if (viewer.terrainProvider && viewer.terrainProvider.availability) {
            try {
                const [updatedCarto] = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [cartographic]);
                if (updatedCarto && updatedCarto.height !== undefined) {
                    terrainHeight = updatedCarto.height;
                }
            } catch (e) {
                console.warn('获取精确地形高程失败，使用地表投影高度:', e);
            }
        }

        if (terrainHeight === undefined || terrainHeight === null) {
            terrainHeight = 0;
        }

        // 计算需要调整的总偏移量：目标高度(地形高程 + 附加偏移) - 模型原始中心高度
        const totalOffset = terrainHeight - cartographic.height + additionalOffset;

        if (Math.abs(totalOffset) > 0.01) {
            // 在模型中心点构建局部东-北-天 (ENU) 坐标系进行垂直方向平移
            const enuMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(boundingSphere.center);
            const localTranslation = new Cesium.Cartesian3(0.0, 0.0, totalOffset);
            const worldTranslation = Cesium.Matrix4.multiplyByPointAsVector(
                enuMatrix,
                localTranslation,
                new Cesium.Cartesian3()
            );

            const modelMatrix = Cesium.Matrix4.fromTranslation(worldTranslation);
            tileset.modelMatrix = modelMatrix;
            tileset.initialModelMatrix = Cesium.Matrix4.clone(modelMatrix);
        }
    };

    /**
     * 加载单个实景三维模型
     * @param {Cesium.Viewer} viewer 
     * @param {object} model 
     * @param {string} model.id 唯一标识
     * @param {string} model.name 模型名称
     * @param {string} model.url 3D Tiles 瓦片地址
     * @param {number} [model.heightOffset=0] 高度偏移
     * @param {object} [options] 额外 Cesium3DTileset 参数
     */
    const loadModel = async (viewer, model, options = {}) => {
        if (!viewer || !model || !model.url) return null;
        const modelId = model.id || model.url;

        // 若已加载过该模型，直接返回缓存实例
        if (loadedTilesets.value[modelId]) {
            currentActiveModelId.value = modelId;
            return loadedTilesets.value[modelId];
        }

        try {
            console.log(`正在加载实景三维模型 [${model.name || modelId}]:`, model.url);
            const tileset = await Cesium.Cesium3DTileset.fromUrl(model.url, {
                maximumScreenSpaceError: options.maximumScreenSpaceError ?? 16,
                maximumMemoryUsage: options.maximumMemoryUsage ?? 1024,
                skipLevelOfDetail: false,
                preferLeaves: true,
                immediatelyLoadDesiredLevelOfDetail: true,
                ...options,
            });

            // 添加到 Primitives 场景图层集合
            viewer.scene.primitives.add(tileset);

            // 贴地高程适配
            const offset = model.heightOffset !== undefined ? model.heightOffset : 0;
            await applyHeightOffset(viewer, tileset, offset);

            loadedTilesets.value = {
                ...loadedTilesets.value,
                [modelId]: tileset,
            };
            currentActiveModelId.value = modelId;

            console.log(`实景三维模型 [${model.name || modelId}] 加载就绪`);
            return tileset;
        } catch (err) {
            console.error(`渲染实景三维 3D Tiles [${model.name || modelId}] 失败:`, err);
            throw err;
        }
    };

    /**
     * 卸载指定模型
     */
    const unloadModel = (viewer, modelId) => {
        if (!viewer || !modelId) return;
        const tileset = loadedTilesets.value[modelId];
        if (tileset) {
            if (!tileset.isDestroyed()) {
                viewer.scene.primitives.remove(tileset);
            }
            const updated = { ...loadedTilesets.value };
            delete updated[modelId];
            loadedTilesets.value = updated;
            if (currentActiveModelId.value === modelId) {
                currentActiveModelId.value = null;
            }
        }
    };

    /**
     * 卸载所有模型
     */
    const unloadAllModels = (viewer) => {
        if (!viewer) return;
        Object.keys(loadedTilesets.value).forEach((id) => {
            const tileset = loadedTilesets.value[id];
            if (tileset && !tileset.isDestroyed()) {
                viewer.scene.primitives.remove(tileset);
            }
        });
        loadedTilesets.value = {};
        currentActiveModelId.value = null;
    };

    /**
     * 相机平滑飞往/聚焦到指定模型
     * @param {Cesium.Viewer} viewer 
     * @param {string} [modelId] 模型 ID，缺省使用当前活跃模型
     * @param {number} [duration=2] 飞行耗时 (秒)
     * @param {Cesium.HeadingPitchRange} [offset] 相机视角偏移
     */
    const flyToModel = async (viewer, modelId = currentActiveModelId.value, duration = 2, offset = null) => {
        if (!viewer || !modelId) return;
        const tileset = loadedTilesets.value[modelId];
        if (!tileset) return;

        const defaultOffset = offset || new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(0),
            Cesium.Math.toRadians(-45),
            0
        );

        if (tileset.boundingSphere && tileset.boundingSphere.radius > 0) {
            viewer.camera.flyToBoundingSphere(tileset.boundingSphere, {
                duration,
                offset: defaultOffset,
            });
        } else {
            // 回退到 zoomTo
            await viewer.zoomTo(tileset, defaultOffset);
        }
    };

    return {
        loadedTilesets,
        currentActiveModelId,
        loadModel,
        unloadModel,
        unloadAllModels,
        flyToModel,
        applyHeightOffset,
    };
}
