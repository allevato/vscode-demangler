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

  constructor(private demanglerCore: DemanglerCore) {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        // TODO(allevato): Make the appearance a bit more customizable?
        color: new vscode.ThemeColor("editorCodeLens.foreground"),
        fontStyle: "normal",
        fontWeight: "normal",
        margin: "0 6pt",
      },
    });
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
  public decorateSymbolsInRanges(
    editor: vscode.TextEditor,
    ranges: readonly vscode.Range[]
  ) {
    const demangleResults = this.demanglerCore.demangleSymbolsInRanges(
      editor.document,
      ranges
    );

    editor.setDecorations(
      this.decorationType,
      demangleResults.map(function (result) {
        return {
          hoverMessage: result.result.detailedText,
          range: result.range,
          renderOptions: {
            after: { contentText: `«${result.result.demangled}»` },
          },
        };
      })
    );
  }
}
