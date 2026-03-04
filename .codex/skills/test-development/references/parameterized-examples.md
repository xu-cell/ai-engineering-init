# 参数化测试完整示例

## @ValueSource

```java
@ParameterizedTest
@ValueSource(strings = {"t1", "t2", "t3"})
public void testStringValues(String str) {
    Assertions.assertNotNull(str);
}

@ParameterizedTest
@ValueSource(ints = {1, 2, 3, 4, 5})
public void testIntValues(int num) {
    Assertions.assertTrue(num > 0);
}
```

## @NullSource / @NullAndEmptySource

```java
@ParameterizedTest
@NullSource
public void testNullSource(String str) {
    Assertions.assertNull(str);
}

@ParameterizedTest
@NullAndEmptySource
@ValueSource(strings = {"  ", "\t", "\n"})
public void testBlankStrings(String input) {
    Assertions.assertTrue(input == null || input.isBlank());
}
```

## @EnumSource

```java
@ParameterizedTest
@EnumSource(UserType.class)
public void testEnumSource(UserType type) {
    Assertions.assertNotNull(type.getUserType());
}
```

## @CsvSource

```java
@ParameterizedTest
@CsvSource({
    "1, Banner, 横幅广告",
    "2, Popup, 弹窗广告"
})
public void testCsvData(String code, String name, String desc) {
    Assertions.assertNotNull(code);
    Assertions.assertNotNull(name);
}
```

## @MethodSource

```java
@ParameterizedTest
@MethodSource("getParam")
public void testMethodSource(String str) {
    Assertions.assertNotNull(str);
}

public static Stream<String> getParam() {
    return Stream.of("t1", "t2", "t3");
}
```

## 生命周期注解

```java
@BeforeAll   static void beforeAll() { }   // 所有测试前执行一次
@BeforeEach  void beforeEach() { }         // 每个测试前执行
@AfterEach   void afterEach() { }          // 每个测试后执行
@AfterAll    static void afterAll() { }    // 所有测试后执行一次
```

## 标签分组完整示例

```java
@SpringBootTest
@DisplayName("标签单元测试")
public class TagUnitTest {

    @Test @Tag("dev")
    @DisplayName("dev 环境测试")
    public void testTagDev() { }

    @Test @Tag("prod")
    @DisplayName("prod 环境测试")
    public void testTagProd() { }

    @Test @Tag("local")
    @DisplayName("local 环境测试")
    public void testTagLocal() { }
}
```

运行指定标签：
```bash
mvn test -Dgroups=dev
mvn test -DexcludedGroups=exclude
```

## Spring 集成测试注解速查

```java
@SpringBootTest                    // 启动完整 Spring 容器
@Transactional                     // 测试后自动回滚
@AutoConfigureMockMvc              // 自动配置 MockMvc
@Disabled                          // 禁用测试
@Timeout(value = 2, unit = SECONDS) // 超时限制
@RepeatedTest(3)                   // 重复执行 3 次
```
