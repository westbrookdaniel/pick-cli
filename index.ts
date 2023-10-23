import util from "util";
import { exec as _exec } from "child_process";
const exec = util.promisify(_exec);

const $ = async (
  cmd: string,
  opts?: { ignoreErr?: boolean; returnErr?: boolean },
) => {
  const { ignoreErr, returnErr } = opts || {};

  const { stdout, stderr } = await exec(cmd);

  if (returnErr) return stderr;

  if (stderr && !ignoreErr) {
    console.log("Something unexpected happened:");
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
const source = (await $(`git rev-parse --abbrev-ref HEAD`)).trim();

const root = rootOverride || DEFAULT_ROOT_BRANCH;

if (target === source || target === root) {
  console.log("Current branch cannot be the same as target or root branch");
  process.exit(1);
}

// Gets commits different between source and root
const revList = await $(`git rev-list ${source} ^${root}`);
const commitsToCherryPick = revList.split("\n").filter(Boolean).reverse();

const status = await $("git status -s");
if (status.trim().length > 0) {
  console.log("Working directory is not clean");
  process.exit(1);
}

// Create new branch based on target named after source
// Need to manually check branch switches due to how git checkout handles errors
const branchName = `${source}-picked`;
console.log(`Creating new branch ${branchName} based on ${target}`);
await $(`git checkout ${target}`, { ignoreErr: true });
const shouldBeTarget = (await $(`git rev-parse --abbrev-ref HEAD`)).trim();
if (shouldBeTarget !== target) {
  console.log(
    `Something went wrong, expected ${target} but got ${shouldBeTarget}`,
  );
  process.exit(1);
}
await $(`git checkout -b ${branchName}`, { ignoreErr: true });
const shouldBeBranchName = (await $(`git rev-parse --abbrev-ref HEAD`)).trim();
if (shouldBeBranchName !== branchName) {
  console.log(
    `Something went wrong, expected ${branchName} but got ${shouldBeBranchName}`,
  );
  process.exit(1);
}

// Cherry pick commits
console.log(`Cherry picking...\n`);
for (const commit of commitsToCherryPick) {
  const committed = await $(`git cherry-pick ${commit}`);
  console.log(committed);
}
console.log("Done!");
