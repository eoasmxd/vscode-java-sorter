import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { sortSourceCode } from "../writer/text-reconstructor";
import { SortConfiguration } from "../types";

// 单元测试总入口
function runAllTests() {
    console.log("🚀 Starting Java Sorter Unit Tests...");
    let passed = 0;
    let failed = 0;

    const fixturesDir = path.join(__dirname, "../../test/fixtures");
    
    // 用例 1: ComprehensiveClassTest 排序验证
    let originalText = "";
    let config: SortConfiguration = {
        memberOrder: ["types", "staticFields", "staticInitializers", "staticMethods", "fields", "initializers", "constructors", "methods"],
        visibilityOrder: [],
        sortAllMembers: true
    };
    try {
        originalText = fs.readFileSync(path.join(fixturesDir, "original/ComprehensiveClassTest.java"), "utf-8");
        const expectedText = fs.readFileSync(path.join(fixturesDir, "expected/ComprehensiveClassTest.java"), "utf-8");

        const result = sortSourceCode(originalText, config);
        assert.strictEqual(result.replace(/\r\n/g, "\n"), expectedText.replace(/\r\n/g, "\n"));
        console.log("✅ [PASSED]: ComprehensiveClassTest");
        passed++;
    } catch (err) {
        console.error("❌ [FAILED]: ComprehensiveClassTest");
        console.error(err);
        failed++;
    }

    // 用例 2: ComprehensiveInterfaceTest 可见性推导排序验证
    let originalText2 = "";
    try {
        originalText2 = fs.readFileSync(path.join(fixturesDir, "original/ComprehensiveInterfaceTest.java"), "utf-8");
        const expectedText = fs.readFileSync(path.join(fixturesDir, "expected/ComprehensiveInterfaceTest.java"), "utf-8");

        const config: SortConfiguration = {
            memberOrder: ["types", "staticFields", "staticInitializers", "staticMethods", "fields", "initializers", "constructors", "methods"],
            visibilityOrder: ["public", "protected", "package", "private"], // 启用可见性排序
            sortAllMembers: true
        };

        const result = sortSourceCode(originalText2, config);
        assert.strictEqual(result.replace(/\r\n/g, "\n"), expectedText.replace(/\r\n/g, "\n"));
        console.log("✅ [PASSED]: ComprehensiveInterfaceTest");
        passed++;
    } catch (err) {
        console.error("❌ [FAILED]: ComprehensiveInterfaceTest");
        try {
            const { parseJavaClasses } = require("../parser");
            const parsed = parseJavaClasses(originalText2);
            if (parsed && parsed[0]) {
                console.log("\n=== Interface Debug Members Info ===");
                parsed[0].members.forEach((m: any) => {
                    console.log(`- Name: "${m.name}", Type: ${m.type}, visibility: ${m.visibility}, paramCount: ${m.paramCount}`);
                });
                console.log("====================================\n");
            }
        } catch (e) {}
        console.error(err);
        failed++;
    }

    console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}

runAllTests();
