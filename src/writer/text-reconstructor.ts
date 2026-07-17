import { parseJavaClasses } from "../parser";
import { sortMembers } from "../sorter/member-sorter";
import { ClassInfo, DEFAULT_SORT_CONFIG, SortConfiguration } from "../types";

/**
 * 依据配置规则对 Java 源码进行类成员排序并生成重构后的完整源码
 */
export function sortSourceCode(
    source: string,
    config: SortConfiguration = DEFAULT_SORT_CONFIG
): string {
    const classes = parseJavaClasses(source);
    if (classes.length === 0) {
        return source;
    }

    for (const classInfo of classes) {
        classInfo.members = sortMembers(classInfo.members, config);
    }

    classes.sort((a, b) => b.bodyEnd - a.bodyEnd);

    let result = source;
    for (const classInfo of classes) {
        result = rebuildClassBody(result, classInfo);
    }
    return result;
}

/**
 * 重建单个类的类体文本内容
 */
function rebuildClassBody(source: string, classInfo: ClassInfo): string {
    const { bodyStart, bodyEnd, members } = classInfo;
    if (members.length === 0) {
        return source;
    }

    const sortedTexts = members.map(m => m.fullText);
    const rebuiltBody = sortedTexts.join("");

    const sortedByOriginalStart = [...members].sort((a, b) => a.start - b.start);
    const originalLast = sortedByOriginalStart[sortedByOriginalStart.length - 1];
    const trailingWhitespace = source.slice(originalLast.end, bodyEnd);

    const before = source.slice(0, bodyStart);
    const after = source.slice(bodyEnd);

    return before + rebuiltBody + trailingWhitespace + after;
}
