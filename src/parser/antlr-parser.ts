import { BaseJavaCstVisitorWithDefaults, parse } from "java-parser";
import { ClassInfo, MemberInfo, MemberType, Visibility, IJavaParser } from "../types";

/**
 * 基于 java-parser 语法解析引擎的 Java 类成员元数据解析器
 */
export class AntlrJavaParser implements IJavaParser {
    parse(source: string): ClassInfo[] {
        const cst = parse(source);
        const visitor = new ClassBodyVisitor(source);
        visitor.visit(cst);
        return visitor.getClasses();
    }
}

type CstNode = Record<string, any>;

function toArray(value: unknown): unknown[] {
    if (Array.isArray(value)) {
        return value;
    }
    if (value === undefined || value === null) {
        return [];
    }
    return [value];
}

/**
 * AST 类体访问器，遍历编译单元并收集各类型声明的成员元数据
 */
class ClassBodyVisitor extends BaseJavaCstVisitorWithDefaults {
    private source: string;
    private classes: ClassInfo[] = [];

    constructor(source: string) {
        super();
        this.source = source;
    }

    getClasses(): ClassInfo[] {
        return this.classes;
    }

    private collectClassMembers(
        classBodyNode: CstNode,
        className: string,
        minOffset: number,
        contextType: "class" | "interface" | "enum"
    ): MemberInfo[] {
        const members: MemberInfo[] = [];
        const bodyChildren = classBodyNode.children || classBodyNode;
        const declarations = bodyChildren.classBodyDeclaration;
        if (!declarations) {
            return members;
        }

        for (const decl of toArray(declarations)) {
            const d = decl as CstNode;
            const originalChildren = d.children || d;

            let children = originalChildren;
            if (originalChildren.classMemberDeclaration) {
                const cmd = toArray(originalChildren.classMemberDeclaration)[0] as CstNode;
                if (cmd) {
                    children = cmd.children || cmd;
                }
            }

            const rawStartOffset = extractStartOffset(d);
            let startOffset = rawStartOffset;
            const endOffset = extractEndOffset(d);

            startOffset = extendStartOffsetToIncludeComments(this.source, startOffset, minOffset);

            if (children.fieldDeclaration) {
                for (const fd of toArray(children.fieldDeclaration)) {
                    const info = makeFieldInfo(fd as CstNode, this.source, startOffset, endOffset, contextType);
                    if (info) {
                        members.push(info);
                    }
                }
                continue;
            }

            if (children.methodDeclaration) {
                for (const md of toArray(children.methodDeclaration)) {
                    const mdNode = md as CstNode;
                    if (isParsedAsMethodButActuallyRecord(this.source, startOffset, endOffset)) {
                        const recordName = extractMethodName(mdNode);
                        members.push({
                            type: MemberType.NESTED_TYPE,
                            start: startOffset,
                            end: endOffset,
                            name: recordName || "<anonymous>",
                            visibility: extractVisibility(toArray(mdNode.children?.modifier || []), contextType),
                            isStatic: extractStatic(toArray(mdNode.children?.modifier || [])),
                            paramCount: 0,
                            nestedKind: "record",
                            isAbstract: false,
                            fullText: this.source.slice(startOffset, endOffset),
                        });
                    } else {
                        const info = makeMethodInfo(mdNode, this.source, startOffset, endOffset, false, contextType);
                        if (info) {
                            members.push(info);
                        }
                    }
                }
                continue;
            }

            const cdecl = children.constructorDeclaration || originalChildren.constructorDeclaration;
            if (cdecl) {
                for (const cd of toArray(cdecl)) {
                    const info = makeConstructorInfo(cd as CstNode, this.source, startOffset, endOffset, contextType);
                    if (info) {
                        members.push(info);
                    }
                }
                continue;
            }

            if (children.classDeclaration) {
                for (const cd of toArray(children.classDeclaration)) {
                    const info = makeNestedTypeInfo(cd as CstNode, this.source, startOffset, endOffset, "class", className, contextType);
                    if (info) {
                        members.push(info);
                    }
                }
                continue;
            }

            if (children.interfaceDeclaration) {
                for (const id of toArray(children.interfaceDeclaration)) {
                    const info = makeNestedTypeInfo(id as CstNode, this.source, startOffset, endOffset, "interface", className, contextType);
                    if (info) {
                        members.push(info);
                    }
                }
                continue;
            }

            if (children.enumDeclaration) {
                for (const nd of toArray(children.enumDeclaration)) {
                    const info = makeNestedTypeInfo(nd as CstNode, this.source, startOffset, endOffset, "enum", className, contextType);
                    if (info) {
                        members.push(info);
                    }
                }
                continue;
            }

            if (children.recordDeclaration) {
                for (const nd of toArray(children.recordDeclaration)) {
                    const info = makeNestedTypeInfo(nd as CstNode, this.source, startOffset, endOffset, "record", className, contextType);
                    if (info) {
                        members.push(info);
                    }
                }
                continue;
            }

            if (children.annotationTypeDeclaration) {
                for (const nd of toArray(children.annotationTypeDeclaration)) {
                    const info = makeNestedTypeInfo(nd as CstNode, this.source, startOffset, endOffset, "annotation", className, contextType);
                    if (info) {
                        members.push(info);
                    }
                }
                continue;
            }

            const sInit = children.staticInitializer || originalChildren.staticInitializer;
            if (sInit) {
                members.push({
                    type: MemberType.INITIALIZER,
                    start: startOffset,
                    end: endOffset,
                    name: "<static_initializer>",
                    visibility: Visibility.PACKAGE,
                    isStatic: true,
                    paramCount: 0,
                    nestedKind: undefined,
                    isAbstract: false,
                    fullText: this.source.slice(startOffset, endOffset),
                });
                continue;
            }

            const blockInit = children.block || originalChildren.block;
            const rawDeclText = this.source.slice(rawStartOffset, endOffset).trim();
            const isInstanceBlock = blockInit || (rawDeclText.startsWith("{") && rawDeclText.endsWith("}"));
            if (isInstanceBlock) {
                members.push({
                    type: MemberType.INITIALIZER,
                    start: startOffset,
                    end: endOffset,
                    name: "<initializer>",
                    visibility: Visibility.PACKAGE,
                    isStatic: false,
                    paramCount: 0,
                    nestedKind: undefined,
                    isAbstract: false,
                    fullText: this.source.slice(startOffset, endOffset),
                });
                continue;
            }

            if (children.semicolon) {
                continue;
            }
        }

        const sortedByPos = [...members].sort((a, b) => a.start - b.start);
        for (let i = 0; i < sortedByPos.length; i++) {
            const m = sortedByPos[i];
            const newStart = i === 0 ? minOffset : sortedByPos[i - 1].end;
            if (newStart < m.start) {
                m.start = newStart;
                m.fullText = this.source.slice(newStart, m.end);
            }
        }

        return members;
    }

