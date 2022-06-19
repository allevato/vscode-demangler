// Copyright 2022 Tony Allevato
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as vscode from "vscode";
import { DemanglerCore, DemangledDocumentSymbol } from "./demangler_core";

/**
 * Copies the demangled form of the mangled sybol at the current cursor
 * position.
 */
export class DemanglingCopier {
  /**
   * The demangled symbol at the current cursor location in the active editor.
   */
  private activeDemangledSymbol: DemangledDocumentSymbol | undefined;

  constructor(private demanglerCore: DemanglerCore) {}

  // Registers listeners for the "Copy As > Demangled Symbol" command and to
  // detect when the active selection changes.
  public async activate(context: vscode.ExtensionContext) {
    vscode.commands.registerTextEditorCommand(
      "demangler.copyDemangledSymbol",
      async (textEditor, edit) => {
        await this.copyDemangledSymbol();
      }
    );

    // Track the mangled symbol under the cursor whenever the active editor
    // changes.
    vscode.window.onDidChangeActiveTextEditor(
      async (editor) => {
        if (editor) {
          await this.updateLine(editor.document, editor.selections);
        }
      },
      null,
      context.subscriptions
    );

    // Track the mangled symbol under the cursor whenever the current selection
    // changes.
    vscode.window.onDidChangeTextEditorSelection(
      async (event) => {
        await this.updateLine(event.textEditor.document, event.selections);
      },
      null,
      context.subscriptions
    );

    // If an editor is active at the time of this call, process it right away.
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      await this.updateLine(activeEditor.document, activeEditor.selections);
    }
  }

  /**
   * Updates the currently active symbol from the selections of the given
   * document.
   *
   * @param document The currently active document.
   * @param selections The current selections in the active document.
   */
  private async updateLine(
    document: vscode.TextDocument,
    selections: readonly vscode.Selection[]
  ) {
    if (selections.length !== 1) {
      return;
    }
    if (!selections[0].isEmpty) {
      return;
    }
    const position = selections[0].active;
    const line = document.lineAt(position);
    const activeLineSymbols = await this.demanglerCore.demangleSymbolsInRanges(
      document,
      [line.range]
    );

    this.activeDemangledSymbol = activeLineSymbols.find((element) => {
      return element.range.contains(position);
    });
  }

  /**
   * Copies the demangled symbol at the current cursor position to the
   * clipboard, or displays a warning message if the cursor is not on a symbol.
   */
  private async copyDemangledSymbol() {
    if (!this.activeDemangledSymbol) {
      vscode.window.showWarningMessage(
        "No mangled symbol found at the current cursor location."
      );
    } else {
      await vscode.env.clipboard.writeText(
        this.activeDemangledSymbol.result.demangled
      );
    }
  }
}
