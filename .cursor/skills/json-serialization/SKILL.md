---
name: json-serialization
description: |
  当需要处理 JSON 序列化、反序列化、数据类型转换、日期处理、大数字精度保护时自动使用此 Skill。

  触发场景：
  - JSON 序列化/反序列化操作
  - 大数字精度问题（Long/BigInteger/BigDecimal）
  - 日期时间格式化与转换
  - 复杂泛型类型转换
  - JSON 格式验证
  - 数据类型映射与转换

  触发词：JSON、序列化、反序列化、JsonUtils、日期格式、精度、BigDecimal、Long、类型转换、JSON验证
---

# JSON 序列化与数据转换指南

> 模块位置：`ruoyi-common/ruoyi-common-json`

## 快速索引

| 功能 | 方法/类 | 说明 |
|------|---------|------|
| 对象转 JSON | `JsonUtils.toJsonString()` | null 返回 null |
| JSON 转对象 | `JsonUtils.parseObject()` | 空返回 null |
| JSON 转 List | `JsonUtils.parseArray()` | 空返回空 ArrayList |
| JSON 转 Dict | `JsonUtils.parseMap()` | 非 JSON 返回 null |
| JSON 数组转 Dict 列表 | `JsonUtils.parseArrayMap()` | 空返回 null |
| 复杂类型转换 | `JsonUtils.parseObject(text, TypeReference)` | 支持泛型 |
| JSON 验证 | `JsonUtils.isJson()` / `isJsonObject()` / `isJsonArray()` | |
| 字段校验注解 | `@JsonPattern` | 支持 OBJECT/ARRAY/ANY |

---

## 核心工具类 JsonUtils

```java
import org.dromara.common.json.utils.JsonUtils;
```

### 序列化

```java
// 对象转 JSON 字符串（null 返回 null）
String json = JsonUtils.toJsonString(user);
```

### 反序列化

```java
// JSON 转简单对象（空返回 null）
User user = JsonUtils.parseObject(json, User.class);

// 字节数组转对象
User user = JsonUtils.parseObject(bytes, User.class);

// JSON 数组转 List（空返回空 ArrayList）
List<User> users = JsonUtils.parseArray(json, User.class);

// JSON 转 Dict（非 JSON 返回 null）
Dict dict = JsonUtils.parseMap(json);
String name = dict.getStr("name");
int age = dict.getInt("age");

// JSON 数组转 Dict 列表
List<Dict> dicts = JsonUtils.parseArrayMap(json);
```

### 复杂泛型类型

```java
import com.fasterxml.jackson.core.type.TypeReference;

// Map 类型
Map<String, User> map = JsonUtils.parseObject(json,
    new TypeReference<Map<String, User>>(){});

// 嵌套泛型
Map<String, List<User>> data = JsonUtils.parseObject(json,
    new TypeReference<Map<String, List<User>>>(){});

// 性能优化：缓存 TypeReference
private static final TypeReference<List<User>> USER_LIST_TYPE =
    new TypeReference<List<User>>(){};
List<User> users = JsonUtils.parseObject(json, USER_LIST_TYPE);
```

### JSON 验证

```java
// 判断是否为合法 JSON（对象或数组）
JsonUtils.isJson("{\"name\":\"张三\"}");   // true
JsonUtils.isJson("[1,2,3]");              // true
JsonUtils.isJson("not json");             // false

// 判断是否为 JSON 对象
JsonUtils.isJsonObject("{\"a\":1}");      // true
JsonUtils.isJsonObject("[1,2,3]");        // false

// 判断是否为 JSON 数组
JsonUtils.isJsonArray("[1,2,3]");         // true
JsonUtils.isJsonArray("{\"a\":1}");       // false
```

### 获取 ObjectMapper

```java
ObjectMapper mapper = JsonUtils.getObjectMapper();
JsonNode node = mapper.readTree(json);
```

---

## @JsonPattern 校验注解

用于 BO 类字段的 JSON 格式校验。

```java
import org.dromara.common.json.validate.JsonPattern;
import org.dromara.common.json.validate.JsonType;

public class ConfigBo {

    // 任意 JSON 格式（对象或数组）
    @JsonPattern
    private String configValue;

    // 必须是 JSON 对象
    @JsonPattern(type = JsonType.OBJECT, message = "配置必须是 JSON 对象格式")
    private String objectConfig;

    // 必须是 JSON 数组
    @JsonPattern(type = JsonType.ARRAY, message = "列表必须是 JSON 数组格式")
    private String arrayConfig;
}
```

**JsonType 枚举**：

| 值 | 说明 | 示例 |
|----|------|------|
| `ANY` | 对象或数组都可以（默认） | `{}` 或 `[]` |
| `OBJECT` | 必须是 JSON 对象 | `{"a":1}` |
| `ARRAY` | 必须是 JSON 数组 | `[1,2,3]` |

---

## Jackson 自动配置

配置类：`org.dromara.common.json.config.JacksonConfig`

### 大数字处理（BigNumberSerializer）

**问题**：JavaScript 最大安全整数为 `2^53 - 1`（9007199254740991），超出范围会丢失精度。

**解决方案**：自动将超出 JS 安全范围的数字序列化为字符串。

```java
// 安全范围内 → 保持数字
Long id = 123456L;
// 序列化结果：{"id": 123456}

// 超出安全范围 → 转为字符串
Long id = 9007199254740992L;
// 序列化结果：{"id": "9007199254740992"}

// BigDecimal 始终转为字符串
BigDecimal amount = new BigDecimal("123.45");
// 序列化结果：{"amount": "123.45"}
```

