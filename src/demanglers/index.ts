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

import { IDemangler } from "../demangler_interface";
import { CppDemangler } from "./cpp";
import { SwiftDemangler } from "./swift";

/**
 * Creates the demanglers supported by the extension and returns them in an
 * array.
 */
export function createAllDemanglers(): IDemangler[] {
  return [new CppDemangler(), new SwiftDemangler()];
}
