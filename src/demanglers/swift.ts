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
import { DemanglerPathSettings } from "../demangler_path_settings";
import { DemangleResult, IDemangler } from "../demangler_interface";
import { canSpawnSync, spawnDemanglerSync } from "../spawn";

/**
 * Invokes `swift-demangle` to demangle Swift symbols.
 *
 * This demangler supports additional details; it returns the node structure as
 * a Markdown block.
 */
export class SwiftDemangler implements IDemangler {
  /**
   * Swift 5+ ABI stable mangled symbols start with "_$s" (underscore optional).
   * Before that, a couple other mangling prefixes were used: "_$S" and "_T". We
   * recognize these as well since swift-demangle can handle them.
   *
   * We also look for symbols starting with "%T" since they appear in LLVM IR
   * followed by the mangled symbol name, symbols starting with `s:`, which is
   * how USRs in indexstore and SourceKit are generated, and symbols starting
   * with `@__swiftmacro_`, which represent macro expansions. (All of these
   * forms exclude the symbol's usual "_$s" prefix.)
   */
  mangledSymbolPattern = /(%T|(_?\$[sS]|_T|s:|@__swiftmacro_))[_A-Za-z0-9$]+/g;

  /** The view of the path settings for this demangler. */
  private pathSettings: DemanglerPathSettings;

  constructor() {
    this.pathSettings = new DemanglerPathSettings("Swift", "swift");
  }

  activate() {
    this.pathSettings.updateAvailability();
  }

  isAvailable(): boolean {
    return this.pathSettings.isToolValid();
  }

  demangle(mangledSymbol: string): DemangleResult | null {
    if (mangledSymbol.startsWith("@__swiftmacro_")) {
      mangledSymbol = `_$s${mangledSymbol.substring(14)}`;
    } else if (
      mangledSymbol.startsWith("%T") ||
      mangledSymbol.startsWith("s:")
    ) {
      mangledSymbol = `_$s${mangledSymbol.substring(2)}`;
    }
    const lines = spawnDemanglerSync(
      [this.pathSettings.toolPath(), "--expand", "--compact", mangledSymbol],
      { encoding: "utf8" }
    )
      .stdout.trim()
      .split("\n");

    const demangled = lines[lines.length - 1];
    if (demangled.startsWith("<<NULL>>")) {
      return null;
    }

    const detailedMarkdown = new vscode.MarkdownString();
    detailedMarkdown.appendMarkdown(
      `**Node structure for**\\\n\`${mangledSymbol}\``
    );
    detailedMarkdown.appendCodeblock(
      lines.slice(1, -1).join("\n"),
      "plaintext"
    );

    return {
      demangled: demangled,
      detailedText: detailedMarkdown,
    };
  }

  onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent): boolean {
    return this.pathSettings.updateAvailability(event);
  }
}
