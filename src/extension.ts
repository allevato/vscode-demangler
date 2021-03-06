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
import { DemanglingCopier } from "./demangling_copier";
import { DemanglerCore } from "./demangler_core";
import { DemanglingDecorator } from "./demangling_decorator";
import { createAllDemanglers } from "./demanglers";

/** The object that manages the demangling operations. */
let demanglerCore: DemanglerCore;

/** Creates the dmangler core and add the demanglers to it. */
function createDemanglerCore() {
  const demanglerCore = new DemanglerCore(createAllDemanglers());
  return demanglerCore;
}

export async function activate(context: vscode.ExtensionContext) {
  demanglerCore = createDemanglerCore();
  demanglerCore.activate(context);

  const demanglingCopier = new DemanglingCopier(demanglerCore);
  await demanglingCopier.activate(context);

  const demanglingDecorator = new DemanglingDecorator(demanglerCore);
  demanglingDecorator.activate(context);
}

export function deactivate() {
  if (demanglerCore) {
    demanglerCore.shutdown();
  }
}