    ordinaryCompilationUnit(ctx: CstNode): void {
        const children = ctx.children || ctx;
        const typeDeclarations = children.typeDeclaration;
        if (typeDeclarations) {
            for (const td of toArray(typeDeclarations)) {
                this.processTypeDeclaration(td as CstNode);
            }
        }
    }

    modularCompilationUnit(_ctx: CstNode): void {
    }

    private processTypeDeclaration(td: CstNode): void {
        const children = td.children || td;

        if (children.classDeclaration) {
            for (const cd of toArray(children.classDeclaration)) {
                this.processClassOrEnum(cd as CstNode, false);
            }
        }
        if (children.enumDeclaration) {
            for (const ed of toArray(children.enumDeclaration)) {
                this.processClassOrEnum(ed as CstNode, true);
            }
        }
        if (children.interfaceDeclaration) {
            for (const id of toArray(children.interfaceDeclaration)) {
                this.processInterface(id as CstNode);
            }
        }
    }

    private processClassOrEnum(node: CstNode, isEnum: boolean): void {
        let children = node.children || node;

        if (children.normalClassDeclaration) {
            const ncd = toArray(children.normalClassDeclaration)[0] as CstNode;
            if (ncd) {
                children = ncd.children || ncd;
            }
        }

        const body = children.classBody || children.enumBody;
        if (!body) {
            return;
        }

        const bodyNode = (toArray(body)[0] as CstNode) || {};
        const fullBodyStart = extractStartOffset(bodyNode);
        const fullBodyEnd = extractEndOffset(bodyNode);
        const bodySource = this.source.slice(fullBodyStart, fullBodyEnd);

        const openBraceIdx = bodySource.indexOf("{");
        const closeBraceIdx = bodySource.lastIndexOf("}");

        const bodyStartOff = openBraceIdx >= 0
            ? fullBodyStart + openBraceIdx + 1
            : fullBodyStart;
        const bodyEndOff = closeBraceIdx >= 0
            ? fullBodyStart + closeBraceIdx
            : fullBodyEnd;

        const typeName = extractTypeName(children, isEnum);
        let enumConstants: MemberInfo[] = [];
        if (isEnum) {
            enumConstants = extractEnumConstants(bodyNode, this.source);
        }

        const ordinaryMembers = this.collectClassMembers(bodyNode, typeName, bodyStartOff, isEnum ? "enum" : "class");
        const allMembers = [...enumConstants, ...ordinaryMembers];

        this.classes.push({
            name: typeName,
            bodyStart: bodyStartOff,
            bodyEnd: bodyEndOff,
            members: allMembers,
        });
    }

