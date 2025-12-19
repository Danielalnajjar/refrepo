/**
 * Path utilities for cross-platform compatibility
 *
 * The `ignore` package expects forward-slash paths (gitignore style),
 * but `path.relative()` returns backslashes on Windows.
 */

/**
 * Convert a path to POSIX-style (forward slashes)
 *
 * This ensures ignore patterns work correctly on Windows where
 * path.relative() returns backslash-separated paths.
 *
 * @example
 * toPosixPath('foo\\bar\\baz') // => 'foo/bar/baz'
 * toPosixPath('foo/bar/baz')   // => 'foo/bar/baz'
 */
export function toPosixPath(p: string): string {
  return p.replaceAll('\\', '/');
}
