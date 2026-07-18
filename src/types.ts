/**
 * 类成员的可见性级别
 */
export enum Visibility {
    PUBLIC = 0,
    PROTECTED = 1,
    PACKAGE = 2,
    PRIVATE = 3,
}

/**
 * 类成员的类型
 */
export enum MemberType {
    /** 字段 — 不参与排序 */
    FIELD = "FIELD",
    /** 枚举常量 — 不参与排序 */
    ENUM_CONSTANT = "ENUM_CONSTANT",
    /** 初始化块（static / instance）— 不参与排序 */
    INITIALIZER = "INITIALIZER",
    /** 构造方法 */
    CONSTRUCTOR = "CONSTRUCTOR",
    /** 普通方法（静态或实例） */
    METHOD = "METHOD",
    /** 嵌套类型（类 / 接口 / 枚举） */
    NESTED_TYPE = "NESTED_TYPE",
}

/**
 * 解析后提取的单个类成员信息
 */
export interface MemberInfo {
    /** 成员类型 */
    type: MemberType;
    /** 在源代码中的起始偏移量 */
    start: number;
    /** 在源代码中的结束偏移量（不含） */
    end: number;
    /** 成员名称（字段名 / 方法名 / 类型名），用于字母序排序 */
    name: string;
    /** 可见性 */
    visibility: Visibility;
    /** 是否为静态成员 */
    isStatic: boolean;
    /** 方法参数数量（仅对构造方法和方法有意义） */
    paramCount: number;
    /** 嵌套类型的种类（class / interface / enum / record / annotation），仅对 NESTED_TYPE 有意义 */
    nestedKind?: "class" | "interface" | "enum" | "record" | "annotation";
    /** 是否为抽象成员 */
    isAbstract: boolean;
    /** 成员前的完整文本（含注解、Javadoc），用于最终拼接 */
    fullText: string;
}

/**
 * 类声明信息，包含其所有可排序成员
 */
export interface ClassInfo {
    /** 类名称 */
    name: string;
    /** 类体在源代码中的起始偏移量（{ 之后） */
    bodyStart: number;
    /** 类体在源代码中的结束偏移量（} 之前） */
    bodyEnd: number;
    /** 所有成员 */
    members: MemberInfo[];
}

/**
 * 统一的 Java 解析器接口，用于未来无缝替换底层解析引擎
 */
export interface IJavaParser {
    /**
     * 解析 Java 源码，提取可排序的类和成员元数据
     * @param source Java 源码文本
     */
    parse(source: string): ClassInfo[];
}

export interface SortConfiguration {
    /** 成员类别的物理排序顺序链 */
    memberOrder: string[];
    /** 同组内成员的可见性排序顺序链（空代表不启用可见性排序） */
    visibilityOrder: string[];
    /** 是否对所有类成员进行排序（若为 false，则字段、枚举常量和初始化器保持原位） */
    sortAllMembers: boolean;
}

export const DEFAULT_SORT_CONFIG: SortConfiguration = {
    memberOrder: [
        "types",
        "staticFields",
        "staticInitializers",
        "staticMethods",
        "fields",
        "initializers",
        "constructors",
        "methods",
    ],
    visibilityOrder: [],
    sortAllMembers: false,
};

