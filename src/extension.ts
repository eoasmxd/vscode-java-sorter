import * as vscode from "vscode";
import { sortSourceCode } from "./writer/text-reconstructor";
import { DEFAULT_SORT_CONFIG } from "./types";

/**
 * 注册类成员排序命令
 */
export function activate(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand(
        "vscode-java-sorter.sort-members",
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage(vscode.l10n.t("Java Sorter: No active editor found."));
                return;
            }

            const document = editor.document;
            if (document.languageId !== "java") {
                vscode.window.showWarningMessage(
                    vscode.l10n.t("Java Sorter: The active file is not a Java file.")
                );
                return;
            }

            try {
                const originalSource = document.getText();
                const workspaceConfig = vscode.workspace.getConfiguration("javaSorter");
                const sortConfig = {
                    sortFields: workspaceConfig.get<boolean>("sortFields", false),
                    sortConstants: workspaceConfig.get<boolean>("sortConstants", false),
                    sortInitializers: workspaceConfig.get<boolean>("sortInitializers", false),
                    sortByVisibility: workspaceConfig.get<boolean>("sortByVisibility", false),
                    distinguishStaticMethods: workspaceConfig.get<boolean>("distinguishStaticMethods", true),
                    distinguishConstructors: workspaceConfig.get<boolean>("distinguishConstructors", true),
                };
                const sortedCode = sortSourceCode(originalSource, sortConfig);

                if (sortedCode === originalSource) {
                    vscode.window.showInformationMessage(
                        vscode.l10n.t("Java Sorter: Member order is already sorted.")
                    );
                    return;
                }

                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(originalSource.length)
                );

                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, fullRange, sortedCode);

                const applied = await vscode.workspace.applyEdit(edit);
                if (applied) {
                    vscode.window.showInformationMessage(
                        vscode.l10n.t("Java Sorter: Class members sorted successfully.")
                    );
                } else {
                    vscode.window.showErrorMessage(
                        vscode.l10n.t("Java Sorter: Failed to apply edits.")
                    );
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : String(err);
                vscode.window.showErrorMessage(
                    vscode.l10n.t("Java Sorter: Sorting failed - {0}", message)
                );
            }
        }
    );

    context.subscriptions.push(disposable);
}

/**
 * 注销清理
 */
export function deactivate(): void {
    // 暂无资源需要释放
}