    private processInterface(node: CstNode): void {
        let children = node.children || node;

        if (children.normalInterfaceDeclaration) {
            const nid = toArray(children.normalInterfaceDeclaration)[0] as CstNode;
            if (nid) {
                children = nid.children || nid;
            }
        }

        const body = children.interfaceBody;
        if (!body) {
            return;
        }

        const bodyNode = (toArray(body)[0] as CstNode) || {};
        const fullBodyStart = extractStartOffset(bodyNode);
        const fullBodyEnd = extractEndOffset(bodyNode);
        const bodySource = this.source.slice(fullBodyStart, fullBodyEnd);

        const openBraceIdx = bodySource.indexOf("{");
        const closeBraceIdx = bodySource.lastIndexOf("}");

        const bodyStartOff = openBraceIdx >= 0
            ? fullBodyStart + openBraceIdx + 1
            : fullBodyStart;
        const bodyEndOff = closeBraceIdx >= 0
            ? fullBodyStart + closeBraceIdx
            : fullBodyEnd;

        const typeName = extractTypeName(node, false);
        const members = this.collectClassMembers(bodyNode, typeName, bodyStartOff, "interface");

        this.classes.push({
            name: typeName,
            bodyStart: bodyStartOff,
            bodyEnd: bodyEndOff,
            members,
        });
    }
}

/**
 * 提取节点的起始字节偏移量
 */
function extractStartOffset(node: CstNode): number {
    if (node.location?.startOffset !== undefined) {
        return node.location.startOffset;
    }
    const children = node.children || node;
    for (const key of Object.keys(children)) {
        const arr = toArray(children[key]);
        for (const item of arr) {
            const offset = extractStartOffset(item as CstNode);
            if (offset !== undefined) {
                return offset;
            }
        }
    }
    return 0;
}

/**
 * 提取节点的结束字节偏移量（非包容性）
 */
function extractEndOffset(node: CstNode): number {
    if (node.location?.endOffset !== undefined) {
        return node.location.endOffset + 1;
    }
    const children = node.children || node;
    let lastOffset = 0;
    for (const key of Object.keys(children)) {
        const arr = toArray(children[key]);
        for (const item of arr) {
            const offset = extractEndOffset(item as CstNode);
            if (offset > lastOffset) {
                lastOffset = offset;
            }
        }
    }
    return lastOffset;
}

/**
 * 提取修饰符数组中的可见性类型
 */
function extractVisibility(
    modifiers: unknown[],
    contextType: "class" | "interface" | "enum"
): Visibility {
    if (!modifiers || !Array.isArray(modifiers)) {
        return contextType === "interface" ? Visibility.PUBLIC : Visibility.PACKAGE;
    }
    for (const modifier of modifiers) {
        const m = modifier as CstNode;
        const mChildren = m.children || m;
        if (mChildren.publicKeyword || mChildren.Public) {
            return Visibility.PUBLIC;
        }
        if (mChildren.protectedKeyword || mChildren.Protected) {
            return Visibility.PROTECTED;
        }
        if (mChildren.privateKeyword || mChildren.Private) {
            return Visibility.PRIVATE;
        }
    }
    return contextType === "interface" ? Visibility.PUBLIC : Visibility.PACKAGE;
}

/**
 * 提取修饰符数组是否含有 static
 */
function extractStatic(modifiers: unknown[]): boolean {
    if (!modifiers || !Array.isArray(modifiers)) {
        return false;
    }
    for (const modifier of modifiers) {
        const m = modifier as CstNode;
        const mChildren = m.children || m;
        if (mChildren.staticKeyword || mChildren.Static) {
            return true;
        }
    }
    return false;
}

/**
 * 提取修饰符数组是否含有 abstract
 */
