import { DEFAULT_SORT_CONFIG, MemberInfo, MemberType, SortConfiguration, Visibility } from "../types";

const ALL_MEMBER_KEYS = [
    "types",
    "staticFields",
    "staticInitializers",
    "staticMethods",
    "fields",
    "initializers",
    "constructors",
    "methods",
];

/**
 * 依据配置对类成员进行排序
 */
export function sortMembers(
    members: MemberInfo[],
    config: SortConfiguration = DEFAULT_SORT_CONFIG
): MemberInfo[] {
    if (members.length <= 1) {
        return members;
    }
    const safeConfig = getSafeConfig(config);
    return [...members].sort((a, b) => compareMembers(a, b, safeConfig));
}

/**
 * 防御性配置清洗，去重并补齐缺失的成员类型
 */
function getSafeConfig(config: SortConfiguration): SortConfiguration {
    const rawOrder = config.memberOrder || [];
    const uniqueOrder = Array.from(new Set(rawOrder)).filter(Boolean);
    
    for (const key of ALL_MEMBER_KEYS) {
        if (!uniqueOrder.includes(key)) {
            uniqueOrder.push(key);
        }
    }
    
    return {
        ...config,
        memberOrder: uniqueOrder,
    };
}

/**
 * 判断特定类别在同组内是否启用微观排序
 */
function isMicroSortEnabled(type: MemberType, config: SortConfiguration): boolean {
    if (config.sortAllMembers) {
        return true;
    }
    return (
        type === MemberType.METHOD ||
        type === MemberType.CONSTRUCTOR ||
        type === MemberType.NESTED_TYPE
    );
}

/**
 * 比较两个成员的先后次序
 */
function compareMembers(a: MemberInfo, b: MemberInfo, config: SortConfiguration): number {
    const orderA = getSortGroup(a, config);
    const orderB = getSortGroup(b, config);

    if (orderA !== orderB) {
        return orderA - orderB;
    }

    if (isMicroSortEnabled(a.type, config)) {
        switch (a.type) {
            case MemberType.CONSTRUCTOR:
                return compareConstructors(a, b);
            case MemberType.METHOD:
                return compareMethods(a, b, config);
            case MemberType.FIELD:
                return compareFields(a, b, config);
            case MemberType.NESTED_TYPE:
                return compareNestedTypes(a, b);
            default:
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        }
    }

    return a.start - b.start;
}

/**
 * 将类成员类型映射为排序配置大组的 key
 */
function getMemberOrderKey(m: MemberInfo): string {
    switch (m.type) {
        case MemberType.NESTED_TYPE:
            return "types";
        case MemberType.FIELD:
            return m.isStatic ? "staticFields" : "fields";
        case MemberType.ENUM_CONSTANT:
            return "fields";
        case MemberType.INITIALIZER:
            return m.isStatic ? "staticInitializers" : "initializers";
        case MemberType.CONSTRUCTOR:
            return "constructors";
        case MemberType.METHOD:
            return m.isStatic ? "staticMethods" : "methods";
        default:
            return "";
    }
}

/**
 * 获取类成员的排序物理组序号
 */
function getSortGroup(m: MemberInfo, config: SortConfiguration): number {
    const key = getMemberOrderKey(m);
    const index = config.memberOrder.indexOf(key);
    return index !== -1 ? index : 99;
}

/**
 * 比较两个构造方法的排序次序
 */
function compareConstructors(a: MemberInfo, b: MemberInfo): number {
    if (a.paramCount !== b.paramCount) {
        return a.paramCount - b.paramCount;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}

/**
 * 将可见性枚举映射为对应的配置字符串
 */
function getVisibilityName(v: Visibility): string {
    switch (v) {
        case Visibility.PUBLIC:
            return "public";
        case Visibility.PROTECTED:
            return "protected";
        case Visibility.PACKAGE:
            return "package";
        case Visibility.PRIVATE:
            return "private";
        default:
            return "package";
    }
}

/**
 * 比较相同大组内的可见性先后次序
 */
function compareVisibility(a: MemberInfo, b: MemberInfo, config: SortConfiguration): number {
    const order = config.visibilityOrder;
    if (!order || order.length === 0) {
        return 0;
    }
    const idxA = order.indexOf(getVisibilityName(a.visibility));
    const idxB = order.indexOf(getVisibilityName(b.visibility));
    
    const weightA = idxA !== -1 ? idxA : 99;
    const weightB = idxB !== -1 ? idxB : 99;
    return weightA - weightB;
}

/**
 * 比较方法的排序次序
 */
function compareMethods(a: MemberInfo, b: MemberInfo, config: SortConfiguration): number {
    const visCompare = compareVisibility(a, b, config);
    if (visCompare !== 0) {
        return visCompare;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}

/**
 * 比较字段的排序次序
 */
function compareFields(a: MemberInfo, b: MemberInfo, config: SortConfiguration): number {
    const visCompare = compareVisibility(a, b, config);
    if (visCompare !== 0) {
        return visCompare;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}

/**
 * 比较嵌套类型的排序次序
 */
function compareNestedTypes(a: MemberInfo, b: MemberInfo): number {
    if (a.isStatic !== b.isStatic) {
        return a.isStatic ? -1 : 1;
    }

    const kindWeights: Record<string, number> = {
        class: 0,
        interface: 1,
        enum: 2,
    };
    const weightA = kindWeights[a.nestedKind || "class"] ?? 0;
    const weightB = kindWeights[b.nestedKind || "class"] ?? 0;
    
    if (weightA !== weightB) {
        return weightA - weightB;
    }

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}
