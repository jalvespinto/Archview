import { FileWatcher } from '../FileWatcher';

describe('FileWatcher path matching', () => {
  it('matches workspace-relative include patterns against absolute file paths', () => {
    const watcher = new FileWatcher({
      autoRefresh: true,
      autoRefreshDebounce: 100,
      includePatterns: ['src/**/*.ts'],
      excludePatterns: []
    });

    const callback = jest.fn();
    watcher.start('/workspace', callback);

    watcher.triggerFileChange('/workspace/src/features/main.ts');
    watcher.flushPendingChanges();

    expect(callback).toHaveBeenCalledTimes(1);
    const event = callback.mock.calls[0][0];
    expect(event.changedFiles.has('/workspace/src/features/main.ts')).toBe(true);
  });

  it('applies exclude patterns against absolute file paths', () => {
    const watcher = new FileWatcher({
      autoRefresh: true,
      autoRefreshDebounce: 100,
      includePatterns: ['**/*.ts'],
      excludePatterns: ['**/node_modules/**']
    });

    const callback = jest.fn();
    watcher.start('/workspace', callback);

    watcher.triggerFileChange('/workspace/node_modules/pkg/index.ts');
    watcher.flushPendingChanges();

    expect(callback).not.toHaveBeenCalled();
  });
});
