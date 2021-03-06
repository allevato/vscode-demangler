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

/** Encapsulates the result of demangling a symbol. */
export type DemangleResult = {
  /** The demangled name of the symbol. */
  demangled: string;

  /**
   * Optional additional details about the symbol demangling.
   *
   * Some demanglers can output supplemental information about the mangled
   * symbol. For example, `swift-demangle` shows the tree expansion of the
   * mangling structure. These details will be displayed on hover over the
   * mangled symbol.
   *
   * This may be undefined if there are no additional details to show.
   */
  detailedText?: string | vscode.MarkdownString | undefined;
};

/**
 * Methods that must be implemented by the demangler for symbols in a particular
 * language or mangling scheme.
 */
export interface IDemangler {
  /**
   * A regular expressions that matches likely mangled symbols recognized by
   * this demangler.
   */
  mangledSymbolPattern: RegExp;

  /**
   * Returns a value indicating whether the demangler is currently available
   * (that is, its path setting points to a valid executable).
   */
  isAvailable(): boolean;

  /** Called when the extension is activated. */
  activate(): void;

  /**
   * Attempts to demangle the given symbol.
   *
   * @param mangledSymbol The mangled symbol.
   * @returns The result if successfully demangled, or null if the symbol could
   *     not be demangled.
   */
  demangle(mangledSymbol: string): DemangleResult | null;

  /**
   * Called when the configuration has changed.
   *
   * Demanglers can use this to scan for the executable at the new path when it
   * has changed and update their internal state.
   *
   * @param event Describes the configuration change.
   */
  onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent): boolean;
}
