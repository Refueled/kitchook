import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readlink, rm, symlink, writeFile, cp } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, '..');
const infrastructure = path.join(repositoryRoot, 'infrastructure');

function script(name) {
  return path.join(infrastructure, name);
}

async function temporaryRoot() {
  return mkdtemp(path.join(os.tmpdir(), 'kitchook-deployment-'));
}

async function createArtifact(root, marker = 'default') {
  await mkdir(path.join(root, 'search'), { recursive: true });
  await mkdir(path.join(root, 'api'), { recursive: true });
  await writeFile(path.join(root, 'index.html'), `<!doctype html><p>${marker}</p>\n`);
  await writeFile(path.join(root, 'search', 'index.json'), `{"release":"${marker}"}\n`);
  await writeFile(path.join(root, 'api', 'recipes.json'), `[{"release":"${marker}"}]\n`);
  await writeFile(path.join(root, 'asset.txt'), `${marker}\n`);
}

function run(name, ...args) {
  return execFileSync('/bin/sh', [script(name), ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runFailure(name, ...args) {
  assert.throws(
    () => run(name, ...args),
    (error) => error.status !== 0,
  );
}

async function removeTemporary(root) {
  try {
    execFileSync('chmod', ['-R', 'u+w', root], { stdio: 'ignore' });
  } catch {
    // The directory may already be absent after an earlier setup failure.
  }
  await rm(root, { recursive: true, force: true });
}

async function startOrigin(siteRoot, badRelease) {
  const server = http.createServer(async (request, response) => {
    try {
      const target = await readlink(path.join(siteRoot, 'current'));
      const releaseId = target.replace(/^releases\//, '');
      const pathname = new URL(request.url, 'http://origin.invalid').pathname;
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);

      if (releaseId === badRelease && relative === 'index.html') {
        response.writeHead(200, { 'content-type': 'text/html' });
        response.end('wrong release bytes\n');
        return;
      }

      const body = await readFile(path.join(siteRoot, 'releases', releaseId, relative));
      response.writeHead(200);
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('not found\n');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    server,
    url: `http://127.0.0.1:${server.address().port}`,
  };
}

test('publisher creates immutable managed releases and permits only matching retries', async () => {
  const root = await temporaryRoot();
  try {
    const artifact = path.join(root, 'artifact');
    const site = path.join(root, 'site with spaces');
    await createArtifact(artifact, 'release-one');

    run('publish-release.sh', artifact, 'abc123', site);
    assert.equal(await readlink(path.join(site, 'current')), 'releases/abc123');
    assert.equal(
      await readFile(path.join(site, '.kitchook-deploy', 'releases'), 'utf8'),
      'abc123\n',
    );

    const retryOutput = run('publish-release.sh', artifact, 'abc123', site);
    assert.match(retryOutput, /already exists, matches, and is managed/);

    await writeFile(path.join(artifact, 'asset.txt'), 'changed\n');
    runFailure('publish-release.sh', artifact, 'abc123', site);
    assert.equal(await readFile(path.join(site, 'releases', 'abc123', 'asset.txt'), 'utf8'), 'release-one\n');
  } finally {
    await removeTemporary(root);
  }
});

test('an exact pending marker recovers an interrupted automation-owned release', async () => {
  const root = await temporaryRoot();
  try {
    const site = path.join(root, 'site');
    const seed = path.join(root, 'seed');
    const interrupted = path.join(root, 'interrupted');
    await createArtifact(seed, 'seed');
    await createArtifact(interrupted, 'interrupted');
    run('publish-release.sh', seed, 'seed-release', site);

    await cp(interrupted, path.join(site, 'releases', 'interrupted-release'), { recursive: true });
    await writeFile(
      path.join(site, '.kitchook-deploy', 'pending', 'interrupted-release'),
      'interrupted-release\n',
    );

    assert.match(
      run('publish-release.sh', interrupted, 'interrupted-release', site),
      /Recovered interrupted publication/,
    );
    assert.equal(await readlink(path.join(site, 'current')), 'releases/interrupted-release');
    assert.equal(
      await readFile(path.join(site, '.kitchook-deploy', 'releases'), 'utf8'),
      'seed-release\ninterrupted-release\n',
    );
  } finally {
    await removeTemporary(root);
  }
});

test('unmanaged collisions fail until a known-good release is explicitly adopted', async () => {
  const root = await temporaryRoot();
  try {
    const artifact = path.join(root, 'artifact');
    const site = path.join(root, 'site');
    const baseline = path.join(site, 'releases', 'phase6-baseline');
    await createArtifact(artifact, 'baseline');
    await mkdir(path.dirname(baseline), { recursive: true });
    await cp(artifact, baseline, { recursive: true });
    await symlink('releases/phase6-baseline', path.join(site, 'current'));

    runFailure('publish-release.sh', artifact, 'phase6-baseline', site);
    run('adopt-release.sh', 'phase6-baseline', site);
    assert.match(
      run('adopt-release.sh', 'phase6-baseline', site),
      /already managed/,
    );
    run('publish-release.sh', artifact, 'phase6-baseline', site);
    assert.equal(await readlink(path.join(site, 'current')), 'releases/phase6-baseline');
  } finally {
    await removeTemporary(root);
  }
});

test('artifact validation, unsafe IDs, and stale staging fail closed', async () => {
  const root = await temporaryRoot();
  try {
    const malformed = path.join(root, 'malformed');
    const valid = path.join(root, 'valid');
    const site = path.join(root, 'site');
    await mkdir(malformed);
    await writeFile(path.join(malformed, 'index.html'), 'only one file\n');
    await createArtifact(valid, 'valid');

    runFailure('publish-release.sh', malformed, 'valid-id', site);
    runFailure('publish-release.sh', malformed, '../unsafe', site);
    runFailure('select-release.sh', 'missing', site);

    const staleStage = path.join(site, 'releases', '.stale-id.staging');
    await mkdir(staleStage, { recursive: true });
    await writeFile(path.join(staleStage, 'diagnostic.txt'), 'preserve for review\n');
    runFailure('publish-release.sh', valid, 'stale-id', site);
    assert.equal(await readFile(path.join(staleStage, 'diagnostic.txt'), 'utf8'), 'preserve for review\n');
    await assert.rejects(readlink(path.join(site, 'current')));
  } finally {
    await removeTemporary(root);
  }
});

test('retention removes only the oldest managed release and ignores unmanaged directories', async () => {
  const root = await temporaryRoot();
  try {
    const site = path.join(root, 'site');
    for (let index = 1; index <= 6; index += 1) {
      const artifact = path.join(root, `artifact-${index}`);
      await createArtifact(artifact, `release-${index}`);
      run('publish-release.sh', artifact, `release-${index}`, site);
    }

    const unmanaged = path.join(site, 'releases', 'manual-unknown');
    await createArtifact(unmanaged, 'unmanaged');
    run('prune-releases.sh', site, '5', 'release-6');

    await assert.rejects(readFile(path.join(site, 'releases', 'release-1', 'index.html')));
    for (let index = 2; index <= 6; index += 1) {
      assert.match(
        await readFile(path.join(site, 'releases', `release-${index}`, 'index.html'), 'utf8'),
        new RegExp(`release-${index}`),
      );
    }
    assert.match(await readFile(path.join(unmanaged, 'index.html'), 'utf8'), /unmanaged/);
    assert.equal(
      await readFile(path.join(site, '.kitchook-deploy', 'releases'), 'utf8'),
      'release-2\nrelease-3\nrelease-4\nrelease-5\nrelease-6\n',
    );
  } finally {
    await removeTemporary(root);
  }
});

test('failed LAN-origin verification atomically restores and verifies the previous release', async () => {
  const root = await temporaryRoot();
  let server;
  try {
    const site = path.join(root, 'site');
    const oldArtifact = path.join(root, 'old');
    const badArtifact = path.join(root, 'bad');
    await createArtifact(oldArtifact, 'known-good');
    await createArtifact(badArtifact, 'bad-build');
    run('publish-release.sh', oldArtifact, 'known-good', site);

    const origin = await startOrigin(site, 'bad-build');
    server = origin.server;

    await assert.rejects(
      execFileAsync('/bin/sh', [
        script('deploy-release.sh'),
        badArtifact,
        'bad-build',
        site,
        origin.url,
        '5',
      ]),
      (error) => {
        assert.match(error.stderr, /previous release was restored and verified/);
        return true;
      },
    );
    assert.equal(await readlink(path.join(site, 'current')), 'releases/known-good');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await removeTemporary(root);
  }
});

test('public workflow cannot target a self-hosted runner and the reusable template remains hardened', async () => {
  const workflow = await readFile(path.join(repositoryRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
  const compose = await readFile(path.join(infrastructure, 'runner', 'compose.yml'), 'utf8');
  const entrypoint = await readFile(path.join(infrastructure, 'runner', 'entrypoint.sh'), 'utf8');

  assert.match(workflow, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  assert.match(workflow, /format\('push-\{0\}', github\.run_id\)/);
  assert.doesNotMatch(workflow, /self-hosted/);
  assert.doesNotMatch(workflow, /kitchook-deploy/);
  assert.doesNotMatch(workflow, /Deploy production/);

  assert.match(compose, /user: "1001:1001"/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /target: \/opt\/kitchook\n\s+read_only: true/);
  assert.match(compose, /target: \/srv\/site/);
  assert.match(compose, /\/runner\/_work:rw,nosuid,nodev,exec,size=512m/);
  assert.match(compose, /ACTIONS_RUNNER_HOOK_JOB_COMPLETED: \/opt\/kitchook\/runner\/job-completed\.sh/);
  assert.match(compose, /cap_drop:\n\s+- ALL/);
  assert.match(compose, /no-new-privileges:true/);
  assert.doesNotMatch(compose, /^\s+ports:/m);
  assert.doesNotMatch(compose, /docker\.sock/);
  assert.match(entrypoint, /find "\$IMAGE_RUNNER_ROOT" -mindepth 1 -maxdepth 1/);
  assert.match(entrypoint, /-exec cp -a --no-preserve=ownership,timestamps/);
});

test('footer exposes and copies the build deployment identifier', async () => {
  const workflow = await readFile(path.join(repositoryRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
  const layout = await readFile(path.join(repositoryRoot, 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
  const copyScript = await readFile(path.join(repositoryRoot, 'src', 'scripts', 'deployment-copy.ts'), 'utf8');

  assert.match(workflow, /PUBLIC_DEPLOYMENT_ID: \$\{\{ github\.sha \}\}/);
  assert.match(layout, /import\.meta\.env\.PUBLIC_DEPLOYMENT_ID \|\| 'local-build'/);
  assert.match(layout, /data-deployment-copy/);
  assert.match(layout, /aria-live="polite"/);
  assert.match(copyScript, /navigator\.clipboard\?\.writeText/);
  assert.match(copyScript, /document\.execCommand\('copy'\)/);
});
