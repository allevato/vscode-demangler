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

  /**
   * A mapping where each key is a possible mangled symbol found by matching one
   * of the demangler's regular expressions, and the corresponding value is
   * either null (to indicate that the symbol could not be demangled) or the
   * successful demangling result.
   */
  private demangleCache: Map<string, DemangleResult | null>;

  constructor() {
    this.demanglers = [];
    this.demangleCache = new Map<string, DemangleResult | null>();
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
   * Scans the document for mangled symbols in the given ranges and returns
   * values describing their locations and demangled names.
   *
   * @param document The `vscode.TextDocument` that will be scanned for mangled
   *     symbols.
   * @param ranges The ranges of the document that should be scanned for mangled
   *     symbols.
   * @returns A promies for an array of `DemangledDocumentSymbol` values, each
   *     of which describes the location and demangled name of a mangled symbol
   *     found in the document at the given ranges.
   */
  public async demangleSymbolsInRanges(
    document: vscode.TextDocument,
    ranges: readonly vscode.Range[]
  ): Promise<DemangledDocumentSymbol[]> {
    // TODO(allevato): Rework this algorithm and the demangler interfaces so
    // that we keep the subprocesses running and pipe input to them. Since
    // cxxfilt and swift-demangle both block on input from stdin, we can treat
    // them like servers (but make the interface generic enough for other
    // demanglers that don't work this way).

    // First, collect all the possible demangled symbols in the given ranges of
    // the document. For each symbol, track the demangler that found it and its
    // position.
    const mangledSymbols: {
      symbol: string;
      demangler: IDemangler;
      position: vscode.Position;
    }[] = [];

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

            mangledSymbols.push({
              symbol: symbol,
              demangler: demangler,
              position: new vscode.Position(line, offsetInLine),
            });
          }
        }
      }
    }

    // Now, demangle each symbol that was found (or pull the cached result if it
    // was demangled previously).
    const results: DemangledDocumentSymbol[] = [];

    for (const { symbol, demangler, position } of mangledSymbols) {
      const demangleResult = await this.lookupSymbolInCacheOrDemangle(
        symbol,
        demangler
      );
      if (demangleResult === null) {
        continue;
      }

      results.push({
        range: new vscode.Range(position, position.translate(0, symbol.length)),
        result: demangleResult,
      });
    }

    return results;
  }

  /**
   * Looks up the given symbol in the demangling cache and returns the result if
   * found; otherwise, performs the demangling operation, updates the cache, and
   * returns the result.
   *
   * @param symbol The symbol to demangle.
   * @param demangler The demangler to use to demangle the symbol.
   * @returns A promise for the demangled result, or a promise for null if the
   *     symbol could not be demangled.
   */
  private lookupSymbolInCacheOrDemangle(
    symbol: string,
    demangler: IDemangler
  ): Promise<DemangleResult | null> {
    return new Promise<DemangleResult | null>((resolve, reject) => {
      const cachedResult = this.demangleCache.get(symbol);
      if (cachedResult !== undefined) {
        resolve(cachedResult);
        return;
      }

      // TODO(allevato): Look at making this some sort of LRU cache to avoid
      // unbounded memory usage.
      const demangledResult = demangler.demangle(symbol);
      this.demangleCache.set(symbol, demangledResult);
      resolve(demangledResult);
    });
  }
}