**处理规则**：

| 类型 | 范围内 | 超出范围 |
|------|--------|----------|
| `Long` | 数字 | 字符串 |
| `long` | 数字 | 字符串 |
| `BigInteger` | 数字 | 字符串 |
| `BigDecimal` | 字符串 | 字符串 |

> **安全范围**：`-9007199254740991` ~ `9007199254740991`

### LocalDateTime 格式化

统一格式：`yyyy-MM-dd HH:mm:ss`

```java
LocalDateTime now = LocalDateTime.now();
String json = JsonUtils.toJsonString(now);
// 输出："2026-02-06 14:30:45"

LocalDateTime parsed = JsonUtils.parseObject("\"2026-02-06 14:30:45\"", LocalDateTime.class);
```

### Date 自动解析（CustomDateDeserializer）

使用 Hutool 的 `DateUtil.parse()` 自动识别多种日期格式：

```java
// 支持的格式（自动识别）
Date d1 = JsonUtils.parseObject("\"2026-02-06 14:30:45\"", Date.class);
Date d2 = JsonUtils.parseObject("\"2026-02-06\"", Date.class);
Date d3 = JsonUtils.parseObject("\"2026/02/06 14:30:45\"", Date.class);
Date d4 = JsonUtils.parseObject("\"20260206143045\"", Date.class);
```

---

## 使用示例

### Service 中的 JSON 操作

```java
@Service
@RequiredArgsConstructor
public class ConfigServiceImpl implements IConfigService {

    private final ConfigMapper baseMapper;

    /**
     * 获取配置为对象
     */
    public <T> T getConfig(String configKey, Class<T> clazz) {
        SysConfig config = baseMapper.selectOne(
            Wrappers.<SysConfig>lambdaQuery()
                .eq(SysConfig::getConfigKey, configKey));
        if (config == null) {
            return null;
        }
        return JsonUtils.parseObject(config.getConfigValue(), clazz);
    }

    /**
     * 保存配置
     */
    public void saveConfig(String configKey, Object value) {
        SysConfig config = new SysConfig();
        config.setConfigKey(configKey);
        config.setConfigValue(JsonUtils.toJsonString(value));
        baseMapper.insert(config);
    }

    /**
     * 导入 JSON 数据
     */
    public void importData(String jsonData) {
        if (!JsonUtils.isJsonArray(jsonData)) {
            throw new ServiceException("数据格式不正确，应为 JSON 数组");
        }
        List<DataBo> list = JsonUtils.parseArray(jsonData, DataBo.class);
        // 处理数据...
    }
}
```

### BO 中使用 JSON 校验

```java
@Data
@AutoMapper(target = SysConfig.class, reverseConvertGenerate = false)
public class SysConfigBo extends BaseEntity {

    @NotNull(message = "ID不能为空", groups = EditGroup.class)
    private Long id;

    @NotBlank(message = "配置键不能为空")
    private String configKey;

    @NotBlank(message = "配置值不能为空")
    @JsonPattern(type = JsonType.OBJECT, message = "配置值必须是有效的 JSON 对象")
    private String configValue;
}
```

---

## 常见问题

### 1. 什么时候用 parseObject vs parseArray？

```java
// JSON 对象 → parseObject
String json = "{\"name\":\"张三\"}";
User user = JsonUtils.parseObject(json, User.class);

// JSON 数组 → parseArray
String json = "[{\"name\":\"张三\"},{\"name\":\"李四\"}]";
List<User> users = JsonUtils.parseArray(json, User.class);
```

### 2. 泛型类型怎么处理？

```java
// ❌ 错误：泛型擦除，无法正确转换
Map<String, User> map = JsonUtils.parseObject(json, Map.class);

// ✅ 正确：使用 TypeReference
Map<String, User> map = JsonUtils.parseObject(json,
    new TypeReference<Map<String, User>>(){});
```

### 3. null 和空字符串的处理？

```java
// toJsonString
JsonUtils.toJsonString(null);     // 返回 null
JsonUtils.toJsonString(user);     // 返回 JSON 字符串

// parseObject
JsonUtils.parseObject(null, User.class);   // 返回 null
JsonUtils.parseObject("", User.class);     // 返回 null

// parseArray
JsonUtils.parseArray(null, User.class);    // 返回空 ArrayList
JsonUtils.parseArray("", User.class);      // 返回空 ArrayList
```

### 4. 如何在解析前验证 JSON？

```java
public void processData(String data) {
    // 先验证再解析
    if (!JsonUtils.isJsonArray(data)) {
        throw new ServiceException("数据格式不正确");
    }
    List<User> users = JsonUtils.parseArray(data, User.class);
}
```

---

## 禁止事项

```java
// ❌ 禁止：频繁创建 ObjectMapper
ObjectMapper mapper = new ObjectMapper();
String json = mapper.writeValueAsString(user);

// ✅ 正确：使用 JsonUtils
String json = JsonUtils.toJsonString(user);

// ❌ 禁止：不验证直接解析（可能报错）
List<User> users = JsonUtils.parseArray(data, User.class);

// ✅ 正确：先验证再解析
if (JsonUtils.isJsonArray(data)) {
    List<User> users = JsonUtils.parseArray(data, User.class);
}

// ❌ 禁止：泛型不使用 TypeReference
Map map = JsonUtils.parseObject(json, Map.class);

// ✅ 正确：使用 TypeReference
Map<String, User> map = JsonUtils.parseObject(json,
    new TypeReference<Map<String, User>>(){});
```
