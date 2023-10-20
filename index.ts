import util from "util";
import { exec as _exec } from "child_process";
const exec = util.promisify(_exec);

const $ = async (cmd: string) => {
  const { stdout, stderr } = await exec(cmd);
  if (stderr) {
    console.log(stderr);
    process.exit(1);
  }
  return stdout;
};

const DEFAULT_ROOT_BRANCH = "master";

/**
 * ./cli source-branch-name target-branch-name
 * ./cli issue/123 release/1.0.0
 *
 * Assumes root branch's name is master
 * Otherwise third arg is the root branch name
 */
const [_bun, _file, source, target, rootOverride] = Bun.argv;

if (!source || !target) {
    console.log("Missing source or target branch name");
    process.exit(1);
}

const root = rootOverride || DEFAULT_ROOT_BRANCH;

// Gets commits different between source and root
const revList = await $(`git rev-list ${source} ^${root} --reverse`);
const commitsToCherryPick = revList.split("\n").filter(Boolean);

const newBranchName = `${source}-picked`;

console.log(commitsToCherryPick);
