// 这是  utils/cesiumMaterials.js

import * as Cesium from 'cesium';

export function createFlowLineMaterial(options) {
    const materialType = 'FlowLineMaterialType';

    if (!Cesium.Material[materialType]) {
        Cesium.Material[materialType] = materialType;

        Cesium.Material._materialCache.addMaterial(materialType, {
            fabric: {
                type: materialType,
                uniforms: {
                    image: options.image,
                    flowSpeed: options.flowSpeed || 1.0,
                    mixColor: options.mixColor || Cesium.Color.BLUE.withAlpha(1.0),
                    mixRatio: options.mixRatio || 0.7,
                    textureRepeat: options.textureRepeat || 100.0,
                },
                source: `
                    uniform float flowSpeed;
                    uniform float mixRatio;
                    uniform sampler2D image;
                    uniform float textureRepeat;
                    czm_material czm_getMaterial(czm_materialInput materialInput) {
                        czm_material material = czm_getDefaultMaterial(materialInput);
                        vec2 st = materialInput.st;
                        float time = czm_frameNumber / 240.0;
                        // st.s 在 0~1 之间覆盖整条线，乘以 textureRepeat 实现重复
                        float repeatedS = fract(st.s * textureRepeat - time * flowSpeed);
                        vec2 animatedSt = vec2(repeatedS, st.t);
                        vec4 color = texture(image, animatedSt);
                        material.alpha = max(color.a, mixColor.a);
                        material.diffuse = mix(mixColor.rgb, color.rgb, color.a * mixRatio);
                        return material;
                    }
                `,
            },
            translucent: true,
        });
    }

    // 自定义 MaterialProperty
    function FlowLineMaterialProperty(options) {
        this._definitionChanged = new Cesium.Event();
        this._image = undefined;
        this._flowSpeed = undefined;
        this._mixColor = undefined;
        this._mixRatio = undefined;
        this._textureRepeat = undefined;

        this.image = options.image;
        this.flowSpeed = options.flowSpeed;
        this.mixColor = options.mixColor;
        this.mixRatio = options.mixRatio;
        this.textureRepeat = options.textureRepeat || 35;

        // 动态距离计算
        this._getDistance = options.getDistance || null; // 回调函数，返回总距离（米）
        this._arrowSpacing = options.arrowSpacing || 30; // 基准箭头间距（米）
        this._viewer = options.viewer || null; // viewer 引用，用于获取相机高度
        this._baseCameraHeight = options.baseCameraHeight || 800; // 基准相机高度（米）
    }

    FlowLineMaterialProperty.prototype.getType = function () {
        return materialType;
    };

    FlowLineMaterialProperty.prototype.getValue = function (time, result) {
        if (!result) result = {};
        result.image = Cesium.Property.getValueOrUndefined(this._image, time) || this.image;
        result.flowSpeed = Cesium.Property.getValueOrUndefined(this._flowSpeed, time) || this.flowSpeed;
        result.mixColor = Cesium.Property.getValueOrUndefined(this._mixColor, time) || this.mixColor;
        result.mixRatio = Cesium.Property.getValueOrUndefined(this._mixRatio, time) || this.mixRatio;

        // 核心：动态计算 textureRepeat = 总距离 / 动态箭头间距
        if (this._getDistance) {
            const distance = this._getDistance();
            if (distance > 0) {
                let arrowSpacing = this._arrowSpacing;

                // 根据相机高度动态缩放箭头间距
                // 相机越近 → arrowSpacing 越小 → textureRepeat 越大 → 箭头越多越密
                // 相机越远 → arrowSpacing 越大 → textureRepeat 越小 → 箭头越少越稀
                if (this._viewer && this._viewer.camera) {
                    const cameraHeight = this._viewer.camera.positionCartographic.height;
                    const scale = Math.max(0.05, cameraHeight / this._baseCameraHeight);
                    arrowSpacing = this._arrowSpacing * scale;
                }

                result.textureRepeat = Math.max(1, Math.round(distance / arrowSpacing));
            } else {
                result.textureRepeat = 1;
            }
        } else {
            result.textureRepeat = Cesium.Property.getValueOrUndefined(this._textureRepeat, time) || this.textureRepeat;
        }

        return result;
    };

    Object.defineProperties(FlowLineMaterialProperty.prototype, {
        isConstant: {
            get: function () {
                return false;
            },
        },
        definitionChanged: {
            get: function () {
                return this._definitionChanged;
            },
        },
        image: Cesium.createPropertyDescriptor('image'),
        flowSpeed: Cesium.createPropertyDescriptor('flowSpeed'),
        mixColor: Cesium.createPropertyDescriptor('mixColor'),
        mixRatio: Cesium.createPropertyDescriptor('mixRatio'),
        textureRepeat: Cesium.createPropertyDescriptor('textureRepeat'),
    });

    FlowLineMaterialProperty.prototype.equals = function (other) {
        return (
            this === other ||
            (other instanceof FlowLineMaterialProperty &&
                Cesium.Property.equals(this._image, other._image) &&
                Cesium.Property.equals(this._flowSpeed, other._flowSpeed) &&
                Cesium.Property.equals(this._mixColor, other._mixColor) &&
                Cesium.Property.equals(this._mixRatio, other._mixRatio) &&
                Cesium.Property.equals(this._textureRepeat, other._textureRepeat))
        );
    };

    const materialProperty = new FlowLineMaterialProperty(options);

    return materialProperty;
}
