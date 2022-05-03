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
import { DemanglingDecorator } from "./demangling_decorator";
import { CppDemangler } from "./demanglers/cpp";
import { SwiftDemangler } from "./demanglers/swift";

/** The object that manages the demangling operations. */
let demanglerCore: DemanglerCore;

/** Creates the dmangler core and add the demanglers to it. */
function createDemanglerCore() {
  const demanglerCore = new DemanglerCore();
  demanglerCore.addDemangler(/(_|__)?ZN?\d+\w+/g, new CppDemangler());
  demanglerCore.addDemangler(/_?\$s\w+/g, new SwiftDemangler());
  return demanglerCore;
}

export function activate(context: vscode.ExtensionContext) {
  demanglerCore = createDemanglerCore();
  const demanglingDecorator = new DemanglingDecorator(demanglerCore);

  // Update the symbol demangling decorations whenever the user activates a new
  // editor.
  vscode.window.onDidChangeActiveTextEditor(
    function (editor) {
      if (editor) {
        demanglingDecorator.decorateSymbolsInRanges(
          editor,
          editor.visibleRanges
        );
      }
    },
    null,
    context.subscriptions
  );

  // Update the symbol demangling decorations whenever the user scrolls or
  // otherwise changes the visible ranges in an editor (e.g., by resizing it).
  vscode.window.onDidChangeTextEditorVisibleRanges(
    function (event) {
      demanglingDecorator.decorateSymbolsInRanges(
        event.textEditor,
        event.visibleRanges
      );
    },
    null,
    context.subscriptions
  );

  // Update the symbol mangling decorations whenever the active editor's
  // document is edited.
  vscode.workspace.onDidChangeTextDocument(
    function (event) {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || activeEditor.document !== event.document) {
        return;
      }
      // Since we regenerate the full set of decorations on each call to this
      // function, we can't restrict our operation to just the edited ranges.
      //
      // TODO(allevato): Consider optimizing this, though once we add caching
      // for demangled symbols, that might be good enough.
      demanglingDecorator.decorateSymbolsInRanges(
        activeEditor,
        activeEditor.visibleRanges
      );
    },
    null,
    context.subscriptions
  );

  // If an editor is active at startup, process it right away.
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    demanglingDecorator.decorateSymbolsInRanges(
      activeEditor,
      activeEditor.visibleRanges
    );
  }
}

export function deactivate() {
  if (demanglerCore) {
    demanglerCore.shutdown();
  }
}
