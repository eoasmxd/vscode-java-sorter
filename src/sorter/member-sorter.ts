import { DEFAULT_SORT_CONFIG, MemberInfo, MemberType, SortConfiguration } from "../types";

/**
 * 依据配置规则对类成员进行排序并返回排序后的成员列表
 */
export function sortMembers(
    members: MemberInfo[],
    config: SortConfiguration = DEFAULT_SORT_CONFIG
): MemberInfo[] {
    if (members.length <= 1) {
        return members;
    }

    const fixedPositions: Array<{ index: number; member: MemberInfo }> = [];
    const sortable: MemberInfo[] = [];

    for (let i = 0; i < members.length; i++) {
        const m = members[i];
        if (isFixedMember(m, config)) {
            fixedPositions.push({ index: i, member: m });
        } else {
            sortable.push(m);
        }
    }

    if (sortable.length === 0) {
        return members;
    }

    sortable.sort((a, b) => compareMembers(a, b, config));

    const result: MemberInfo[] = [];
    let sortableIdx = 0;

    for (let i = 0; i < members.length; i++) {
        const fixed = fixedPositions.find((fp) => fp.index === i);
        if (fixed) {
            result.push(fixed.member);
        } else {
            if (sortableIdx < sortable.length) {
                result.push(sortable[sortableIdx]);
                sortableIdx++;
            }
        }
    }

    while (sortableIdx < sortable.length) {
        result.push(sortable[sortableIdx]);
        sortableIdx++;
    }

    return result;
}

/**
 * 判断是否为不参与重排的固定成员
 */
function isFixedMember(m: MemberInfo, config: SortConfiguration): boolean {
    if (m.type === MemberType.FIELD) {
        return !config.sortFields;
    }
    if (m.type === MemberType.ENUM_CONSTANT) {
        return !config.sortConstants;
    }
    if (m.type === MemberType.INITIALIZER) {
        return !config.sortInitializers;
    }
    return false;
}

/**
 * 比较两个成员的排序先后次序
 */
function compareMembers(a: MemberInfo, b: MemberInfo, config: SortConfiguration): number {
    const orderA = getSortGroup(a, config);
    const orderB = getSortGroup(b, config);

    if (orderA !== orderB) {
        return orderA - orderB;
    }

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

/**
 * 获取类成员的排序优先级排序组序号
 */
function getSortGroup(m: MemberInfo, config: SortConfiguration): number {
    switch (m.type) {
        case MemberType.ENUM_CONSTANT:
            return 10;
        case MemberType.FIELD:
            return 20;
        case MemberType.INITIALIZER:
            return 30;
        case MemberType.METHOD:
            if (m.isStatic) {
                return config.distinguishStaticMethods ? 40 : 60;
            }
            return 60;
        case MemberType.CONSTRUCTOR:
            return config.distinguishConstructors ? 50 : 60;
        case MemberType.NESTED_TYPE:
            return 70;
        default:
            return 99;
    }
}

/**
 * 比较两个构造方法的次序，依据参数数量及字母序
 */
function compareConstructors(a: MemberInfo, b: MemberInfo): number {
    if (a.paramCount !== b.paramCount) {
        return a.paramCount - b.paramCount;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}

/**
 * 比较两个普通方法的次序，依据可见性及字母序
 */
function compareMethods(a: MemberInfo, b: MemberInfo, config: SortConfiguration): number {
    if (config.sortByVisibility && a.visibility !== b.visibility) {
        return a.visibility - b.visibility;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}

/**
 * 比较两个字段的次序，依据可见性及字母序
 */
function compareFields(a: MemberInfo, b: MemberInfo, config: SortConfiguration): number {
    if (config.sortByVisibility && a.visibility !== b.visibility) {
        return a.visibility - b.visibility;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}

/**
 * 比较两个嵌套类型的次序
 */
function compareNestedTypes(a: MemberInfo, b: MemberInfo): number {
    if (a.isStatic !== b.isStatic) {
        return a.isStatic ? -1 : 1;
    }

    const kindOrder: Record<string, number> = {
        class: 0,
        interface: 1,
        enum: 2,
    };
    const kindA = kindOrder[a.nestedKind || "class"] ?? 0;
    const kindB = kindOrder[b.nestedKind || "class"] ?? 0;
    if (kindA !== kindB) {
        return kindA - kindB;
    }

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}
