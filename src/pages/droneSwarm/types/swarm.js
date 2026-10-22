/**
 * ========================================================================
 * 文件名称: swarm.js
 * 所属模块: 无人机集群编队设计与表演系统 (SwarmStudio)
 * 功能说明:
 *   基于领域驱动设计 (DDD) 规范的无人机编队数据模型体系：
 *   - Agent: 单个无人机物理实体（ID、空间坐标 X/Y/Z、LED 颜色、状态）
 *   - Motif: 构型基元（如“爱心”、“折线”、“文字”等离散化矢量图元）
 *   - Cue: 时间轴关键帧提示点（动作触发、变轨时间戳、过渡曲线）
 *   - Scene: 表演分镜剧本（单场景全量无人机状态与灯光矩阵）
 *   - Show: 完整编队飞行表演工程（多分镜集合、全局安全步长、总时长）
 *   - SDF: Swarm Data Format 工业级数据交换协议规范
 * ========================================================================
 */

/**
 * 默认单个无人机实体工厂
 * @param {Partial<Agent>} data
 * @returns {Agent}
 */
export function createAgent(data = {}) {
    return {
        id: data.id ?? 0,
        x: data.x ?? 0,         // 平面/空间 X 坐标 (米)
        y: data.y ?? 0,         // 平面 Y 坐标或空间高度 Y (米)
        z: data.z ?? 0,         // 空间深度 Z 坐标 (米，2D视图默认为 0)
        color: data.color ?? '#00ffff', // LED 默认荧光青色
        size: data.size ?? 4,   // 光点直径 (像素/标定单位)
        alpha: data.alpha ?? 1.0, // 亮度透明度 (0~1)
        group: data.group ?? 'default', // 构型所属分组
        selected: false,
    };
}

/**
 * 分镜基元工厂
 * @param {Partial<SwarmScene>} data
 * @returns {SwarmScene}
 */
export function createScene(data = {}) {
    return {
        id: data.id || `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: data.name || '新分镜',
        duration: data.duration ?? 5,       // 悬停展示时长 (秒)
        transitionTime: data.transitionTime ?? 3, // 飞向下一分镜的过渡航行时间 (秒)
        agents: (data.agents || []).map(createAgent),
        motifType: data.motifType || 'custom', // 'image' | 'preset' | 'text' | 'custom'
    };
}

/**
 * 时间轴 Cue 提示点工厂
 * @param {Partial<SwarmCue>} data
 * @returns {SwarmCue}
 */
export function createCue(data = {}) {
    return {
        id: data.id || `cue_${Date.now()}`,
        timestamp: data.timestamp ?? 0, // 秒
        type: data.type || 'morph',     // 'takeoff' | 'morph' | 'light_flash' | 'land'
        targetSceneId: data.targetSceneId || '',
        easing: data.easing || 'power2.inOut',
    };
}

/**
 * 整场表演工程工厂 (Show)
 * @param {Partial<SwarmShow>} data
 * @returns {SwarmShow}
 */
export function createShow(data = {}) {
    return {
        title: data.title || '无人机夜空编队创意工程',
        version: '1.0.0 (SDF v1)',
        droneCount: data.droneCount ?? 800, // 标定总架数 (如 800 / 1600 架)
        safetyDistance: data.safetyDistance ?? 1.5, // 物理安全防撞间距 (米)
        scenes: data.scenes || [],
        cues: data.cues || [],
    };
}
