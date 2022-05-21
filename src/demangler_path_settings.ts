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
import { canSpawnSync } from "./spawn";

/**
 * Manages the path setting for a demangler and reacts to changes to the setting
 * made by the user.
 */
export class DemanglerPathSettings {
  /**
   * The full name of the settings section (beginning with `demangler.`) where
   * the path settings are stored.
   */
  private section: string;

  /** The current path to the tool. */
  private currentToolPath: string = "";

  /**
   * Indicates whether the tool can be spawned (i.e., whether the path points)
   * to a valid executable.
   */
  private canSpawnTool: boolean;

  /**
   * Creates a new path setting for the given language and settings section
   * identifier.
   *
   * @param language The name of the language that this path setting is used
   *     for; this will be used in popup notifications if the path is not valid.
   * @param section The name of the settings subsection (`demangler.` will be
   *     prepended to it) where the path settings will be stored.
   */
  constructor(private language: string, section: string) {
    this.section = `demangler.${section}`;
    this.canSpawnTool = false;
  }

  /**
   * Returns a value indicating whether the tool path points to a valid
   * executable.
   */
  isToolValid(): boolean {
    return this.canSpawnTool;
  }

  /** Returns the currently set path for this tool. */
  toolPath(): string {
    return this.currentToolPath;
  }

  /**
   * Updates the availability of the tool based on the given
   * `ConfigurationChangeEvent`.
   */
  updateAvailability(
    event: vscode.ConfigurationChangeEvent | undefined = undefined
  ): boolean {
    if (event && !event.affectsConfiguration(this.section)) {
      return false;
    }

    const path = <string>this.getConfiguration().get("toolPath");
    if (this.currentToolPath === path) {
      return false;
    }

    this.currentToolPath = path;
    this.canSpawnTool = path !== undefined && canSpawnSync(path);

    if (
      !this.canSpawnTool &&
      this.getConfiguration().get<boolean>("warnIfToolPathIsInvalid")
    ) {
      vscode.window
        .showWarningMessage(
          `${this.language} symbol demangling is disabled because the path ` +
            `to the demangling tool is not valid or it was not executable.`,
          "Open in Settings",
          "Don't Show Again"
        )
        .then((value) => {
          switch (value) {
            case "Open in Settings":
              vscode.commands.executeCommand(
                "workbench.action.openSettings",
                this.section
              );
            case "Don't Show Again":
              this.getConfiguration().update("warnIfToolPathIsInvalid", false);
          }
        });
    }
    return true;
  }

  /** Returns the configuration object for this section. */
  private getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(this.section);
  }
}
