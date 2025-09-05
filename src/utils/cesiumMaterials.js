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
                    textureAspectRatio: options.textureAspectRatio || 1.0,
                },
                source: `
                    uniform float flowSpeed;
                    uniform float mixRatio;
                    uniform sampler2D image;
                    uniform float textureRepeat;
                    uniform float textureAspectRatio;
                    czm_material czm_getMaterial(czm_materialInput materialInput) {
                        czm_material material = czm_getDefaultMaterial(materialInput);
                        vec2 st = materialInput.st;
                        float time = czm_frameNumber / 240.0;
                        vec2 scaledSt = vec2(st.s * textureRepeat, st.t * textureRepeat * textureAspectRatio);
                        vec2 animatedSt = vec2(fract(scaledSt.s - time * flowSpeed), st.t);
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
        this._textureAspectRatio = undefined;

        this.image = options.image;
        this.flowSpeed = options.flowSpeed;
        this.mixColor = options.mixColor;
        this.mixRatio = options.mixRatio;
        this.textureRepeat = options.textureRepeat;
        this.textureAspectRatio = options.textureAspectRatio;
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
        result.textureRepeat = Cesium.Property.getValueOrUndefined(this._textureRepeat, time) || this.textureRepeat;
        result.textureAspectRatio = Cesium.Property.getValueOrUndefined(this._textureAspectRatio, time) || this.textureAspectRatio;
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
        textureAspectRatio: Cesium.createPropertyDescriptor('textureAspectRatio'),
    });

    FlowLineMaterialProperty.prototype.equals = function (other) {
        return (
            this === other ||
            (other instanceof FlowLineMaterialProperty &&
                Cesium.Property.equals(this._image, other._image) &&
                Cesium.Property.equals(this._flowSpeed, other._flowSpeed) &&
                Cesium.Property.equals(this._mixColor, other._mixColor) &&
                Cesium.Property.equals(this._mixRatio, other._mixRatio) &&
                Cesium.Property.equals(this._textureRepeat, other._textureRepeat) &&
                Cesium.Property.equals(this._textureAspectRatio, other._textureAspectRatio))
        );
    };

    const materialProperty = new FlowLineMaterialProperty(options);

    return materialProperty;
}
