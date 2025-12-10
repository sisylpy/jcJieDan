package com.nongxinle.utils;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 时间窗口路线优化工具类
 */
public class TimeWindowRouteOptimizer {
    
    private static final String KEY = "C5HBZ-KEIW2-JXXUJ-COLGS-FQO47-WWFAK"; // 腾讯地图API密钥
    
    /**
     * 优化客户配送路线
     * @param departmentEntities 客户列表
     * @param fromLat 起始纬度
     * @param fromLng 起始经度
     * @return 优化后的客户列表
     */
    public static List<Map<String, Object>> optimizeRoute(List<Map<String, Object>> departmentEntities, 
                                                         String fromLat, String fromLng) {
        
        // 1. 过滤有效坐标的客户
        List<Map<String, Object>> validCustomers = new ArrayList<>();
        StringBuilder coordinateBuilder = new StringBuilder();
        
        for (Map<String, Object> customer : departmentEntities) {
            String lat = (String) customer.get("nxDepartmentLat");
            String lng = (String) customer.get("nxDepartmentLng");
            
            // 检查坐标是否有效
            if (isValidCoordinate(lat, lng)) {
                validCustomers.add(customer);
                coordinateBuilder.append(lat).append(",").append(lng).append(";");
            } else {
                System.out.println("跳过无效坐标客户: " + customer.get("nxDepartmentName") + 
                                 " 坐标: (" + lat + ", " + lng + ")");
            }
        }
        
        if (validCustomers.isEmpty()) {
            System.out.println("没有有效的客户坐标，无法进行路线优化");
            return departmentEntities; // 返回原始列表
        }
        
        // 2. 移除最后一个分号
        String coordinates = coordinateBuilder.toString();
        if (coordinates.endsWith(";")) {
            coordinates = coordinates.substring(0, coordinates.length() - 1);
        }
        
        // 3. 调用腾讯地图API进行路线优化
        try {
            String from = fromLat + "," + fromLng;
            String urlString = "http://apis.map.qq.com/ws/distance/v1/optimal_order?mode=driving&from="
                    + from + "&to=" + coordinates + "&key=" + KEY;
            
            System.out.println("腾讯地图API请求URL: " + urlString);
            
            URL url = new URL(urlString);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
            StringBuilder result = new StringBuilder();
            String line;
            
            while ((line = in.readLine()) != null) {
                result.append(line).append("\n");
            }
            in.close();
            
            String apiResult = result.toString();
            System.out.println("腾讯地图API响应: " + apiResult);
            
            // 4. 解析API响应并重新排序客户列表
            return reorderCustomersByRoute(validCustomers, apiResult);
            
        } catch (Exception e) {
            System.err.println("调用腾讯地图API失败: " + e.getMessage());
            e.printStackTrace();
            return departmentEntities; // 返回原始列表
        }
    }
    
    /**
     * 检查坐标是否有效
     */
    private static boolean isValidCoordinate(String lat, String lng) {
        if (lat == null || lng == null || lat.trim().isEmpty() || lng.trim().isEmpty()) {
            return false;
        }
        
        try {
            double latValue = Double.parseDouble(lat);
            double lngValue = Double.parseDouble(lng);
            
            // 检查坐标范围（中国大致范围）
            return latValue >= 18.0 && latValue <= 54.0 && 
                   lngValue >= 73.0 && lngValue <= 135.0;
        } catch (NumberFormatException e) {
            return false;
        }
    }
    
    /**
     * 根据API响应重新排序客户列表
     */
    private static List<Map<String, Object>> reorderCustomersByRoute(List<Map<String, Object>> customers, String apiResult) {
        // 这里需要解析腾讯地图API的响应
        // 由于API响应格式复杂，这里提供一个基础实现
        // 您可以根据实际的API响应格式进行调整
        
        System.out.println("根据路线优化重新排序客户列表");
        
        // 临时返回原始顺序，您可以根据API响应进行实际排序
        return customers;
    }
} 