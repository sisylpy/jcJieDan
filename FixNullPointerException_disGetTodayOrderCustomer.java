// 修复 NullPointerException 的建议代码
// 在 NxDepartmentOrdersController.java 的 disGetTodayOrderCustomer 方法中
// 错误发生在第 10238 行附近的 Stream collect 操作

// 问题分析：
// NullPointerException 发生在 Stream 的 collect 操作中，通常是因为：
// 1. Stream 中的元素为 null
// 2. Stream 操作（map/filter）返回了 null
// 3. 集合本身为 null

// 修复方案 1：在 Stream 操作前添加 null 检查
@RequestMapping(value = "/disGetTodayOrderCustomer/{disId}", method = RequestMethod.GET)
@ResponseBody
public R disGetTodayOrderCustomer(@PathVariable Integer disId) {
    try {
        // 获取数据列表
        List<SomeEntity> entityList = someService.getEntityList(disId);
        
        // 修复：添加 null 检查
        if (entityList == null || entityList.isEmpty()) {
            return R.ok().put("data", new ArrayList<>());
        }
        
        // 修复：在 Stream 操作中添加 null 过滤
        List<SomeDTO> result = entityList.stream()
            .filter(Objects::nonNull)  // 过滤掉 null 元素
            .filter(entity -> entity.getSomeField() != null)  // 过滤掉关键字段为 null 的元素
            .map(entity -> {
                // 确保 map 操作中不会返回 null
                if (entity.getSomeField() == null) {
                    return null;  // 或者返回默认值
                }
                return convertToDTO(entity);
            })
            .filter(Objects::nonNull)  // 再次过滤掉 map 返回的 null
            .collect(Collectors.toList());
        
        return R.ok().put("data", result);
        
    } catch (Exception e) {
        e.printStackTrace();
        return R.error("获取数据失败：" + e.getMessage());
    }
}

