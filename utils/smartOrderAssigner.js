/**
 * 智能多司机分配函数（不负责路线顺序，只解决"谁送谁"）
 * @param {Array} customers 客户数组
 * @param {Number} driverCount 司机数量
 * @param {Number} timeWindowTolerance 超窗宽容度（秒）
 * @returns {Array} [{driverId, customers: [...]}, ...]
 */
function assignOrdersToDrivers(customers, driverCount = 2, timeWindowTolerance = 900) {
    // 1. 按优先级/窗口紧迫度排序
    const sorted = [...customers].sort((a, b) => {
        if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
        const aw = (a.latestTime - a.earliestTime);
        const bw = (b.latestTime - b.earliestTime);
        if (aw !== bw) return aw - bw;
        return (a.earliestTime || 0) - (b.earliestTime || 0);
    });

    // 2. 初始化司机
    const drivers = Array.from({length: driverCount}, (_, i) => ({
        driverId: i + 1,
        customers: [],
        totalDistance: 0,
        totalDuration: 0,
    }));

    // 3. 轮询分配
    for (const cust of sorted) {
        // 分配给当前客户"预计送达时间最早的司机" 或 "客户数最少/总距离最短的司机"
        let bestDriver = drivers[0];
        let minLoad = bestDriver.customers.length;
        let minDistance = bestDriver.totalDistance;
        for (const d of drivers) {
            if (d.customers.length < minLoad ||
                (d.customers.length === minLoad && d.totalDistance < minDistance)) {
                bestDriver = d;
                minLoad = d.customers.length;
                minDistance = d.totalDistance;
            }
        }
        // 累加距离/耗时
        bestDriver.customers.push(cust);
        bestDriver.totalDistance += Number(cust.distance) || 0;
        bestDriver.totalDuration += Number(cust.duration) || 0;
    }

    // 4. 返回分组结果
    return drivers.map(d => ({
        driverId: d.driverId,
        customers: d.customers
    }));
}

export { assignOrdersToDrivers }; 