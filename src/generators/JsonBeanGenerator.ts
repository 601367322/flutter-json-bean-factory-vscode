import * as vscode from 'vscode';
import { JsonParser } from '../parsers/JsonParser';
import { ProjectManager } from '../services/ProjectManager';
import { CodeGenerationOrchestrator } from '../services/CodeGenerationOrchestrator';
import { JsonInputDialog } from '../ui/JsonInputDialog';

export class JsonBeanGenerator {
    private jsonParser: JsonParser;
    private projectManager: ProjectManager;
    private orchestrator: CodeGenerationOrchestrator;
    private context?: vscode.ExtensionContext;

    constructor(context?: vscode.ExtensionContext) {
        this.jsonParser = new JsonParser();
        this.projectManager = new ProjectManager();
        this.orchestrator = new CodeGenerationOrchestrator();
        this.context = context;
    }

    /**
     * Generate Dart bean from JSON input
     */
    async generateFromJson(uri?: vscode.Uri): Promise<void> {
        try {
            // Check if this is a Flutter project
            if (!await this.projectManager.isFlutterProject()) {
                vscode.window.showWarningMessage('This command only works in Flutter projects.');
                return;
            }

            // Show enhanced input dialog
            const dialog = new JsonInputDialog(this.context!);
            const result = await dialog.show();

            if (!result) {
                return;
            }

            // Update generator config with dialog settings
            this.orchestrator.updateGeneratorConfig(result.settings);

            // Parse JSON and generate classes
            const rootClass = this.jsonParser.parseJson(result.jsonString, result.className);
            const allClasses = this.jsonParser.getAllClasses(rootClass);

            // Generate and save files
            await this.orchestrator.generateAndSaveFiles(allClasses, uri);

            vscode.window.showInformationMessage(
                `Successfully generated ${allClasses.length} Dart class(es) for ${result.className}`
            );

        } catch (error) {
            vscode.window.showErrorMessage(`Error generating Dart bean: ${error}`);
        }
    }

    /**
     * Regenerate existing Dart bean from existing entity file (original plugin style)
     */
    async regenerateBean(uri: vscode.Uri): Promise<void> {
        try {
            // Check if this is a Flutter project
            if (!await this.projectManager.isFlutterProject()) {
                vscode.window.showWarningMessage('This command only works in Flutter projects.');
                return;
            }

            // Simply call regenerateAllBeans since original plugin regenerates all files
            // when Alt+J is pressed, regardless of which file is active
            await this.regenerateAllBeans();
        } catch (error) {
            vscode.window.showErrorMessage(`Error regenerating Dart bean: ${error}`);
        }
    }

    /**
     * Regenerate all existing Dart beans (equivalent to Alt+J in original plugin)
     * Based on original plugin logic: scan all @JsonSerializable files and regenerate everything
     */
    async regenerateAllBeans(): Promise<void> {
        try {
            // Check if this is a Flutter project
            if (!await this.projectManager.isFlutterProject()) {
                vscode.window.showWarningMessage('This command only works in Flutter projects.');
                return;
            }

            // Delegate to orchestrator
            await this.orchestrator.regenerateAllBeans();

        } catch (error) {
            vscode.window.showErrorMessage(`Error regenerating all Dart beans: ${error}`);
        }
    }
}
