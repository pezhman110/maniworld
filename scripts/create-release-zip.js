const { existsSync, rmSync } = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.RELEASE_ZIP || path.join(root, 'globex-horizon-executable.zip'));
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false, ...options });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run(npmCmd, ['run', 'build']);

if (existsSync(output)) {
  rmSync(output);
}

const packagePaths = ['dist', 'public', 'migrations', 'package.json', 'package-lock.json', 'README.md', '.env.example'].filter(
  (entry) => existsSync(path.join(root, entry))
);

if (process.platform === 'win32') {
  const quotedPaths = packagePaths.map((entry) => `'${path.join(root, entry).replace(/'/g, "''")}'`).join(',');
  const quotedOutput = `'${output.replace(/'/g, "''")}'`;
  run('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path ${quotedPaths} -DestinationPath ${quotedOutput} -Force`]);
} else {
  run('zip', ['-rq', output, ...packagePaths]);
}

console.log(`Created ${output}`);