function extractAbstract(modifiers: unknown[]): boolean {
    if (!modifiers || !Array.isArray(modifiers)) {
        return false;
    }
    for (const modifier of modifiers) {
        const m = modifier as CstNode;
        const mChildren = m.children || m;
        if (mChildren.abstractKeyword || mChildren.Abstract) {
            return true;
        }
    }
    return false;
}

/**
 * 提取类/接口/枚举的声明名称
 */
function extractTypeName(node: CstNode, isEnum: boolean): string {
    const children = node.children || node;
    if (isEnum) {
        const typeId = children.typeIdentifier || children.enumName;
        if (typeId) {
            const id = toArray(typeId)[0] as CstNode;
            if (id) {
                return extractIdentifierName(id);
            }
        }
    } else {
        const typeId = children.typeIdentifier || children.className || children.interfaceName;
        if (typeId) {
            const id = toArray(typeId)[0] as CstNode;
            if (id) {
                return extractIdentifierName(id);
            }
        }
    }

    for (const key of ["Identifier", "typeIdentifier"]) {
        if (children[key]) {
            const arr = toArray(children[key]);
            for (const item of arr) {
                const name = extractIdentifierName(item as CstNode);
                if (name) {
                    return name;
                }
            }
        }
    }
    return "<anonymous>";
}

/**
 * 从标识符节点中解析出字符串形式的名称
 */
function extractIdentifierName(node: CstNode): string {
    if (node.image) {
        return node.image;
    }
    const children = node.children || node;
    const ident = children.Identifier;
    if (ident) {
        const arr = toArray(ident);
        for (const item of arr) {
            const id = item as CstNode;
            if (id.image) {
                return id.image;
            }
            if (typeof id === "string") {
                return id;
            }
        }
    }
    return "";
}

/**
 * 从方法声明节点中下潜提取方法名称
 */
function extractMethodName(node: CstNode): string {
    const children = node.children || node;

    if (children.methodHeader) {
        const header = toArray(children.methodHeader)[0] as CstNode;
        if (header) {
            const headerChildren = header.children || header;
            if (headerChildren.methodDeclarator) {
                const declarator = toArray(headerChildren.methodDeclarator)[0] as CstNode;
                if (declarator) {
                    const declChildren = declarator.children || declarator;
                    if (declChildren.Identifier) {
                        const ident = toArray(declChildren.Identifier)[0] as CstNode;
                        if (ident) {
                            return extractIdentifierName(ident);
                        }
                    }
                }
            }
        }
    }

    const ident = children.Identifier || children.methodName;
    if (ident) {
        const id = toArray(ident)[0] as CstNode;
        if (id) {
            return extractIdentifierName(id);
        }
    }
    return "";
}

/**
 * 从构造方法节点中下潜提取类构造名称
 */
function extractConstructorName(node: CstNode): string {
    const children = node.children || node;

    if (children.constructorDeclarator) {
        const declarator = toArray(children.constructorDeclarator)[0] as CstNode;
        if (declarator) {
            const declChildren = declarator.children || declarator;
            if (declChildren.simpleTypeName) {
                const simpleType = toArray(declChildren.simpleTypeName)[0] as CstNode;
                if (simpleType) {
                    const stChildren = simpleType.children || simpleType;
                    if (stChildren.Identifier) {
                        const ident = toArray(stChildren.Identifier)[0] as CstNode;
                        if (ident) {
                            return extractIdentifierName(ident);
                        }
                    }
                }
            }
        }
    }
    return "";
}

/**
 * 从方法/构造函数节点中下潜计算形参数量
 */
function extractParamCount(node: CstNode, source: string): number {
    const children = node.children || node;
    let declarator: CstNode | undefined;

    if (children.methodHeader) {
        const header = toArray(children.methodHeader)[0] as CstNode;
        if (header) {
            const headerChildren = header.children || header;
            if (headerChildren.methodDeclarator) {
                declarator = toArray(headerChildren.methodDeclarator)[0] as CstNode;
            }
        }
    } else if (children.constructorDeclarator) {
        declarator = toArray(children.constructorDeclarator)[0] as CstNode;
    }

    if (declarator) {
        const start = extractStartOffset(declarator);
        const end = extractEndOffset(declarator);
        const text = source.slice(start, end);
        
        const parenStart = text.indexOf("(");
        const parenEnd = text.lastIndexOf(")");
        if (parenStart !== -1 && parenEnd !== -1 && parenEnd > parenStart) {
            const paramsText = text.slice(parenStart + 1, parenEnd).trim();
            if (paramsText === "") {
                return 0;
            }
            return countOuterCommas(paramsText) + 1;
        }
    }
    return 0;
}

