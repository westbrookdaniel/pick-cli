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

const [_bun, _file, target, rootOverride] = Bun.argv;

if (!target) {
  console.log("Missing target branch name");
  process.exit(1);
}

// Get current branch name as the source
const source = await $(`git rev-parse --abbrev-ref HEAD`);

const root = rootOverride || DEFAULT_ROOT_BRANCH;

if (target === source || target === root) {
  console.log("Current branch cannot be the same as target or root branch");
  process.exit(1);
}

// Gets commits different between source and root
const revList = await $(`git rev-list ${source} ^${root} --reverse`);
const commitsToCherryPick = revList.split("\n").filter(Boolean);

// Create new branch based on target named after source
const branchName = `${source}-picked`;
console.log(`Creating new branch ${branchName} based on ${target}`);
await $(`git checkout ${target}`);
await $(`git checkout -b ${branchName}`);

// Cherry pick commits
await Promise.all(
  commitsToCherryPick.map(async (commit) => {
    console.log(`Cherry picking ${commit}`);
    await $(`git cherry-pick ${commit}`);
  }),
);

console.log("Done!");
