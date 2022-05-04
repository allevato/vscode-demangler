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
import { DemangleResult, IDemangler } from "./demangler_interface";

/**
 * A demangled symbol from a text document and the range of the document that it
 * occupied.
 */
export type DemangledDocumentSymbol = {
  range: vscode.Range;
  result: DemangleResult;
};

/**
 * Provides operations for demangling symbols within a range of a text editor.
 */
export class DemanglerCore {
  /**
   * The list of demanglers that try to find and demangle symbols on lines of
   * text in an editor.
   */
  private demanglers: IDemangler[];

  constructor() {
    this.demanglers = [];
  }

  /**
   * Adds a new demangler.
   *
   * The demanglers are evaluated in the order they are added.
   *
   * @param demangler An object conforming to the `IDemangler` interface that
   *     attempts to demangle symbols matching their associated regular
   *     expression.
   */
  public addDemangler(demangler: IDemangler) {
    this.demanglers.push(demangler);
  }

  /** Shuts down any open tasks or resources used by the demangler core. */
  public shutdown() {
    // TODO(allevato): When we migrate the demanglers to servers, add shutdown
    // logic here.
  }

  /**
   * Updates the editor to contain decorations that show the demangled names of
   * any mangled symbols found in the given ranges.
   *
   * @param document The `vscode.TextDocument` that will be scanned for mangled
   *     symbols.
   * @param ranges The ranges of the document that should be scanned for mangled
   *     symbols.
   */
  public demangleSymbolsInRanges(
    document: vscode.TextDocument,
    ranges: readonly vscode.Range[]
  ): DemangledDocumentSymbol[] {
    // TODO(allevato): Add a cache so that we don't re-demangle the same symbol
    // multiple times.

    // TODO(allevato): Rework this algorithm and the demangler interfaces so
    // that we keep the subprocesses running and pipe input to them. Since
    // cxxfilt and swift-demangle both block on input from stdin, we can treat
    // them like servers (but make the interface generic enough for other
    // demanglers that don't work this way).

    const results: DemangledDocumentSymbol[] = [];

    for (const range of ranges) {
      const startOffset = document.offsetAt(range.start);
      const endOffset = document.offsetAt(range.end);
      if (endOffset - startOffset > 1024 * 1024) {
        // TODO: Warn the user.
        continue;
      }

      const startLine = Math.max(0, range.start.line - 1);
      const endLine = Math.min(range.end.line + 2, document.lineCount);

      for (let line = startLine; line < endLine; ++line) {
        const text = document.lineAt(line).text;

        for (const demangler of this.demanglers) {
          let match: RegExpExecArray | null;
          while ((match = demangler.mangledSymbolPattern.exec(text)) !== null) {
            const symbol = match[0];
            const offsetInLine = match.index;
            if (offsetInLine === null) {
              continue;
            }

            const demangleResult = demangler.demangle(symbol);
            if (demangleResult === null) {
              continue;
            }

            results.push({
              range: new vscode.Range(
                line,
                offsetInLine,
                line,
                offsetInLine + symbol.length
              ),
              result: demangleResult,
            });
          }
        }
      }
    }

    return results;
  }
}
