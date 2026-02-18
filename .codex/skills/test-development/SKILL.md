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

> **核心原则**：本项目使用标准的 JUnit5 + Spring Boot Test，根据测试场景选择是否启动 Spring 容器！

## 测试分层策略

| 层次 | 测试类型 | 是否启动 Spring | 特点 | 执行速度 |
|------|---------|----------------|------|---------|
| **单元测试** | 工具类/枚举/POJO | ❌ 否 | 纯 JUnit5，无依赖注入 | < 1s |
| **集成测试** | Service/Controller/Mapper | ✅ 是 | 使用 `@SpringBootTest`，完整 Spring 容器 | 5-10s |

## 测试文件位置

| 类型 | 位置 | 示例 |
|------|------|------|
| 测试类 | `src/test/java` | `ruoyi-admin/src/test/java/org/dromara/test/` |
| 测试资源 | `src/test/resources` | 测试配置文件、测试数据等 |

## 核心依赖

Spring Boot Test 已包含在 `spring-boot-starter-test` 中，包含：
- **JUnit 5**：测试框架
- **Mockito**：Mock 框架
- **Spring Test**：Spring 测试支持

```xml
<!-- 在业务模块的 pom.xml 中已包含 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 1. 单元测试（纯 JUnit5）

**适用场景：** 工具类、枚举类、POJO、算法逻辑（无需 Spring 容器）

**特点：** 不使用 `@SpringBootTest`，执行速度快，适合纯逻辑测试。

```java
package org.dromara.test;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 断言单元测试案例
 * 参考：ruoyi-admin/src/test/java/org/dromara/test/AssertUnitTest.java
 */
@DisplayName("断言单元测试案例")
public class AssertUnitTest {

    @Test
    @DisplayName("测试 assertEquals 方法")
    public void testAssertEquals() {
        Assertions.assertEquals("666", new String("666"));
        Assertions.assertNotEquals("777", new String("666"));
    }

    @Test
    @DisplayName("测试 assertTrue 方法")
    public void testAssertTrue() {
        Assertions.assertTrue(true);
        Assertions.assertFalse(false);
    }

    @Test
    @DisplayName("测试 assertNull 方法")
    public void testAssertNull() {
        Assertions.assertNull(null);
        Assertions.assertNotNull("not null");
    }
}
```

**常用断言方法：**

```java
// 相等性断言
Assertions.assertEquals(expected, actual);
Assertions.assertNotEquals(expected, actual);

// 同一性断言
Assertions.assertSame(obj1, obj2);
Assertions.assertNotSame(obj1, obj2);

// 布尔断言
Assertions.assertTrue(condition);
Assertions.assertFalse(condition);

// 空值断言
Assertions.assertNull(object);
Assertions.assertNotNull(object);

// 异常断言
Assertions.assertThrows(Exception.class, () -> {
    // 会抛出异常的代码
});
```

---

## 2. Spring 集成测试（@SpringBootTest）

**适用场景：** 需要 Spring 容器的测试（Service、Controller、Mapper、需要依赖注入的场景）

**特点：** 使用 `@SpringBootTest` 启动完整的 Spring 容器，可以使用 `@Autowired` 注入 Bean。

**重要提示：** `@SpringBootTest` 只能在 SpringBoot 主包下使用，需包含 main 方法与 yml 配置文件。

```java
package org.dromara.test;

import org.dromara.common.web.config.properties.CaptchaProperties;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.concurrent.TimeUnit;

/**
 * Spring 集成测试案例
 * 参考：ruoyi-admin/src/test/java/org/dromara/test/DemoUnitTest.java
 */
@SpringBootTest
@DisplayName("单元测试案例")
public class DemoUnitTest {

    @Autowired
    private CaptchaProperties captchaProperties;

    @Test
    @DisplayName("测试 @SpringBootTest @Test @DisplayName 注解")
    public void testTest() {
        System.out.println(captchaProperties);
        Assertions.assertNotNull(captchaProperties);
    }

    @Test
    @DisplayName("测试 @Disabled 注解")
    @Disabled  // 禁用此测试
    public void testDisabled() {
        System.out.println("此测试被禁用");
    }

    @Test
    @DisplayName("测试 @Timeout 注解")
    @Timeout(value = 2L, unit = TimeUnit.SECONDS)
    public void testTimeout() throws InterruptedException {
        Thread.sleep(1000);  // 1秒，不会超时
    }

    @RepeatedTest(3)
    @DisplayName("测试 @RepeatedTest 注解")
    public void testRepeatedTest() {
        System.out.println("重复测试");
    }

    @BeforeAll
    public static void testBeforeAll() {
        System.out.println("@BeforeAll - 所有测试前执行一次");
    }

