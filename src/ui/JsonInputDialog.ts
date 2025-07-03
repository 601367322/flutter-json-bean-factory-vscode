import * as vscode from 'vscode';

export interface JsonInputSettings {
    isOpenNullable?: boolean;
    setDefault?: boolean;
    stringDefaultValue?: string;
    intDefaultValue?: string;
    boolDefaultValue?: string;
    listDefaultValue?: string;
}

export interface JsonInputResult {
    className: string;
    jsonString: string;
    settings: JsonInputSettings;
}

export class JsonInputDialog {
    private panel: vscode.WebviewPanel;
    private settings: JsonInputSettings;

    constructor(private context: vscode.ExtensionContext) {
        this.settings = this.loadSettings();
        this.panel = vscode.window.createWebviewPanel(
            'jsonInputDialog',
            'Generate Dart Bean from JSON',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
    }

    public async show(): Promise<JsonInputResult | undefined> {
        return new Promise((resolve) => {
            this.panel.webview.html = this.getWebviewContent();
            
            // Handle messages from webview
            this.panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'generate':
                            this.saveSettings(message.settings);
                            resolve({
                                className: message.className,
                                jsonString: message.jsonString,
                                settings: message.settings
                            });
                            this.panel.dispose();
                            break;
                        case 'cancel':
                            resolve(undefined);
                            this.panel.dispose();
                            break;
                        case 'format':
                            this.handleFormatJSON(message.jsonString);
                            break;
                        case 'settingsChanged':
                            this.settings = { ...this.settings, ...message.settings };
                            break;
                    }
                },
                undefined,
                this.context.subscriptions
            );

            // Handle panel disposal
            this.panel.onDidDispose(() => {
                resolve(undefined);
            });
        });
    }

    private loadSettings(): JsonInputSettings {
        const config = vscode.workspace.getConfiguration('flutter-json-bean-factory');
        return {
            isOpenNullable: config.get('isOpenNullable', false),
            setDefault: config.get('setDefault', true),
            stringDefaultValue: config.get('stringDefaultValue', "''"),
            intDefaultValue: config.get('intDefaultValue', '0'),
            boolDefaultValue: config.get('boolDefaultValue', 'false'),
            listDefaultValue: config.get('listDefaultValue', '[]')
        };
    }

    private saveSettings(settings: JsonInputSettings): void {
        const config = vscode.workspace.getConfiguration('flutter-json-bean-factory');
        config.update('isOpenNullable', settings.isOpenNullable, vscode.ConfigurationTarget.Global);
        config.update('setDefault', settings.setDefault, vscode.ConfigurationTarget.Global);
        config.update('stringDefaultValue', settings.stringDefaultValue, vscode.ConfigurationTarget.Global);
        config.update('intDefaultValue', settings.intDefaultValue, vscode.ConfigurationTarget.Global);
        config.update('boolDefaultValue', settings.boolDefaultValue, vscode.ConfigurationTarget.Global);
        config.update('listDefaultValue', settings.listDefaultValue, vscode.ConfigurationTarget.Global);
    }

    private handleFormatJSON(jsonString: string): void {
        try {
            const parsed = JSON.parse(jsonString);
            const formatted = JSON.stringify(parsed, null, 2);
            this.panel.webview.postMessage({
                command: 'updateJson',
                jsonString: formatted
            });
        } catch (error) {
            vscode.window.showErrorMessage('Invalid JSON format');
        }
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generate Dart Bean from JSON</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="text"], textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 2px;
            box-sizing: border-box;
        }
        textarea {
            min-height: 200px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            resize: vertical;
        }
        .settings-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 15px 0;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        .checkbox-container {
            display: flex;
            gap: 20px;
        }
        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            font-weight: normal;
        }
        .default-values {
            margin: 15px 0;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        .default-values h4 {
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
        }
        .default-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }
        .default-row label {
            min-width: 60px;
            margin-bottom: 0;
            font-weight: normal;
        }
        .default-row input {
            width: 80px;
        }
        .button-container {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
        }
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: var(--vscode-font-size);
        }
        .primary-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .secondary-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
        }
        .format-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            padding: 6px 12px;
        }
        button:hover {
            opacity: 0.8;
        }
        .error {
            color: var(--vscode-errorForeground);
            font-size: 12px;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Generate Dart Bean from JSON</h2>
        
        <div class="form-group">
            <label for="className">Class Name:</label>
            <input type="text" id="className" placeholder="User" />
            <div id="classNameError" class="error"></div>
        </div>
        
        <div class="form-group">
            <label for="jsonInput">JSON Text:</label>
            <textarea id="jsonInput" placeholder='{"name": "John", "age": 30}'></textarea>
            <div id="jsonError" class="error"></div>
        </div>
        
        <div class="settings-container">
            <div class="checkbox-container">
                <label class="checkbox-label">
                    <input type="checkbox" id="nullableCheckbox" ${this.settings.isOpenNullable ? 'checked' : ''} />
                    null-able
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="defaultValueCheckbox" ${this.settings.setDefault ? 'checked' : ''} />
                    default value
                </label>
            </div>
            <button class="format-button" onclick="formatJSON()">Format</button>
        </div>
        
        <div id="defaultValues" class="default-values" style="display: ${this.settings.setDefault ? 'block' : 'none'}">
            <h4>Default Values:</h4>
            <div class="default-row">
                <label>String:</label>
                <input type="text" id="stringDefault" value="${this.settings.stringDefaultValue || "''"}" />
            </div>
            <div class="default-row">
                <label>int:</label>
                <input type="text" id="intDefault" value="${this.settings.intDefaultValue || '0'}" />
            </div>
            <div class="default-row">
                <label>bool:</label>
                <input type="text" id="boolDefault" value="${this.settings.boolDefaultValue || 'false'}" />
            </div>
            <div class="default-row">
                <label>List:</label>
                <input type="text" id="listDefault" value="${this.settings.listDefaultValue || '[]'}" />
            </div>
        </div>
        
        <div class="button-container">
            <button class="secondary-button" onclick="cancel()">Cancel</button>
            <button class="primary-button" onclick="generate()">Generate</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Handle default value checkbox
        document.getElementById('defaultValueCheckbox').addEventListener('change', function() {
            const defaultValues = document.getElementById('defaultValues');
            defaultValues.style.display = this.checked ? 'block' : 'none';
            
            vscode.postMessage({
                command: 'settingsChanged',
                settings: { setDefault: this.checked }
            });
        });
        
        // Handle nullable checkbox
        document.getElementById('nullableCheckbox').addEventListener('change', function() {
            vscode.postMessage({
                command: 'settingsChanged',
                settings: { isOpenNullable: this.checked }
            });
        });
        
        function formatJSON() {
            const jsonInput = document.getElementById('jsonInput');
            vscode.postMessage({
                command: 'format',
                jsonString: jsonInput.value
            });
        }
        
        function cancel() {
            vscode.postMessage({ command: 'cancel' });
        }
        
        function generate() {
            const className = document.getElementById('className').value.trim();
            const jsonString = document.getElementById('jsonInput').value.trim();
            
            // Clear previous errors
            document.getElementById('classNameError').textContent = '';
            document.getElementById('jsonError').textContent = '';
            
            // Validate inputs
            let hasError = false;
            
            if (!className) {
                document.getElementById('classNameError').textContent = 'Class name cannot be empty';
                hasError = true;
            } else if (!/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
                document.getElementById('classNameError').textContent = 'Class name must start with uppercase letter and contain only letters and numbers';
                hasError = true;
            }
            
            if (!jsonString) {
                document.getElementById('jsonError').textContent = 'JSON string cannot be empty';
                hasError = true;
            } else {
                try {
                    JSON.parse(jsonString);
                } catch (e) {
                    document.getElementById('jsonError').textContent = 'Invalid JSON format';
                    hasError = true;
                }
            }
            
            if (hasError) {
                return;
            }
            
            // Collect settings
            const settings = {
                isOpenNullable: document.getElementById('nullableCheckbox').checked,
                setDefault: document.getElementById('defaultValueCheckbox').checked,
                stringDefaultValue: document.getElementById('stringDefault').value,
                intDefaultValue: document.getElementById('intDefault').value,
                boolDefaultValue: document.getElementById('boolDefault').value,
                listDefaultValue: document.getElementById('listDefault').value
            };
            
            vscode.postMessage({
                command: 'generate',
                className: className,
                jsonString: jsonString,
                settings: settings
            });
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'updateJson':
                    document.getElementById('jsonInput').value = message.jsonString;
                    break;
            }
        });
        
        // Focus on class name input if empty, otherwise focus on JSON input
        window.addEventListener('load', () => {
            const classNameInput = document.getElementById('className');
            const jsonInput = document.getElementById('jsonInput');
            
            if (!classNameInput.value) {
                classNameInput.focus();
            } else {
                jsonInput.focus();
            }
        });
    </script>
</body>
</html>`;
    }
}
