// 修复后的代码片段，替换原有的路线优化逻辑
// 在 NxDepartmentOrdersController.java 的 disGetCustomerDistanceMatrix 方法中

@RequestMapping(value = "/disGetCustomerDistanceMatrix", method = RequestMethod.POST)
@ResponseBody
public R disGetCustomerDistanceMatrix(Integer disId, String fromLat, String fromLng) {
    try {
        //今天订货
        Map<String, Object> map1 = new HashMap<>();
        map1.put("disId", disId);
        map1.put("status", 3);
        List<NxDepartmentEntity> departmentEntities = nxDepartmentOrdersService.queryOrderDepartmentList(map1);
        System.out.println("disGetCustomerDistanceMatrix 参数: disId=" + disId + ", fromLat=" + fromLat + ", fromLng=" + fromLng);
        
        if (departmentEntities.size() == 0) {
            return R.error(-1, "没有订单");
        }
        
        // 过滤有效坐标的客户
        List<NxDepartmentEntity> validCustomers = new ArrayList<>();
        StringBuilder stringBuilder = new StringBuilder();
        
        for (NxDepartmentEntity departmentEntity : departmentEntities) {
            String nxDepartmentLat = departmentEntity.getNxDepartmentLat();
            String nxDepartmentLng = departmentEntity.getNxDepartmentLng();

            // 检查坐标是否有效
            if (isValidCoordinate(nxDepartmentLat, nxDepartmentLng)) {
                validCustomers.add(departmentEntity);
                String item = nxDepartmentLat + "," + nxDepartmentLng;
                stringBuilder.append(item + ";");
            } else {
                System.out.println("跳过无效坐标客户: " + departmentEntity.getNxDepartmentName() +
                        " 坐标: (" + nxDepartmentLat + ", " + nxDepartmentLng + ")");
            }
        }
        
        System.out.println("有效坐标客户数量: " + validCustomers.size());
        
        if (validCustomers.isEmpty()) {
            System.out.println("没有有效的客户坐标，返回原始数据");
            return R.ok().put("data", departmentEntities);
        }
        
        // 移除最后一个分号
        String coordinates = stringBuilder.toString();
        if (coordinates.endsWith(";")) {
            coordinates = coordinates.substring(0, coordinates.length() - 1);
        }
        
        String from = fromLat + "," + fromLng;
        String urlString = "http://apis.map.qq.com/ws/distance/v1/optimal_order?mode=driving&from="
                + from + "&to=" + coordinates + "&key=" + KEY;
        
        System.out.println("腾讯地图API请求URL: " + urlString);
        
        // 发送请求，返回Json字符串
        String result = "";
        try {
            URL url = new URL(urlString);
            System.out.println(url);
            System.out.println("----");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
            String line;
            // 获取地址解析结果
            System.out.println(in);
            while ((line = in.readLine()) != null) {
                result += line + "\n";
            }
            in.close();
            
            System.out.println("腾讯地图API响应: " + result);
            
            // 转JSON格式
            JSONObject jsonObject = JSONObject.parseObject(result);
            if (jsonObject == null) {
                System.err.println("API响应解析失败，返回有效客户数据");
                return R.ok().put("data", validCustomers);
            }
            
            String optimal_order = jsonObject.getString("result");
            if (optimal_order == null) {
                System.err.println("API响应中没有result字段，返回有效客户数据");
                return R.ok().put("data", validCustomers);
            }
            
            System.out.println(optimal_order);
            System.out.println("optimal_orderoptimal_order");

            //获取排序
            JSONObject optimalOrderJson = JSONObject.parseObject(optimal_order);
            if (optimalOrderJson == null) {
                System.err.println("optimal_order解析失败，返回有效客户数据");
                return R.ok().put("data", validCustomers);
            }
            
            String order = optimalOrderJson.getString("optimal_order");
            if (order == null || order.isEmpty()) {
                System.err.println("optimal_order字段为空，返回有效客户数据");
                return R.ok().put("data", validCustomers);
            }
            
            System.out.println(order);
            String substring2 = order.substring(0);
            String substring3 = substring2.substring(1, substring2.length() - 1);
            String[] split = substring3.split(",");

            List<NxDepartmentEntity> treeSet = new ArrayList<>();

            String elements = optimalOrderJson.getString("elements");
            if (elements == null) {
                System.err.println("elements字段为空，返回有效客户数据");
                return R.ok().put("data", validCustomers);
            }
            
            List<NxDepartmentEntity> list = new ArrayList<>();
            try {
                list = JSONObject.parseArray(elements, NxDepartmentEntity.class);
            } catch (Exception e) {
                System.err.println("解析elements失败: " + e.getMessage());
                return R.ok().put("data", validCustomers);
            }

            System.out.println(list);
            System.out.println("list");

            // 使用validCustomers而不是departmentEntities
            System.out.println("开始处理排序结果，split长度: " + split.length);
            for (int i = 0; i < split.length; i++) {
                try {
                    Integer integer = Integer.valueOf(split[i]);
                    System.out.println("处理第" + (i+1) + "个索引: " + integer);
                    
                    // 确保索引在有效范围内
                    if (integer > 0 && integer <= validCustomers.size()) {
                        NxDepartmentEntity nxRestrauntEntity = validCustomers.get(integer - 1);
                        System.out.println("获取客户: " + nxRestrauntEntity.getNxDepartmentName());
                        
                        if (i < list.size()) {
                            NxDepartmentEntity listEnitity = list.get(i);
                            String distance = listEnitity.getDistance();
                            String duration = listEnitity.getDuration();
                            nxRestrauntEntity.setDistance(distance);
                            nxRestrauntEntity.setDuration(duration);
                            System.out.println("设置距离: " + distance + ", 时间: " + duration);
                        }
                        treeSet.add(nxRestrauntEntity);
                    } else {
                        System.err.println("索引超出范围: " + integer + ", 有效客户数量: " + validCustomers.size());
                    }
                } catch (NumberFormatException e) {
                    System.err.println("解析索引失败: " + split[i] + ", 错误: " + e.getMessage());
                } catch (Exception e) {
                    System.err.println("处理第" + (i+1) + "个索引时出错: " + e.getMessage());
                }
            }
            
            System.out.println("最终返回客户数量: " + treeSet.size());

            return R.ok().put("data", treeSet);
            
        } catch (Exception e) {
            System.err.println("调用腾讯地图API失败: " + e.getMessage());
            e.printStackTrace();
            // API调用失败时返回有效客户数据
            return R.ok().put("data", validCustomers);
        }
        
    } catch (Exception e) {
        System.err.println("disGetCustomerDistanceMatrix 异常: " + e.getMessage());
        e.printStackTrace();
        return R.error("获取客户数据失败: " + e.getMessage());
    }
}

private boolean isValidCoordinate(String lat, String lng) {
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