    @BeforeEach
    public void testBeforeEach() {
        System.out.println("@BeforeEach - 每个测试前执行");
    }

    @AfterEach
    public void testAfterEach() {
        System.out.println("@AfterEach - 每个测试后执行");
    }

    @AfterAll
    public static void testAfterAll() {
        System.out.println("@AfterAll - 所有测试后执行一次");
    }
}
```

---

## 3. Service 测试（@SpringBootTest + @Transactional）

**适用场景：** Service 层业务逻辑测试，需要数据库操作

**特点：** 使用 `@SpringBootTest` + `@Transactional`，测试后自动回滚，不污染数据库。

```java
package org.dromara.demo.service;

import org.dromara.demo.domain.bo.TestDemoBo;
import org.dromara.demo.domain.vo.TestDemoVo;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service 层测试示例
 */
@SpringBootTest
@Transactional  // 测试后自动回滚
@DisplayName("TestDemo Service 测试")
public class TestDemoServiceTest {

    @Autowired
    private ITestDemoService testDemoService;

    @Test
    @DisplayName("测试添加数据")
    public void testAdd() {
        // Arrange - 准备数据
        TestDemoBo bo = new TestDemoBo();
        bo.setDeptId(103L);
        bo.setUserId(1L);
        bo.setOrderNum(1);
        bo.setTestKey("测试数据");
        bo.setValue("test_value");

        // Act - 执行操作
        Boolean result = testDemoService.insertByBo(bo);

        // Assert - 验证结果
        Assertions.assertTrue(result);
    }

    @Test
    @DisplayName("测试查询详情")
    public void testGetById() {
        // 先添加测试数据
        TestDemoBo bo = new TestDemoBo();
        bo.setDeptId(103L);
        bo.setUserId(1L);
        bo.setOrderNum(2);
        bo.setTestKey("测试查询");
        bo.setValue("test_query");
        testDemoService.insertByBo(bo);

        // 查询详情
        TestDemoVo vo = testDemoService.queryById(bo.getId());

        // 断言
        Assertions.assertNotNull(vo);
        Assertions.assertEquals("测试查询", vo.getTestKey());
    }

    @Test
    @DisplayName("测试更新数据")
    public void testUpdate() {
        // 先添加测试数据
        TestDemoBo bo = new TestDemoBo();
        bo.setDeptId(103L);
        bo.setUserId(1L);
        bo.setOrderNum(3);
        bo.setTestKey("原始名称");
        bo.setValue("original");
        testDemoService.insertByBo(bo);

        // 更新数据
        bo.setTestKey("更新后名称");
        Boolean result = testDemoService.updateByBo(bo);

        // 验证
        Assertions.assertTrue(result);
        TestDemoVo vo = testDemoService.queryById(bo.getId());
        Assertions.assertEquals("更新后名称", vo.getTestKey());
    }
}
```

**Mock 外部依赖示例：**

```java
@SpringBootTest
@DisplayName("订单服务测试")
public class OrderServiceTest {

    @Autowired
    private IOrderService orderService;

    @MockBean  // Mock 支付服务
    private IPaymentService paymentService;

