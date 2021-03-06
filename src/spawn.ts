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

import * as child_process from "child_process";
import * as which from "which";

/**
 * Returns a value indicating whether the specified command can be spawned as an
 * external process.
 *
 * If the command is not an absolute path, then it will be checked using `xcrun`
 * on macOS and using `which` on all other platforms.
 *
 * @param command The command to check.
 * @returns True if the command can be spawned, otherwise false.
 */
export function canSpawnSync(command: string): boolean {
  if (process.platform === "darwin") {
    const xcrun = child_process.spawnSync("xcrun", ["-f", command]);
    return xcrun.status === 0 && xcrun.signal === null;
  }
  return which.sync(command, { nothrow: true }) !== null;
}

/**
 * A wrapper around `child_process.spawnSync` that invokes the command via
 * `xcrun` on Apple platforms.
 *
 * @param commandAndArgs An containing the command to execute and its arguments.
 * @param options The spawn options, identical to those passed to
 *     `child_process.spawnSync`.
 * @returns See the return value of `child_process.spawnSync`.
 */
export function spawnDemanglerSync(
  commandAndArgs: readonly string[],
  options?: child_process.SpawnSyncOptionsWithStringEncoding | undefined
): child_process.SpawnSyncReturns<string> {
  let command: string;
  let args: readonly string[];
  if (process.platform === "darwin") {
    command = "xcrun";
    args = commandAndArgs;
  } else {
    command = commandAndArgs[0];
    args = commandAndArgs.slice(1);
  }
  return child_process.spawnSync(command, args, options);
}
