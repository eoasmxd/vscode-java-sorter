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
        const expectedText = fs.readFileSync(path.join(fixturesDir, "expected/ComprehensiveClassTest.expected.java"), "utf-8");

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
    try {
        const originalText = fs.readFileSync(path.join(fixturesDir, "original/ComprehensiveInterfaceTest.java"), "utf-8");
        const expectedText = fs.readFileSync(path.join(fixturesDir, "expected/ComprehensiveInterfaceTest.expected.java"), "utf-8");

        const config: SortConfiguration = {
            memberOrder: ["types", "staticFields", "staticInitializers", "staticMethods", "fields", "initializers", "constructors", "methods"],
            visibilityOrder: ["public", "protected", "package", "private"], // 启用可见性排序
            sortAllMembers: true
        };

        const result = sortSourceCode(originalText, config);
        assert.strictEqual(result.replace(/\r\n/g, "\n"), expectedText.replace(/\r\n/g, "\n"));
        console.log("✅ [PASSED]: ComprehensiveInterfaceTest");
        passed++;
    } catch (err) {
        console.error("❌ [FAILED]: ComprehensiveInterfaceTest");
        console.error(err);
        failed++;
    }

    console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}

runAllTests();
