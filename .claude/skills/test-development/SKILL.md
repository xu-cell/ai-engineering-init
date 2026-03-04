---
name: test-development
description: |
  测试开发技能，编写单元测试、集成测试、Controller测试。基于 JUnit5 + Spring Boot Test + Mockito 标准测试框架。

  触发场景：
  - 编写单元测试（工具类、枚举、POJO）
  - 编写 Spring 集成测试（Service、Controller、Mapper）
  - Mock 外部依赖
  - 参数化测试
  - 测试数据构造
  - 测试覆盖率提升

  触发词：测试、单元测试、集成测试、@Test、JUnit5、JUnit、Mockito、Mock、断言、test、测试用例、测试覆盖率、测试数据、@SpringBootTest、@Mock、@MockBean、Assertions、测试类、测试方法、@ParameterizedTest、参数化测试、@BeforeEach、@AfterEach、@DisplayName

  注意：本项目使用标准的 JUnit5 + Spring Boot Test，没有自定义测试基类。
---

# 测试开发规范

## 测试分层策略

| 层次 | 测试类型 | 启动 Spring | 执行速度 |
|------|---------|------------|---------|
| 单元测试 | 工具类/枚举/POJO | 否 | < 1s |
| 集成测试 | Service/Controller/Mapper | 是（`@SpringBootTest`） | 5-10s |

## 测试文件位置

```
src/test/java/org/dromara/test/     # 通用测试
src/test/java/org/dromara/{模块}/   # 模块测试（与源码包路径一致）
```

**重要**：`@SpringBootTest` 只能在 SpringBoot 主包下使用（需包含 main 方法和 yml 配置）。

---

## 1. 单元测试（纯 JUnit5，无 Spring）

```java
package org.dromara.test;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("StringUtils 测试")
public class StringUtilsTest {

    @Test
    @DisplayName("测试 isBlank 方法")
    public void testIsBlank() {
        Assertions.assertTrue(StringUtils.isBlank(null));
        Assertions.assertTrue(StringUtils.isBlank(""));
        Assertions.assertFalse(StringUtils.isBlank("hello"));
    }

    @Test
    @DisplayName("测试异常抛出")
    public void testThrowsException() {
        Assertions.assertThrows(NullPointerException.class, () -> {
            String str = null;
            str.length();
        });
    }
}
```

---

## 2. Service 集成测试

```java
@SpringBootTest
@Transactional  // 测试后自动回滚，不污染数据库
@DisplayName("TestDemo Service 测试")
public class TestDemoServiceTest {

    @Autowired
    private ITestDemoService testDemoService;

    @Test
    @DisplayName("测试添加数据")
    public void testAdd() {
        // Arrange
        TestDemoBo bo = new TestDemoBo();
        bo.setDeptId(103L);
        bo.setUserId(1L);
        bo.setTestKey("测试数据");
        bo.setValue("test_value");

        // Act
        Boolean result = testDemoService.insertByBo(bo);

        // Assert
        Assertions.assertTrue(result);
    }

    @Test
    @DisplayName("测试查询详情")
    public void testGetById() {
        TestDemoBo bo = new TestDemoBo();
        bo.setTestKey("测试查询");
        bo.setValue("test_query");
        testDemoService.insertByBo(bo);

        TestDemoVo vo = testDemoService.queryById(bo.getId());
        Assertions.assertNotNull(vo);
        Assertions.assertEquals("测试查询", vo.getTestKey());
    }
}
```

### Mock 外部依赖

```java
@SpringBootTest
@DisplayName("订单服务测试")
public class OrderServiceTest {

    @Autowired
    private IOrderService orderService;

    @MockBean
    private IPaymentService paymentService;

    @Test
    @DisplayName("测试订单支付（Mock 支付服务）")
    public void testPayOrder() {
        Long orderId = 123L;
        Mockito.when(paymentService.pay(orderId)).thenReturn(true);

        Boolean success = orderService.payOrder(orderId);

        Assertions.assertTrue(success);
        Mockito.verify(paymentService, Mockito.times(1)).pay(orderId);
    }
}
```

