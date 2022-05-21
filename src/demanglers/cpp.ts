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
 * Invokes `c++filt` to demangle C++ symbols.
 *
 * This demangler does not provide additional hover information.
 */
export class CppDemangler implements IDemangler {
  mangledSymbolPattern = /_{1,2}ZN?\d+\w+/g;

  /** The view of the path settings for this demangler. */
  private pathSettings: DemanglerPathSettings;

  constructor() {
    this.pathSettings = new DemanglerPathSettings("C++", "c++");
  }

  activate() {
    this.pathSettings.updateAvailability();
  }

  isAvailable(): boolean {
    return this.pathSettings.isToolValid();
  }

  demangle(mangledSymbol: string): DemangleResult | null {
    const output = spawnDemanglerSync(
      [this.pathSettings.toolPath(), mangledSymbol],
      {
        encoding: "utf8",
      }
    ).stdout.trim();

    // If the same string was printed back, cxxfilt wasn't able to demangle it.
    if (output === mangledSymbol) {
      return null;
    }

    return { demangled: output };
  }

  onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent): boolean {
    return this.pathSettings.updateAvailability(event);
  }
}
