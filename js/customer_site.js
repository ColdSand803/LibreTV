/**
 * 客户自定义影视资源站点配置
 * 可以在这里定义额外支持的 CMS 接口站点
 */
const CUSTOMER_SITES = {
    qiqi: {
        name: '七七资源',
        api: 'https://www.qiqidys.com/api.php/provide/vod',
    }
};

// 检查依赖并挂载自定义配置
if (typeof window !== 'undefined' && window.extendAPISites) {
    window.extendAPISites(CUSTOMER_SITES);
} else {
    console.error('[LibreTV 错误] 无法合并自定义站点配置：请确认主配置 config.js 已在使用此文件前被正确加载！');
}