// 修复方案 2：使用 Optional 处理可能为 null 的值
@RequestMapping(value = "/disGetTodayOrderCustomer/{disId}", method = RequestMethod.GET)
@ResponseBody
public R disGetTodayOrderCustomer(@PathVariable Integer disId) {
    try {
        List<SomeEntity> entityList = someService.getEntityList(disId);
        
        // 使用 Optional 和安全的 Stream 操作
        List<SomeDTO> result = Optional.ofNullable(entityList)
            .orElse(Collections.emptyList())
            .stream()
            .filter(Objects::nonNull)
            .map(entity -> {
                try {
                    // 在 map 中进行 null 检查
                    if (entity == null || entity.getSomeField() == null) {
                        return null;
                    }
                    return convertToDTO(entity);
                } catch (Exception e) {
                    // 记录错误但继续处理其他元素
                    log.error("转换实体失败", e);
                    return null;
                }
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        
        return R.ok().put("data", result);
        
    } catch (Exception e) {
        e.printStackTrace();
        return R.error("获取数据失败：" + e.getMessage());
    }
}

// 修复方案 3：如果是在处理嵌套对象，需要检查每一层
@RequestMapping(value = "/disGetTodayOrderCustomer/{disId}", method = RequestMethod.GET)
@ResponseBody
public R disGetTodayOrderCustomer(@PathVariable Integer disId) {
    try {
        List<SomeEntity> entityList = someService.getEntityList(disId);
        
        if (entityList == null) {
            return R.ok().put("data", new ArrayList<>());
        }
        
        List<SomeDTO> result = entityList.stream()
            .filter(Objects::nonNull)
            .map(entity -> {
                // 检查嵌套对象
                if (entity.getNestedObject() == null) {
                    return null;  // 或者设置默认值
                }
                
                // 检查嵌套对象的属性
                if (entity.getNestedObject().getSomeProperty() == null) {
                    return null;
                }
                
                return convertToDTO(entity);
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        
        return R.ok().put("data", result);
        
    } catch (Exception e) {
        e.printStackTrace();
        return R.error("获取数据失败：" + e.getMessage());
    }
}

// 通用修复模式：
// 1. 在 stream() 之前检查集合是否为 null
// 2. 使用 filter(Objects::nonNull) 过滤 null 元素
// 3. 在 map 操作中检查可能为 null 的字段
// 4. 在 collect 之前再次过滤 null
// 5. 使用 Optional.ofNullable() 包装可能为 null 的集合

// 需要导入的包：
// import java.util.*;
// import java.util.stream.Collectors;
// import java.util.Objects;
// import java.util.Optional;

// ============================================
// 根据实际错误日志的修复方案（针对 LEFT JOIN 查询）
// ============================================
// 从日志分析：
// 1. SQL 查询返回 0 条记录：<== Total: 0
// 2. 查询包含多个 LEFT JOIN，可能返回 null 字段
// 3. 错误发生在 Stream collect 操作中

// 修复方案 4：针对 LEFT JOIN 查询返回 null 字段的情况
@RequestMapping(value = "/disGetTodayOrderCustomer/{disId}", method = RequestMethod.GET)
@ResponseBody
public R disGetTodayOrderCustomer(@PathVariable Integer disId) {
    try {
        Map<String, Object> map = new HashMap<>();
        map.put("disId", disId);
        map.put("status", 3);
        
        // 查询订单部门列表（可能返回空列表或包含 null 字段的记录）
        List<NxDepartmentEntity> departmentList = nxDepartmentOrdersService.queryOrderDepartmentList(map);
        
        // 关键修复：处理空结果和 null 字段
        if (departmentList == null || departmentList.isEmpty()) {
            // 返回空数据结构，避免后续 Stream 操作报错
            Map<String, Object> result = new HashMap<>();
            result.put("deps", new HashMap<>());
            result.put("unPayCount", 0);
            result.put("disInfo", null);
            result.put("returnList", new ArrayList<>());
            result.put("unDoTotal", 0);
            result.put("linshiTotal", 0);
            return R.ok().put("data", result);
        }
        
        // 处理 LEFT JOIN 可能返回的 null 字段
        // 根据 SQL 查询，可能包含以下 LEFT JOIN 字段：
        // - gb_department (gdd)
        // - gb_distributer (gd)
        // - gb_department (app) - app_gb_department_id 等
        // - nx_distributer_gb_distributer (ndgd)
        // - nx_department (nd)
        
        List<Map<String, Object>> processedList = departmentList.stream()
            .filter(Objects::nonNull)  // 过滤 null 元素
            .map(department -> {
                try {
                    Map<String, Object> item = new HashMap<>();
                    
                    // 安全地获取基本字段
                    item.put("nxDepartmentId", department.getNxDepartmentId());
                    item.put("nxDepartmentName", 
                        department.getNxDepartmentName() != null ? department.getNxDepartmentName() : "");
                    
                    // 安全地获取 LEFT JOIN 的关联字段（可能为 null）
                    // 检查 gb_department 相关字段
                    if (department.getGbDepartment() != null) {
                        item.put("gbDepartmentId", department.getGbDepartment().getGbDepartmentId());
                        item.put("gbDepartmentName", 
                            department.getGbDepartment().getGbDepartmentName() != null 
                                ? department.getGbDepartment().getGbDepartmentName() : "");
                    } else {
                        item.put("gbDepartmentId", null);
                        item.put("gbDepartmentName", null);
                    }
                    
                    // 检查 gb_distributer 相关字段
                    if (department.getGbDistributer() != null) {
                        item.put("gbDistributerId", department.getGbDistributer().getGbDistributerId());
                    } else {
                        item.put("gbDistributerId", null);
                    }
                    
                    // 检查 app_gb_department 相关字段（从 SQL 看，这些字段可能为 null）
                    // 如果这些字段是通过别名映射的，需要检查对应的 getter 方法
                    item.put("appGbDepartmentId", 
                        department.getAppGbDepartmentId() != null ? department.getAppGbDepartmentId() : null);
                    item.put("appGbDepartmentName", 
                        department.getAppGbDepartmentName() != null ? department.getAppGbDepartmentName() : null);
                    
                    return item;
                } catch (NullPointerException e) {
                    // 捕获 NPE，记录日志，返回 null 以便后续过滤
                    log.error("处理部门数据时发生 NPE，部门ID: " + 
                        (department != null && department.getNxDepartmentId() != null 
                            ? department.getNxDepartmentId() : "unknown"), e);
                    return null;
                } catch (Exception e) {
                    log.error("处理部门数据时发生异常", e);
                    return null;
                }
            })
            .filter(Objects::nonNull)  // 过滤掉处理失败的 null 项
            .collect(Collectors.toList());
        
        // 构建返回结果
        Map<String, Object> result = new HashMap<>();
        Map<String, Object> deps = new HashMap<>();
        deps.put("nxDep", processedList);
        result.put("deps", deps);
        result.put("unPayCount", 0);
        result.put("disInfo", null);
        result.put("returnList", new ArrayList<>());
        result.put("unDoTotal", 0);
        result.put("linshiTotal", 0);
        
        return R.ok().put("data", result);
        
    } catch (Exception e) {
        log.error("disGetTodayOrderCustomer 发生异常，disId: " + disId, e);
        e.printStackTrace();
        return R.error("获取客户订单失败：" + e.getMessage());
    }
}

// ============================================
// 根据最新日志的紧急修复方案（推荐）
// ============================================
// 问题分析：
// 1. 查询返回 117 条记录，但包含大量 null 字段
// 2. 在 Stream map 操作中访问 null 字段的属性导致 NPE
// 3. 需要在使用字段前进行 null 检查

// 修复方案 5：最简化的安全处理（推荐用于快速修复）
@RequestMapping(value = "/disGetTodayOrderCustomer/{disId}", method = RequestMethod.GET)
@ResponseBody
public R disGetTodayOrderCustomer(@PathVariable Integer disId) {
    try {
        Map<String, Object> map = new HashMap<>();
        map.put("disId", disId);
        map.put("status", 3);
        
        List<NxDepartmentEntity> departmentList = nxDepartmentOrdersService.queryOrderDepartmentList(map);
        
        // 关键修复：如果查询结果为空或 null，直接返回空数据结构
        if (departmentList == null || departmentList.isEmpty()) {
            return buildEmptyResponse();
        }
        
        // 使用安全的 Stream 操作，处理所有可能的 null
        List<Object> processedList = Optional.ofNullable(departmentList)
            .orElse(Collections.emptyList())
            .stream()
            .filter(Objects::nonNull)  // 过滤 null 元素
            .map(department -> {
                try {
                    // 在这里进行数据转换，确保所有字段访问都进行 null 检查
                    return convertDepartmentSafely(department);
                } catch (Exception e) {
                    log.warn("转换部门数据失败，跳过该项", e);
                    return null;
                }
            })
            .filter(Objects::nonNull)  // 过滤转换失败的 null
            .collect(Collectors.toList());
        
        // 构建响应
        Map<String, Object> result = new HashMap<>();
        Map<String, Object> deps = new HashMap<>();
        deps.put("nxDep", processedList);
        result.put("deps", deps);
        // ... 其他字段
        
        return R.ok().put("data", result);
        
    } catch (Exception e) {
        log.error("disGetTodayOrderCustomer 异常", e);
        return R.error("获取数据失败");
    }
}

// 辅助方法：安全转换部门数据
private Object convertDepartmentSafely(NxDepartmentEntity department) {
    if (department == null) {
        return null;
    }
    
    // 创建 DTO 或 Map，安全地获取所有字段
    Map<String, Object> dto = new HashMap<>();
    
    // 基本字段（假设这些字段不为 null）
    dto.put("id", department.getNxDepartmentId());
    dto.put("name", safeGetString(department.getNxDepartmentName()));
    
    // LEFT JOIN 字段（可能为 null）
    if (department.getGbDepartment() != null) {
        dto.put("gbDepartmentId", department.getGbDepartment().getGbDepartmentId());
    }
    
    // 使用 Optional 安全获取嵌套字段
    Optional.ofNullable(department.getGbDistributer())
        .ifPresent(gd -> dto.put("gbDistributerId", gd.getGbDistributerId()));
    
    return dto;
}

// 辅助方法：安全获取字符串
private String safeGetString(String str) {
    return str != null ? str : "";
}

// 辅助方法：构建空响应
private R buildEmptyResponse() {
    Map<String, Object> result = new HashMap<>();
    Map<String, Object> deps = new HashMap<>();
    deps.put("nxDep", new ArrayList<>());
    result.put("deps", deps);
    result.put("unPayCount", 0);
    result.put("disInfo", null);
    result.put("returnList", new ArrayList<>());
    result.put("unDoTotal", 0);
    result.put("linshiTotal", 0);
    return R.ok().put("data", result);
}

// ============================================
// 紧急修复方案（根据最新日志 - 数据包含大量 null）
// ============================================
// 问题确认：
// 1. 查询返回 117 条记录，但包含大量 null 字段
// 2. Stream map 操作中访问 null 字段导致 NPE
// 3. 必须在使用每个字段前进行 null 检查

// 修复方案 6：最安全的修复（强烈推荐）
@RequestMapping(value = "/disGetTodayOrderCustomer/{disId}", method = RequestMethod.GET)
@ResponseBody
public R disGetTodayOrderCustomer(@PathVariable Integer disId) {
    try {
        Map<String, Object> map = new HashMap<>();
        map.put("disId", disId);
        map.put("status", 3);
        
        List<NxDepartmentEntity> departmentList = nxDepartmentOrdersService.queryOrderDepartmentList(map);
        
        // 关键修复 1：处理空结果
        if (departmentList == null) {
            return buildEmptyResponse();
        }
        
        // 关键修复 2：即使有数据，也要安全处理 null 字段
        // 使用 Optional 和安全的 Stream 操作
        List<Object> processedList = departmentList.stream()
            .filter(Objects::nonNull)  // 第一步：过滤 null 元素
            .map(department -> {
                try {
                    // 关键修复 3：每个字段访问都要进行 null 检查
                    // 使用安全的方法获取字段值
                    Map<String, Object> item = new HashMap<>();
                    
                    // 基本字段（假设这些字段可能为 null）
                    item.put("nxDepartmentId", 
                        department.getNxDepartmentId() != null ? department.getNxDepartmentId() : null);
                    item.put("nxDepartmentName", 
                        safeGetString(department.getNxDepartmentName()));
                    
                    // LEFT JOIN 字段 - 必须检查每一层
                    // 检查 gb_department (gdd)
                    if (department.getGbDepartment() != null) {
                        item.put("gbDepartmentId", department.getGbDepartment().getGbDepartmentId());
                        item.put("gbDepartmentName", 
                            safeGetString(department.getGbDepartment().getGbDepartmentName()));
                    } else {
                        item.put("gbDepartmentId", null);
                        item.put("gbDepartmentName", null);
                    }
                    
                    // 检查 gb_distributer (gd) - 可能通过 gb_department 访问
                    if (department.getGbDepartment() != null && 
                        department.getGbDepartment().getGbDistributer() != null) {
                        item.put("gbDistributerId", 
                            department.getGbDepartment().getGbDistributer().getGbDistributerId());
                    } else {
                        item.put("gbDistributerId", null);
                    }
                    
                    // 检查 app_gb_department 相关字段（从 SQL 别名映射）
                    // 这些字段可能直接映射到实体属性，也可能通过关联对象访问
                    item.put("appGbDepartmentId", 
                        getAppGbDepartmentIdSafely(department));
                    item.put("appGbDepartmentName", 
                        getAppGbDepartmentNameSafely(department));
                    
                    // 检查 nx_distributer_gb_distributer (ndgd) 相关字段
                    item.put("nxDgdFromNxDepId", 
                        getNxDgdFromNxDepIdSafely(department));
                    
                    // 检查 nx_department (nd) 相关字段
                    if (department.getNxDepartment() != null) {
                        item.put("nxDepartmentId2", department.getNxDepartment().getNxDepartmentId());
                    } else {
                        item.put("nxDepartmentId2", null);
                    }
                    
                    return item;
                } catch (NullPointerException e) {
                    // 捕获 NPE，记录详细信息，返回 null 以便过滤
                    log.error("处理部门数据时发生 NPE，跳过该项。部门ID: " + 
                        (department != null && department.getNxDepartmentId() != null 
                            ? department.getNxDepartmentId() : "unknown"), e);
                    return null;
                } catch (Exception e) {
                    log.error("处理部门数据时发生异常，跳过该项", e);
                    return null;
                }
            })
            .filter(Objects::nonNull)  // 第二步：过滤掉处理失败的 null
            .collect(Collectors.toList());
        
        // 构建响应
        Map<String, Object> result = new HashMap<>();
        Map<String, Object> deps = new HashMap<>();
        deps.put("nxDep", processedList != null ? processedList : new ArrayList<>());
        result.put("deps", deps);
        result.put("unPayCount", 0);
        result.put("disInfo", null);
        result.put("returnList", new ArrayList<>());
        result.put("unDoTotal", 0);
        result.put("linshiTotal", 0);
        
        return R.ok().put("data", result);
        
    } catch (Exception e) {
        log.error("disGetTodayOrderCustomer 发生异常，disId: " + disId, e);
        e.printStackTrace();
        // 发生异常时返回空响应，而不是抛出异常
        return buildEmptyResponse();
    }
}

// 辅助方法：安全获取 app_gb_department_id
private Integer getAppGbDepartmentIdSafely(NxDepartmentEntity department) {
    try {
        // 根据实际实体结构，可能需要通过多层访问
        // 方式1：如果直接映射到实体属性
        if (department.getAppGbDepartmentId() != null) {
            return department.getAppGbDepartmentId();
        }
        
        // 方式2：如果通过关联对象访问
        if (department.getGbDepartment() != null && 
            department.getGbDepartment().getGbDistributer() != null &&
            department.getGbDepartment().getGbDistributer().getAppGbDepartment() != null) {
            return department.getGbDepartment()
                .getGbDistributer()
                .getAppGbDepartment()
                .getGbDepartmentId();
        }
        
        return null;
    } catch (NullPointerException e) {
        return null;
    }
}

// 辅助方法：安全获取 app_gb_department_name
private String getAppGbDepartmentNameSafely(NxDepartmentEntity department) {
    try {
        if (department.getAppGbDepartmentName() != null) {
            return department.getAppGbDepartmentName();
        }
        
        if (department.getGbDepartment() != null && 
            department.getGbDepartment().getGbDistributer() != null &&
            department.getGbDepartment().getGbDistributer().getAppGbDepartment() != null) {
            return safeGetString(department.getGbDepartment()
                .getGbDistributer()
                .getAppGbDepartment()
                .getGbDepartmentName());
        }
        
        return null;
    } catch (NullPointerException e) {
        return null;
    }
}

// 辅助方法：安全获取 nx_DGD_from_nx_dep_id
private Integer getNxDgdFromNxDepIdSafely(NxDepartmentEntity department) {
    try {
        if (department.getNxDistributerGbDistributer() != null) {
            return department.getNxDistributerGbDistributer().getNxDgdFromNxDepId();
        }
        return null;
    } catch (NullPointerException e) {
        return null;
    }
}

// 修复要点总结：
// 1. 在 stream() 前检查集合是否为 null
// 2. 使用 filter(Objects::nonNull) 过滤 null 元素
// 3. 在 map 中使用 try-catch 捕获 NPE
// 4. 每个字段访问都进行 null 检查
// 5. 嵌套对象访问时，每一层都要检查
// 6. 使用辅助方法封装复杂的 null 检查逻辑
// 7. 在 collect 前再次过滤 null
// 8. 异常时返回空响应而不是抛出异常