/**
 * 统计圆括号与尖括号外层的逗号数量
 */
function countOuterCommas(paramsText: string): number {
    let commas = 0;
    let angleDepth = 0;
    let parenDepth = 0;
    
    for (let i = 0; i < paramsText.length; i++) {
        const char = paramsText[i];
        if (char === "<") {
            angleDepth++;
        } else if (char === ">") {
            angleDepth--;
        } else if (char === "(") {
            parenDepth++;
        } else if (char === ")") {
            parenDepth--;
        } else if (char === "," && angleDepth === 0 && parenDepth === 0) {
            commas++;
        }
    }
    return commas;
}

/**
 * 构建字段的 MemberInfo 元数据结构
 */
function makeFieldInfo(
    node: CstNode,
    source: string,
    declStart: number,
    declEnd: number,
    contextType: "class" | "interface" | "enum"
): MemberInfo | null {
    const children = node.children || node;
    const modifiers = toArray(children.modifier || []);
    const visibility = extractVisibility(modifiers, contextType);
    const isStatic = extractStatic(modifiers);

    const varDeclList = children.variableDeclaratorList;
    if (!varDeclList) {
        return null;
    }
    const vdl = toArray(varDeclList)[0] as CstNode;
    if (!vdl) {
        return null;
    }
    const vdlChildren = vdl.children || vdl;
    const varDeclarators = vdlChildren.variableDeclarator;
    if (!varDeclarators) {
        return null;
    }
    const firstDecl = toArray(varDeclarators)[0] as CstNode;
    if (!firstDecl) {
        return null;
    }
    const fdChildren = firstDecl.children || firstDecl;
    const varDeclId = fdChildren.variableDeclaratorId;
    if (!varDeclId) {
        return null;
    }
    const vid = toArray(varDeclId)[0] as CstNode;
    const fieldName = vid ? extractIdentifierName(vid) : "";

    return {
        type: MemberType.FIELD,
        start: declStart,
        end: declEnd,
        name: fieldName,
        visibility,
        isStatic,
        paramCount: 0,
        nestedKind: undefined,
        isAbstract: false,
        fullText: source.slice(declStart, declEnd),
    };
}

/**
 * 构建方法的 MemberInfo 元数据结构
 */
function makeMethodInfo(
    node: CstNode,
    source: string,
    declStart: number,
    declEnd: number,
    isConstructor: boolean,
    contextType: "class" | "interface" | "enum"
): MemberInfo | null {
    const children = node.children || node;
    const modifiers = toArray(children.modifier || []);
    const visibility = extractVisibility(modifiers, contextType);
    const isStatic = extractStatic(modifiers);
    const isAbstract = extractAbstract(modifiers);
    const name = isConstructor ? extractConstructorName(node) : extractMethodName(node);
    const paramCount = extractParamCount(node, source);

    return {
        type: isConstructor ? MemberType.CONSTRUCTOR : MemberType.METHOD,
        start: declStart,
        end: declEnd,
        name: name || (isConstructor ? "<init>" : "<unknown>"),
        visibility,
        isStatic,
        paramCount,
        nestedKind: undefined,
        isAbstract,
        fullText: source.slice(declStart, declEnd),
    };
}

/**
 * 构建构造函数的 MemberInfo 元数据结构
 */
function makeConstructorInfo(
    node: CstNode,
    source: string,
    declStart: number,
    declEnd: number,
    contextType: "class" | "interface" | "enum"
): MemberInfo | null {
    const children = node.children || node;
    const modifiers = toArray(children.modifier || []);
    const visibility = extractVisibility(modifiers, contextType);
    const paramCount = extractParamCount(node, source);
    const ctorName = extractConstructorName(node);

    return {
        type: MemberType.CONSTRUCTOR,
        start: declStart,
        end: declEnd,
        name: ctorName || "<init>",
        visibility,
        isStatic: false,
        paramCount,
        nestedKind: undefined,
        isAbstract: false,
        fullText: source.slice(declStart, declEnd),
    };
}

/**
 * 构建嵌套类型声明的 MemberInfo 元数据结构
 */