---

## 3. Controller 测试

```java
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("TestDemo Controller 测试")
public class TestDemoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("测试分页查询")
    public void testPageList() throws Exception {
        mockMvc.perform(get("/demo/demo/list")
                .param("pageNum", "1")
                .param("pageSize", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("测试添加数据")
    public void testAdd() throws Exception {
        String requestBody = """
            {
                "deptId": 103,
                "userId": 1,
                "testKey": "测试数据",
                "value": "test_value"
            }
            """;

        mockMvc.perform(post("/demo/demo")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }
}
```

---

## 4. 参数化测试

```java
@DisplayName("参数化测试")
public class ParamUnitTest {

    @ParameterizedTest
    @ValueSource(strings = {"t1", "t2", "t3"})
    public void testValueSource(String str) {
        Assertions.assertNotNull(str);
    }

    @ParameterizedTest
    @EnumSource(UserType.class)
    public void testEnumSource(UserType type) {
        Assertions.assertNotNull(type);
    }

    @ParameterizedTest
    @CsvSource({"1, Banner, 横幅广告", "2, Popup, 弹窗广告"})
    public void testCsvData(String code, String name, String desc) {
        Assertions.assertNotNull(code);
    }

    @ParameterizedTest
    @MethodSource("getParam")
    public void testMethodSource(String str) {
        Assertions.assertNotNull(str);
    }

    public static Stream<String> getParam() {
        return Stream.of("t1", "t2", "t3");
    }
}
```

> 更多参数化测试示例详见 `references/parameterized-examples.md`

---

## 5. 异常测试

```java
@Test
@DisplayName("测试 key 为空抛出异常")
public void testAdd_ThrowsException() {
    TestDemoBo bo = new TestDemoBo();
    // 不设置必填字段

    ServiceException exception = Assertions.assertThrows(
        ServiceException.class,
        () -> testDemoService.insertByBo(bo)
    );
    Assertions.assertTrue(exception.getMessage().contains("key键不能为空"));
}
```

---

## 6. 测试标签（@Tag）

```java
@Test @Tag("dev")   public void testDev() { }
@Test @Tag("prod")  public void testProd() { }
```

```bash
mvn test -Dgroups=dev           # 运行 dev 标签
mvn test -DexcludedGroups=prod  # 排除 prod 标签
```

---

## 运行测试

```bash
mvn test                                  # 运行所有测试
mvn test -Dtest=AdServiceTest             # 运行单个测试类
mvn test -Dtest=AdServiceTest#testAddAd   # 运行单个方法
mvn clean install -DskipTests             # 跳过测试
```

---

## 开发检查清单

### 命名规范

- [ ] 测试类：`{被测试类名}Test`
- [ ] 测试方法：`test{功能}`
- [ ] 使用 `@DisplayName` 添加中文描述
- [ ] 位于 `src/test/java`，包路径与源码一致

### 注解选择

| 场景 | 注解组合 |
|------|---------|
| 工具类/枚举/POJO | 不加 `@SpringBootTest` |
| Service 测试 | `@SpringBootTest` + `@Transactional` |
| Controller 测试 | `@SpringBootTest` + `@AutoConfigureMockMvc` |
| Mock Spring Bean | `@MockBean` |
| Mock（纯单元测试） | `@Mock` + `@InjectMocks` |

### 常见错误

| 错误 | 正确做法 |
|------|---------|
| 测试在 `src/main/java` | 放到 `src/test/java` |
| 缺少 `@DisplayName` | 必须添加描述 |
| 需要注入但没加 `@SpringBootTest` | 加上注解 |
| `@SpringBootTest` 在非主包下 | 确保在主类同包或子包 |
| Mock 后不验证调用 | `Mockito.verify()` |
| 测试方法相互依赖 | 每个测试独立 |
| Service 测试不加 `@Transactional` | 加上防止污染数据库 |
