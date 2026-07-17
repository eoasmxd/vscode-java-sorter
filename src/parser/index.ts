import { ClassInfo } from "../types";
import { AntlrJavaParser } from "./antlr-parser";

/**
 * 解析 Java 源码，提取所有类及其成员信息
 * @param source Java 源码文本
 */
export function parseJavaClasses(source: string): ClassInfo[] {
    const parser = new AntlrJavaParser();
    return parser.parse(source);
}
