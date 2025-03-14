// 地图相关变量
let visitorMap;
let markers = [];
let visitorsData = new Map(); // 用于存储访问者数据
const MAX_MARKERS = 50; // 最大标记数量
const LOCATION_PRECISION = 2; // 经纬度精度，用于合并近似位置

// 将函数声明为全局函数
window.initMap = function() {
    if (visitorMap) {
        visitorMap.remove();
    }
    
    // 初始化地图，将中心点设在中国
    visitorMap = L.map('visitor-map', {
        center: [35.8617, 104.1954],
        zoom: 4,
        minZoom: 3,
        maxZoom: 7,
        zoomControl: true,
        attributionControl: false
    });
    
    // 使用 OpenStreetMap 地图图层
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
    }).addTo(visitorMap);
    
    // 添加地名标签图层
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png', {
        attribution: '',
    }).addTo(visitorMap);
    
    // 初次加载数据
    refreshMap();
};

// 批量获取IP位置信息
async function batchGetLocations(ips) {
    const uniqueIps = [...new Set(ips)];
    const locations = new Map();
    
    // 并行请求所有IP的位置信息
    const promises = uniqueIps.map(async ip => {
        try {
            const response = await fetch(`${apiBaseUrl}/ip-location?ip=${ip}`);
            const data = await response.json();
            if (data.code === 200 && data.data) {
                locations.set(ip, data.data);
            }
        } catch (error) {
            console.error(`Error fetching location for IP ${ip}:`, error);
        }
    });
    
    await Promise.all(promises);
    return locations;
}

// 合并位置信息
function mergeLocations(locations) {
    const merged = new Map();
    
    locations.forEach((location, ip) => {
        if (!location || !location.latitude || !location.longitude) return;
        
        // 将经纬度按精度四舍五入
        const lat = Number(location.latitude).toFixed(LOCATION_PRECISION);
        const lng = Number(location.longitude).toFixed(LOCATION_PRECISION);
        const key = `${lat},${lng}`;
        
        if (!merged.has(key)) {
            merged.set(key, {
                location: location,
                ips: [ip],
                count: 1
            });
        } else {
            const data = merged.get(key);
            data.ips.push(ip);
            data.count++;
        }
    });
    
    return merged;
}

// 创建标记弹出内容
function createMarkerPopupContent(location) {
    return `
        <div class="popup-content">
            <h3>${location.city || location.province || '未知地区'}</h3>
            <p><strong>国家：</strong>${location.country || '未知'}</p>
            <p><strong>省份：</strong>${location.province || '未知'}</p>
            <p><strong>城市：</strong>${location.city || '未知'}</p>
            <p><strong>运营商：</strong>${location.isp || '未知'}</p>
            <p><strong>访问次数：</strong>${location.visitCount || 0}</p>
            <p><strong>独立IP数：</strong>${location.uniqueIps ? location.uniqueIps.size : 0}</p>
        </div>
    `;
}

// 将刷新地图函数声明为全局函数
window.refreshMap = async function(retryCount = 0) {
    try {
        // 显示加载状态
        document.getElementById('total-countries').textContent = '加载中...';
        document.getElementById('today-visitors').textContent = '加载中...';
        
        // 获取访问日志
        const response = await fetch(`${apiBaseUrl}/access-stats`, {
            timeout: 5000
        }).catch(async error => {
            if (retryCount < 1) {
                console.log('正在重试...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                return refreshMap(retryCount + 1);
            }
            throw error;
        });

        const responseData = await response.json();
        
        if (!responseData.data || !Array.isArray(responseData.data)) {
            throw new Error('Invalid data format received from server');
        }

        // 只处理最近的访问记录
        const data = responseData.data.slice(-MAX_MARKERS);
        
        // 清除现有标记
        markers.forEach(marker => marker.remove());
        markers = [];
        
        // 处理访问数据
        visitorsData.clear();
        const countries = new Set();
        
        // 批量获取所有IP的位置信息
        const locations = await batchGetLocations(data.map(log => log.ip));
        
        // 合并相近位置的标记
        const mergedLocations = mergeLocations(locations);
        
        // 处理位置数据
        mergedLocations.forEach((data, key) => {
            const { location, ips, count } = data;
            
            // 更新访问者数据
            ips.forEach(ip => {
                visitorsData.set(ip, {
                    location: location,
                    lastVisit: new Date()
                });
            });
            
            if (location.country) {
                countries.add(location.country);
            }
            
            // 创建标记
            const marker = L.marker([location.latitude, location.longitude])
                .bindPopup(createMarkerPopupContent(location));
            markers.push(marker);
            marker.addTo(visitorMap);
            
            // 只为访问量大的位置添加地名标签
            if (location.province && count > 1) {
                L.marker([location.latitude, location.longitude], {
                    icon: L.divIcon({
                        className: 'location-label',
                        html: `<div>${location.province} (${count})</div>`,
                        iconSize: [100, 20],
                        iconAnchor: [50, 10]
                    })
                }).addTo(visitorMap);
            }
        });
        
        // 更新统计信息
        document.getElementById('total-countries').textContent = countries.size || '-';
        document.getElementById('today-visitors').textContent = countTodayVisitors() || '-';
        
    } catch (error) {
        console.error('Error refreshing map:', error);
        document.getElementById('total-countries').textContent = '-';
        document.getElementById('today-visitors').textContent = '-';
        markers.forEach(marker => marker.remove());
        markers = [];
        showToast('服务器连接失败，请稍后重试', 'error');
    }
};

// 计算今日访问者数量
function countTodayVisitors() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let count = 0;
    visitorsData.forEach((data, ip) => {
        const visitDate = new Date(data.lastVisit);
        visitDate.setHours(0, 0, 0, 0);
        if (visitDate.getTime() === today.getTime()) {
            count++;
        }
    });
    return count;
}

async function getLocationForIp(ip) {
    try {
        const response = await fetch(`${apiBaseUrl}/ip-location?ip=${ip}`);
        const data = await response.json();
        
        if (data.code === 200 && data.data) {
            return data.data;  // 直接返回data对象，因为格式已经符合要求
        } else {
            console.log(`无法获取IP ${ip} 的位置信息:`, data.message);
            return null;
        }
    } catch (error) {
        console.error('Error fetching location for IP:', error);
        return null;
    }
}

// 在页面加载完成后初始化地图
document.addEventListener('DOMContentLoaded', function() {
    // 初始化地图
    initMap();
    
    // 监听主题变化，更新地图大小
    document.getElementById('themeToggle').addEventListener('click', function() {
        setTimeout(() => {
            visitorMap.invalidateSize();
        }, 100);
    });
});

function showError(message) {
    const errorOverlay = document.createElement('div');
    errorOverlay.className = 'map-error-overlay';
    errorOverlay.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-circle"></i>
            <p>加载地图数据时出错</p>
            <p class="error-message">${message}</p>
            <button onclick="refreshMap()" class="btn btn-primary">
                <i class="fas fa-sync-alt"></i> 重试
            </button>
        </div>
    `;
    document.getElementById('visitor-map').appendChild(errorOverlay);
}

function showLoadingOverlay() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'map-loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-content">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载地图数据...</p>
        </div>
    `;
    document.getElementById('visitor-map').appendChild(loadingOverlay);
} 