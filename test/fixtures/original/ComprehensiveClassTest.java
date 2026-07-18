package test;

public class ComprehensiveClassTest {

    // 4. 静态初始化块 A
    static {
        System.out.println("Static Initializer A");
    }

    // 2. 嵌套 Record
    public record NestedRecord(String name, int age) {}

    // 6. 私有字段
    private int privateField;

    // 7. 公有字段
    public String publicField;

    // 8. 实例初始化块 A
    {
        System.out.println("Instance Initializer A");
    }

    // 3. 嵌套注解
    public @interface NestedAnnotation {
        String value() default "";
    }

    // 5. 静态初始化块 B
    static {
        System.out.println("Static Initializer B");
    }

    // 1. 嵌套 Enum
    public enum MyEnum {
        RED,
        GREEN,
        BLUE
    }

    // 11. 构造方法 B (双参数)
    public ComprehensiveClassTest(int x, int y) {
        this.privateField = x + y;
    }

    // 10. 构造方法 A (单参数)
    public ComprehensiveClassTest(int x) {
        this.privateField = x;
    }

    // 9. 实例初始化块 B
    {
        System.out.println("Instance Initializer B");
    }
}
