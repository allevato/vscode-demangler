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
import { DemanglerCore } from "./demangler_core";

/**
 * Finds mangled symbols in a text editor and decorates them with their
 * demangled names.
 */
export class DemanglingDecorator {
  /** The decoration type used to represent demangled symbols in the editor. */
  private decorationType: vscode.TextEditorDecorationType;

  /** Used to throttle decorations during scrolling. */
  private changeVisibleRangesTimer: NodeJS.Timeout | null = null;

  constructor(private demanglerCore: DemanglerCore) {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        // TODO(allevato): Make the appearance a bit more customizable?
        backgroundColor: new vscode.ThemeColor("input.background"),
        color: new vscode.ThemeColor("input.foreground"),
        fontStyle: "normal",
        fontWeight: "normal",
        margin: "0 6pt",
      },
      textDecoration: "underline dashed",
    });
  }

  // Registers listeners to update decorations whenever the active editor,
  // visible ranges, or content change, and immediately decorates the currently
  // active editor, if any.
  public activate(context: vscode.ExtensionContext) {
    // Update the symbol demangling decorations whenever the user activates a
    // new editor.
    vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor) {
          this.decorateSymbolsInRanges(editor, editor.visibleRanges);
        }
      },
      null,
      context.subscriptions
    );

    // Update the symbol demangling decorations whenever the user scrolls or
    // otherwise changes the visible ranges in an editor (e.g., by resizing it).
    vscode.window.onDidChangeTextEditorVisibleRanges(
      (event) => {
        // Throttling this to require 100ms between updates provides better
        // feedback and less demangler thrashing during rapid scrolling events.
        if (this.changeVisibleRangesTimer) {
          clearTimeout(this.changeVisibleRangesTimer);
        }
        this.changeVisibleRangesTimer = setTimeout(() => {
          this.changeVisibleRangesTimer = null;
          this.decorateSymbolsInRanges(event.textEditor, event.visibleRanges);
        }, 100);
      },
      null,
      context.subscriptions
    );

    // Update the symbol mangling decorations whenever the active editor's
    // document is edited.
    vscode.workspace.onDidChangeTextDocument(
      (event) => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document !== event.document) {
          return;
        }
        // Since we regenerate the full set of decorations on each call to this
        // function, we can't restrict our operation to just the edited ranges.
        //
        // TODO(allevato): Consider optimizing this, though once we add caching
        // for demangled symbols, that might be good enough.
        this.decorateSymbolsInRanges(activeEditor, activeEditor.visibleRanges);
      },
      null,
      context.subscriptions
    );

    this.demanglerCore.onDidInvalidate(() => {
      this.decorateVisibleEditors();
    });

    // Process all the currently visible editors right away.
    this.decorateVisibleEditors();
  }

  /**
   * Updates the editor to contain decorations that show the demangled names of
   * any mangled symbols found in the given ranges.
   *
   * @param editor The `vscode.TextEditor` whose document will be scanned for
   *     mangled symbols.
   * @param ranges The ranges of the document that should be scanned for mangled
   *     symbols.
   */
  public async decorateSymbolsInRanges(
    editor: vscode.TextEditor,
    ranges: readonly vscode.Range[]
  ) {
    const demangleResults = await this.demanglerCore.demangleSymbolsInRanges(
      editor.document,
      ranges
    );

    editor.setDecorations(
      this.decorationType,
      demangleResults.map(function (result) {
        return <vscode.DecorationOptions>{
          hoverMessage: result.result.detailedText,
          range: result.range,
          renderOptions: {
            after: { contentText: `«${result.result.demangled}»` },
          },
        };
      })
    );
  }

  /** Iterates over the visible editors and decorates their visible ranges. */
  private decorateVisibleEditors() {
    for (const editor of vscode.window.visibleTextEditors) {
      this.decorateSymbolsInRanges(editor, editor.visibleRanges);
    }
  }
}
