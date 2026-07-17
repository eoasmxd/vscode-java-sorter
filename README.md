# Java Sorter (Eclipse Style)

[English](README.md) | [中文](README.zh-CN.md)

VS Code Extension: Sorts class members of Java files **without formatting** them. The sorting rules are consistent with Eclipse's "Sort Members" feature.

## Sorting Rules

| Member Type | Sorted by Default | Sorting Method |
|-------------|:-----------------:|----------------|
| Fields      | ❌ No             | Keep in place (can be enabled in settings; supports visibility/alphabetical order) |
| Constants   | ❌ No             | Keep in place (can be enabled in settings; supports alphabetical order) |
| Initializers| ❌ No             | Keep in place (can be enabled in settings; static blocks sorted before instance blocks) |
| Constructors| ✅ Yes            | Ascending parameter count |
| Static Methods| ✅ Yes          | Descending visibility -> Alphabetical |
| Instance Methods| ✅ Yes        | Descending visibility -> Alphabetical |
| Nested Types| ✅ Yes            | Static first -> Class -> Interface -> Enum -> Alphabetical |

- Annotations and Javadoc comments preceding a member will move with it.
- Nested class members remain untouched and move as a whole with the outer class.
- Getter/setter methods receive no special treatment.
- You can customize all sorting toggles and detailed rules in VS Code **Settings** to fit your personal or team style.

## Installation & Build

### 1. Build & Package Commands

Run the following commands in the project root directory:

* **Package VSIX** (without global `vsce` installation):
  ```bash
  npm install
  npm run package
  ```
  *(This will compile TypeScript and generate the `vscode-java-sorter-${version}.vsix` package in the root directory)*

* **Clean Build Output**:
  ```bash
  npm run clean
  ```
  *(Removes the `out/` output directory and all `.vsix` packages)*

* **Compile Locally**:
  ```bash
  npm run compile
  ```

### 2. Manual Installation

After packaging the `.vsix` file, you can install it directly via the VS Code interface:
1. Open the VS Code Command Palette (`Ctrl+Shift+P`).
2. Search and select `Extensions: Install from VSIX...`.
3. Choose the generated `vscode-java-sorter-${version}.vsix` file to complete the installation.
4. Reload the VS Code Window (`Developer: Reload Window`) to apply changes.

## Usage

1. Open a Java file.
2. Open the Command Palette (`Ctrl+Shift+P`), search for "Java Sorter: Sort Members".
3. Execute the command to sort class members.

### Keyboard Shortcut Configuration

No default shortcut is pre-configured. You can bind one yourself:
1. Open `File -> Preferences -> Keyboard Shortcuts`.
2. Search for `vscode-java-sorter.sort-members`.
3. Click the edit button and press your preferred key combination (e.g., `Ctrl+Shift+S`).

## Extension Settings

Open VS Code Settings (`Ctrl+,`) and search for `javaSorter` to customize:

| Setting | Type | Default | Description |
|---------|:----:|:-------:|-------------|
| `javaSorter.sortFields` | `boolean` | `false` | Whether to sort class fields. |
| `javaSorter.sortConstants` | `boolean` | `false` | Whether to sort class constants (such as enum constants). |
| `javaSorter.sortInitializers` | `boolean` | `false` | Whether to sort static/instance initializers. |
| `javaSorter.sortByVisibility` | `boolean` | `false` | Whether to sort group members by visibility descending (Public -> Protected -> Package -> Private). |
| `javaSorter.distinguishStaticMethods` | `boolean` | `true` | Whether to distinguish static methods into a separate group. |
| `javaSorter.distinguishConstructors` | `boolean` | `true` | Whether to distinguish constructors into a separate group. |

## Technical Details

- **High-Fidelity Layout Preservation**: Perfectly preserves preceding comments (Javadoc, multi-line/single-line comments), leading indents, and original line spacings. It guarantees that the code formatting will not be cluttered or stuck together after sorting.
- **Eclipse Compatibility**: Aligns with the default sorting and priority logic of Eclipse JDT "Sort Members" feature.
- **System Integration**: Rewrites files based on the standard VS Code `WorkspaceEdit` API, integrating seamlessly with VS Code's native Undo/Redo mechanisms.

## License

This project is open-source under the [MIT](LICENSE) license.

For third-party dependency licenses, please refer to [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES).