    @Test
    @DisplayName("测试订单支付（Mock 支付服务）")
    public void testPayOrder() {
        Long orderId = 123L;

        // Mock 行为
        Mockito.when(paymentService.pay(orderId)).thenReturn(true);

        // 执行
        Boolean success = orderService.payOrder(orderId);

        // 断言
        Assertions.assertTrue(success);
        Mockito.verify(paymentService, Mockito.times(1)).pay(orderId);
    }
}
```

---

## 4. Controller 测试（@SpringBootTest + MockMvc）

**适用场景：** HTTP 接口测试，完整请求链路

**特点：** 使用 `@SpringBootTest` + `@AutoConfigureMockMvc`，模拟 HTTP 请求。

```java
package org.dromara.demo.controller;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller 层测试示例
 */
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
    @DisplayName("测试查询详情")
    public void testGetById() throws Exception {
        mockMvc.perform(get("/demo/demo/1"))
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
                "orderNum": 1,
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

    @Test
    @DisplayName("测试更新数据")
    public void testUpdate() throws Exception {
        String requestBody = """
            {
                "id": 1,
                "deptId": 103,
                "userId": 1,
                "orderNum": 1,
                "testKey": "更新后数据",
                "value": "updated_value"
            }
            """;

        mockMvc.perform(put("/demo/demo")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("测试删除数据")
    public void testDelete() throws Exception {
        mockMvc.perform(delete("/demo/demo/1,2,3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }
}
```

---

## 5. 参数化测试

**适用场景：** 需要用多组数据测试同一个方法

**特点：** 使用 `@ParameterizedTest` 替代 `@Test`，配合数据源注解提供测试数据。

```java
package org.dromara.test;

import org.dromara.common.core.enums.UserType;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

/**
 * 参数化测试案例
 * 参考：ruoyi-admin/src/test/java/org/dromara/test/ParamUnitTest.java
 */
@DisplayName("带参数单元测试案例")
public class ParamUnitTest {

    @ParameterizedTest
    @DisplayName("测试 @ValueSource 注解")
    @ValueSource(strings = {"t1", "t2", "t3"})
    public void testValueSource(String str) {
        System.out.println(str);
        Assertions.assertNotNull(str);
    }

    @ParameterizedTest
    @DisplayName("测试 @NullSource 注解")
    @NullSource
    public void testNullSource(String str) {
        System.out.println(str);
        Assertions.assertNull(str);
    }

    @ParameterizedTest
    @DisplayName("测试 @EnumSource 注解")
    @EnumSource(UserType.class)
    public void testEnumSource(UserType type) {
        System.out.println(type.getUserType());
        Assertions.assertNotNull(type);
    }

    @ParameterizedTest
    @DisplayName("测试 @MethodSource 注解")
    @MethodSource("getParam")
    public void testMethodSource(String str) {
        System.out.println(str);
        Assertions.assertNotNull(str);
    }

    public static Stream<String> getParam() {
        List<String> list = new ArrayList<>();
        list.add("t1");
        list.add("t2");
        list.add("t3");
        return list.stream();
    }

    @BeforeEach
    public void testBeforeEach() {
        System.out.println("@BeforeEach - 每个测试前执行");
    }

    @AfterEach
    public void testAfterEach() {
        System.out.println("@AfterEach - 每个测试后执行");
    }
}
```

**更多参数化测试示例：**

```java
// CSV 数据源
@ParameterizedTest
@DisplayName("测试 CSV 数据")
@CsvSource({
    "1, Banner, 横幅广告",
    "2, Popup, 弹窗广告"
})
public void testCsvData(String code, String name, String desc) {
    Assertions.assertNotNull(code);
    Assertions.assertNotNull(name);
}

// 多个值源
@ParameterizedTest
@DisplayName("测试多个整数")
@ValueSource(ints = {1, 2, 3, 4, 5})
public void testIntValues(int num) {
    Assertions.assertTrue(num > 0);
}

// 空值和空字符串
@ParameterizedTest
@DisplayName("测试空值")
@NullAndEmptySource
@ValueSource(strings = {"  ", "\t", "\n"})
public void testBlankStrings(String input) {
    Assertions.assertTrue(input == null || input.isBlank());
}
```

---

## 6. 测试标签和分组（@Tag）

**适用场景：** 需要对测试进行分组，选择性运行某些测试

**特点：** 使用 `@Tag` 注解标记测试，可以按标签过滤执行。

```java
package org.dromara.test;

import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * 标签单元测试案例
 * 参考：ruoyi-admin/src/test/java/org/dromara/test/TagUnitTest.java
 */
@SpringBootTest
@DisplayName("标签单元测试案例")
public class TagUnitTest {

    @Test
    @Tag("dev")
    @DisplayName("测试 @Tag dev")
    public void testTagDev() {
        System.out.println("dev 环境测试");
    }

    @Test
    @Tag("prod")
    @DisplayName("测试 @Tag prod")
    public void testTagProd() {
        System.out.println("prod 环境测试");
    }

    @Test
    @Tag("local")
    @DisplayName("测试 @Tag local")
    public void testTagLocal() {
        System.out.println("local 环境测试");
    }

    @Test
    @Tag("exclude")
    @DisplayName("测试 @Tag exclude")
    public void testTagExclude() {
        System.out.println("排除的测试");
    }

    @BeforeEach
    public void testBeforeEach() {
        System.out.println("@BeforeEach - 每个测试前执行");
    }

    @AfterEach
    public void testAfterEach() {
        System.out.println("@AfterEach - 每个测试后执行");
    }
}
```

**运行指定标签的测试：**

```bash
# Maven 运行指定标签的测试
mvn test -Dgroups=dev

# Maven 排除指定标签的测试
mvn test -DexcludedGroups=exclude

# IDEA 中配置标签过滤
# Run → Edit Configurations → Test kind: Tags → Tag expression: dev
```

---

## 开发检查清单

### 测试文件规范

- [ ] **测试类命名**：`{被测试类名}Test`（如 `StringUtilsTest`、`DemoUnitTest`）
- [ ] **测试类位置**：`src/test/java` 目录下，包路径与源码一致
- [ ] **测试方法命名**：`test{功能}`（如 `testIsBlank`、`testAdd`）
- [ ] **使用 @DisplayName**：为测试类和方法添加中文描述

### 注解选择

- [ ] **纯单元测试**：不使用 `@SpringBootTest`，适合工具类/枚举/POJO
- [ ] **集成测试**：使用 `@SpringBootTest`，适合 Service/Controller/Mapper
- [ ] **Service 测试**：使用 `@SpringBootTest` + `@Transactional`，测试后自动回滚
- [ ] **Controller 测试**：使用 `@SpringBootTest` + `@AutoConfigureMockMvc`

### 断言规范

- [ ] **使用 JUnit5 Assertions**：`Assertions.assertEquals()` / `Assertions.assertTrue()` 等
- [ ] **异常断言**：`Assertions.assertThrows(Exception.class, () -> {...})`
- [ ] **空值断言**：`Assertions.assertNull()` / `Assertions.assertNotNull()`

### Mock 规范

- [ ] **Spring 测试**：使用 `@MockBean` Mock Spring Bean
- [ ] **单元测试**：使用 `@Mock` / `@InjectMocks`（Mockito）
- [ ] **验证调用**：使用 `Mockito.verify()` 验证 Mock 方法被调用

---

## 常见错误

| 错误写法 | 正确写法 | 原因 |
|---------|---------|------|
| 测试类在 `src/main/java` | 测试类在 `src/test/java` | 测试代码不应打包到生产环境 |
| `@Test public void test()` | `@Test @DisplayName("xxx") public void testXxx()` | 缺少描述和命名规范 |
| 忘记添加 `@SpringBootTest` | 需要依赖注入时添加 `@SpringBootTest` | 无法注入 Spring Bean |
| `@SpringBootTest` 在非主包下 | 测试类必须在主包下（包含 main 方法） | `@SpringBootTest` 需要找到主类 |
| Mock 后不验证调用 | `Mockito.verify(mockObj).method()` | Mock 应验证调用次数和参数 |
| 测试方法相互依赖 | 每个测试方法独立 | 测试应独立可并行执行 |
| Service 测试不加 `@Transactional` | 使用 `@Transactional` 自动回滚 | 避免污染数据库 |
| 硬编码测试数据 | 使用变量或常量 | 提高可维护性 |

---

## 异常测试

**适用场景：** 测试方法是否正确抛出异常

```java
import org.dromara.common.core.exception.ServiceException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@Test
@DisplayName("测试添加数据 - key键为空抛出异常")
public void testAdd_ThrowsException() {
    TestDemoBo bo = new TestDemoBo();
    // 不设置 testKey（必填字段）

    // 断言抛出 ServiceException 异常
    ServiceException exception = Assertions.assertThrows(
        ServiceException.class,
        () -> testDemoService.insertByBo(bo)
    );

    // 验证异常消息
    Assertions.assertTrue(exception.getMessage().contains("key键不能为空"));
}

@Test
@DisplayName("测试空指针异常")
public void testNullPointerException() {
    Assertions.assertThrows(
        NullPointerException.class,
        () -> {
            String str = null;
            str.length();
        }
    );
}
```

---

## 运行测试

```bash
# Maven 运行所有测试
mvn test

# Maven 运行单个测试类
mvn test -Dtest=AdServiceTest

# Maven 运行单个测试方法
mvn test -Dtest=AdServiceTest#testAddAd

# IDEA 中运行
# 右键测试类/方法 → Run 'XXTest'
```

---

## FAQ

### Q1: 什么时候使用 @SpringBootTest？

**A:**
- **不使用 @SpringBootTest**：工具类、枚举、POJO（纯逻辑测试，不需要 Spring 容器）
- **使用 @SpringBootTest**：Service、Controller、Mapper（需要依赖注入和 Spring 容器）

### Q2: Service 测试会污染数据库吗？

**A:** 不会。使用 `@SpringBootTest` + `@Transactional`，测试结束后自动回滚，不会污染数据库。

### Q3: 如何测试私有方法？

**A:**
- 不要直接测试私有方法
- 通过公共方法间接测试
- 如果私有方法太复杂，考虑提取为独立类

### Q4: Mock 和真实测试如何选择？

**A:**
- **单元测试**: 优先 Mock 外部依赖（快速、隔离）
- **集成测试**: 使用真实依赖（准确、完整）
- **平衡**: 既要有单元测试（快），也要有集成测试（准确）

### Q5: @SpringBootTest 为什么找不到主类？

**A:** `@SpringBootTest` 只能在 SpringBoot 主包下使用，测试类必须与主类（包含 main 方法）在同一个包或子包下。

### Q6: 如何跳过测试执行？

**A:**
- **单个测试**：使用 `@Disabled` 注解
- **Maven 跳过所有测试**：`mvn clean install -DskipTests`

---