function makeNestedTypeInfo(
    node: CstNode,
    source: string,
    declStart: number,
    declEnd: number,
    kind: "class" | "interface" | "enum" | "record" | "annotation",
    parentName: string,
    contextType: "class" | "interface" | "enum"
): MemberInfo | null {
    const children = node.children || node;
    const modifiers = toArray(children.modifier || []);
    const visibility = extractVisibility(modifiers, contextType);
    const isStatic = extractStatic(modifiers);
    
    const text = source.slice(declStart, declEnd);
    const details = extractNestedTypeDetails(text);

    return {
        type: MemberType.NESTED_TYPE,
        start: declStart,
        end: declEnd,
        name: details.name,
        visibility,
        isStatic,
        paramCount: 0,
        nestedKind: details.kind,
        isAbstract: false,
        fullText: text,
    };
}

/**
 * 提取枚举体的成员常量声明
 */
function extractEnumConstants(enumBodyNode: CstNode, source: string): MemberInfo[] {
    const children = enumBodyNode.children || enumBodyNode;
    const enumConstantList = children.enumConstantList;
    if (!enumConstantList) {
        return [];
    }

    const constants: MemberInfo[] = [];
    const list = toArray(enumConstantList);

    for (const item of list) {
        const ecl = item as CstNode;
        const eclChildren = ecl.children || ecl;
        const enumConstants = eclChildren.enumConstant;
        if (enumConstants) {
            for (const ec of toArray(enumConstants)) {
                const e = ec as CstNode;
                const startOff = extractStartOffset(e);
                const endOff = extractEndOffset(e);

                const ecChildren = e.children || e;
                const ident = ecChildren.Identifier;
                let constName = "";
                if (ident) {
                    const id = toArray(ident)[0] as CstNode;
                    if (id) {
                        constName = extractIdentifierName(id);
                    }
                }

                constants.push({
                    type: MemberType.ENUM_CONSTANT,
                    start: startOff,
                    end: endOff,
                    name: constName,
                    visibility: Visibility.PUBLIC,
                    isStatic: true,
                    paramCount: 0,
                    nestedKind: undefined,
                    isAbstract: false,
                    fullText: source.slice(startOff, endOff),
                });
            }
        }
    }
    return constants;
}

/**
 * 向上回溯包含成员的前导关联注释与换行
 */
function extendStartOffsetToIncludeComments(
    source: string,
    startOffset: number,
    minOffset: number
): number {
    let current = startOffset;

    while (current > minOffset) {
        let prevCharIdx = current - 1;
        while (prevCharIdx >= minOffset && /\s/.test(source[prevCharIdx])) {
            prevCharIdx--;
        }

        if (prevCharIdx < minOffset) {
            break;
        }

        if (source[prevCharIdx] === "/" && source[prevCharIdx - 1] === "*") {
            let commentStart = prevCharIdx - 2;
            while (commentStart >= minOffset) {
                if (source[commentStart] === "*" && source[commentStart - 1] === "/") {
                    commentStart--;
                    break;
                }
                commentStart--;
            }
            if (commentStart >= minOffset) {
                current = commentStart;
                continue;
            }
        }

        let lineStart = prevCharIdx;
        while (lineStart >= minOffset && source[lineStart] !== "\n" && source[lineStart] !== "\r") {
            lineStart--;
        }
        lineStart++;

        const lineText = source.slice(lineStart, prevCharIdx + 1).trim();
        if (lineText.startsWith("//")) {
            current = lineStart;
            continue;
        }
        break;
    }
    return current;
}

/**
 * 判断文本段是否是 Record 声明
 */
function isParsedAsMethodButActuallyRecord(source: string, declStart: number, declEnd: number): boolean {
    const text = source.slice(declStart, declEnd);
    return /\brecord\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(text);
}

/**
 * 从嵌套声明文本中提取类型种类与名称
 */
function extractNestedTypeDetails(text: string): { kind: "class" | "interface" | "enum" | "record" | "annotation"; name: string } {
    const annotationMatch = /@interface\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
    if (annotationMatch) {
        return { kind: "annotation", name: annotationMatch[1] };
    }
    const interfaceMatch = /\binterface\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
    if (interfaceMatch) {
        return { kind: "interface", name: interfaceMatch[1] };
    }
    const enumMatch = /\benum\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
    if (enumMatch) {
        return { kind: "enum", name: enumMatch[1] };
    }
    const recordMatch = /\brecord\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
    if (recordMatch) {
        return { kind: "record", name: recordMatch[1] };
    }
    const classMatch = /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
    if (classMatch) {
        return { kind: "class", name: classMatch[1] };
    }
    return { kind: "class", name: "<anonymous>" };
}
