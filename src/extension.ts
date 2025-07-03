import * as vscode from 'vscode';
import { JsonBeanGenerator } from './generators/JsonBeanGenerator';
import { FlutterProjectDetector } from './utils/FlutterProjectDetector';

export function activate(context: vscode.ExtensionContext) {
    console.log('Flutter JSON Bean Factory extension is now active!');

    const generator = new JsonBeanGenerator();
    const projectDetector = new FlutterProjectDetector();

    // Register command for generating Dart bean from JSON
    const generateFromJsonCommand = vscode.commands.registerCommand(
        'flutter-json-bean-factory.generateFromJson',
        async (uri?: vscode.Uri) => {
            try {
                // Check if this is a Flutter project
                if (!await projectDetector.isFlutterProject()) {
                    vscode.window.showWarningMessage('This command only works in Flutter projects.');
                    return;
                }

                await generator.generateFromJson(uri);
            } catch (error) {
                vscode.window.showErrorMessage(`Error generating Dart bean: ${error}`);
            }
        }
    );

    // Register command for regenerating existing Dart bean
    const regenerateBeanCommand = vscode.commands.registerCommand(
        'flutter-json-bean-factory.regenerateBean',
        async () => {
            try {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showWarningMessage('No active editor found.');
                    return;
                }

                if (!await projectDetector.isFlutterProject()) {
                    vscode.window.showWarningMessage('This command only works in Flutter projects.');
                    return;
                }

                await generator.regenerateBean(activeEditor.document.uri);
            } catch (error) {
                vscode.window.showErrorMessage(`Error regenerating Dart bean: ${error}`);
            }
        }
    );

    context.subscriptions.push(generateFromJsonCommand, regenerateBeanCommand);

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Flutter JSON Bean Factory is ready! Use Alt+J to generate Dart beans from JSON.',
            'Learn More'
        ).then(selection => {
            if (selection === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/fluttercandies/FlutterJsonBeanFactory'));
            }
        });
        context.globalState.update('hasShownWelcome', true);
    }
}

export function deactivate() {
    console.log('Flutter JSON Bean Factory extension is now deactivated.');
}
