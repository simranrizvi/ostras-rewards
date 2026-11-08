import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
function check(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const file = `${folder}/${entry.name}`;
    if (entry.isDirectory()) check(file);
    else if (file.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', file], {
        stdio: 'inherit',
      });
      if (result.status !== 0) process.exit(result.status || 1);
    }
  }
}
check('src');
check('scripts');
check('test');
