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

  触发词：JSON、序列化、反序列化、JsonUtils、日期格式、精度、BigDecimal、Long、类型转换、JSON验证、ObjectMapper、Jackson
---

# JSON 序列化与数据转换指南

> 基于 Jackson（Spring Boot 默认 JSON 处理库）

## 快速索引

| 功能 | 方法/类 | 说明 |
|------|---------|------|
| 对象转 JSON | `JsonUtils.toJsonString()` | null 返回 null |
| JSON 转对象 | `JsonUtils.parseObject()` | 空返回 null |
| JSON 转 List | `JsonUtils.parseArray()` | 空返回空 ArrayList |
| JSON 转 Map | `JsonUtils.parseMap()` | 非 JSON 返回 null |
| 复杂类型转换 | `JsonUtils.parseObject(text, TypeReference)` | 支持泛型 |
| JSON 验证 | `JsonUtils.isJson()` / `isJsonObject()` / `isJsonArray()` | |

---

## 核心工具类 JsonUtils（通用实现）

> 推荐封装一个项目级的 `JsonUtils`，内部使用 Jackson `ObjectMapper` 单例。

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

public class JsonUtils {

    private static final ObjectMapper MAPPER = SpringUtil.getBean(ObjectMapper.class);
    // 或者：private static final ObjectMapper MAPPER = new ObjectMapper();

    public static String toJsonString(Object obj) {
        if (obj == null) return null;
        try {
            return MAPPER.writeValueAsString(obj);
        } catch (Exception e) {
            throw new RuntimeException("JSON序列化失败", e);
        }
    }

    public static <T> T parseObject(String json, Class<T> clazz) {
        if (json == null || json.isBlank()) return null;
        try {
            return MAPPER.readValue(json, clazz);
        } catch (Exception e) {
            throw new RuntimeException("JSON反序列化失败", e);
        }
    }

    public static <T> T parseObject(String json, TypeReference<T> typeRef) {
        if (json == null || json.isBlank()) return null;
        try {
            return MAPPER.readValue(json, typeRef);
        } catch (Exception e) {
            throw new RuntimeException("JSON反序列化失败", e);
        }
    }

    public static <T> List<T> parseArray(String json, Class<T> clazz) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(json,
                MAPPER.getTypeFactory().constructCollectionType(ArrayList.class, clazz));
        } catch (Exception e) {
            throw new RuntimeException("JSON反序列化失败", e);
        }
    }

    public static boolean isJson(String str) {
        return isJsonObject(str) || isJsonArray(str);
    }

    public static boolean isJsonObject(String str) {
        if (str == null || str.isBlank()) return false;
        return str.trim().startsWith("{") && str.trim().endsWith("}");
    }

    public static boolean isJsonArray(String str) {
        if (str == null || str.isBlank()) return false;
        return str.trim().startsWith("[") && str.trim().endsWith("]");
    }

    public static ObjectMapper getObjectMapper() {
        return MAPPER;
    }
}
```

---

## 序列化与反序列化

### 基本用法

```java
// 对象转 JSON 字符串
String json = JsonUtils.toJsonString(user);

// JSON 转简单对象
User user = JsonUtils.parseObject(json, User.class);

// JSON 数组转 List
List<User> users = JsonUtils.parseArray(json, User.class);
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
JsonUtils.isJson("{\"name\":\"test\"}");   // true
JsonUtils.isJson("[1,2,3]");               // true
JsonUtils.isJson("not json");              // false

JsonUtils.isJsonObject("{\"a\":1}");       // true
JsonUtils.isJsonArray("[1,2,3]");          // true
```

---

## Jackson 自动配置

### 推荐配置类

```java
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer customizer() {
        return builder -> {
            // LocalDateTime 格式化
            builder.simpleDateFormat("yyyy-MM-dd HH:mm:ss");
            builder.serializers(new LocalDateTimeSerializer(
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            builder.deserializers(new LocalDateTimeDeserializer(
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

            // 大数字精度保护
            SimpleModule module = new SimpleModule();
            module.addSerializer(Long.class, new BigNumberSerializer());
            module.addSerializer(Long.TYPE, new BigNumberSerializer());
            module.addSerializer(BigInteger.class, new BigNumberSerializer());
            module.addSerializer(BigDecimal.class, ToStringSerializer.instance);
            builder.modules(module);
        };
    }
}
```

### 大数字处理（BigNumberSerializer）

**问题**：JavaScript 最大安全整数为 `2^53 - 1`（9007199254740991），超出范围会丢失精度。

**解决方案**：自动将超出 JS 安全范围的数字序列化为字符串。

```java
// 安全范围内 -> 保持数字
Long id = 123456L;
// 序列化结果：{"id": 123456}

// 超出安全范围 -> 转为字符串
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
```

---

## 使用示例

### Service 中的 JSON 操作

```java
@Service
@RequiredArgsConstructor
public class ConfigServiceImpl {

    private final ConfigMapper configMapper;

    /**
     * 获取配置为对象
     */
    public <T> T getConfig(String configKey, Class<T> clazz) {
        Config config = configMapper.selectOne(
            Wrappers.<Config>lambdaQuery()
                .eq(Config::getConfigKey, configKey));
        if (config == null) {
            return null;
        }
        return JsonUtils.parseObject(config.getConfigValue(), clazz);
    }

    /**
     * 保存配置
     */
    public void saveConfig(String configKey, Object value) {
        Config config = new Config();
        config.setConfigKey(configKey);
        config.setConfigValue(JsonUtils.toJsonString(value));
        configMapper.insert(config);
    }

    /**
     * 导入 JSON 数据
     */
    public void importData(String jsonData) {
        if (!JsonUtils.isJsonArray(jsonData)) {
            throw new [你的异常类]("数据格式不正确，应为 JSON 数组");
        }
        List<DataBo> list = JsonUtils.parseArray(jsonData, DataBo.class);
        // 处理数据...
    }
}
```

---

## 常见问题

### 1. 什么时候用 parseObject vs parseArray？

```java
// JSON 对象 -> parseObject
String json = "{\"name\":\"test\"}";
User user = JsonUtils.parseObject(json, User.class);

// JSON 数组 -> parseArray
String json = "[{\"name\":\"test1\"},{\"name\":\"test2\"}]";
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

// parseObject
JsonUtils.parseObject(null, User.class);   // 返回 null
JsonUtils.parseObject("", User.class);     // 返回 null

// parseArray
JsonUtils.parseArray(null, User.class);    // 返回空 ArrayList
JsonUtils.parseArray("", User.class);      // 返回空 ArrayList
```

---

## 禁止事项

```java
// ❌ 禁止：频繁创建 ObjectMapper
ObjectMapper mapper = new ObjectMapper();
String json = mapper.writeValueAsString(user);

// ✅ 正确：使用项目统一的 JsonUtils
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
