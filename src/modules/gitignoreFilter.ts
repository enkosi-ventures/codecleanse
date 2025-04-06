import micromatch from 'micromatch';

// Standard patterns to always ignore (like .git)
const STANDARD_IGNORE_PATTERNS = [
  '**/.git/**', // Ignore all contents within .git directories
  '.git',       // Ignore the .git directory itself if at the root
];

// Function to apply gitignore rules. Returns true if the path should be excluded.
export function applyGitignoreRules(
  filePath: string,
  userRules: string[],
  useGitignore: boolean // Flag to enable/disable user rules
): { excluded: boolean; reason: string } {

  // Always check standard ignores first
  if (micromatch.isMatch(filePath, STANDARD_IGNORE_PATTERNS)) {
    return { excluded: true, reason: 'Standard Ignore (.git)' };
  }

  if (!useGitignore || userRules.length === 0) {
    return { excluded: false, reason: '' }; // No user rules to apply or disabled
  }

  // Gitignore matching logic:
  // Micromatch needs patterns adjusted slightly from standard .gitignore:
  // - `dir/` should match the directory and its contents: `dir/**`
  // - `file.txt` should match anywhere: `**/file.txt` (micromatch default behavior)
  // - `/file.txt` should match only at the root: `file.txt` (when matching against relative paths)
  // - `!pattern` means negation.

  const patterns: string[] = [];
  const negatePatterns: string[] = [];

  userRules.forEach(rule => {
    if (rule.startsWith('#') || rule.trim() === '') {
      return;
    }

    let isNegate = false;
    if (rule.startsWith('!')) {
      isNegate = true;
      rule = rule.substring(1);
    }

    // Handle directory matching (`dir/`)
    if (rule.endsWith('/')) {
      rule = rule + '**'; // Match directory and contents
    }
    // Handle root matching (`/file`) - micromatch matches root if no '/' present
    // If rule starts with '/', remove it for micromatch unless it's the only char
    if (rule.startsWith('/') && rule.length > 1) {
      // This is tricky. Micromatch default matches root if no slashes.
      // If the gitignore rule WAS /foo/bar, we likely want to match exactly that path.
      // Keep the leading slash for exact path matching from root? Micromatch might handle this okay.
      // Let's test without modifying this first. If needed, remove leading slash for root matching.
      // rule = rule.substring(1);
    } else if (!rule.includes('/')) {
      // If it's just `file.txt` or `*.log`, match anywhere
      // This is micromatch's default, but explicit `**` can clarify intent.
      // rule = '**/' + rule; // Let's rely on micromatch default for this.
    }


    if (isNegate) {
      negatePatterns.push(rule);
    } else {
      patterns.push(rule);
    }
  });

  // Check positive patterns first
  if (micromatch.isMatch(filePath, patterns)) {
    // Now check if a later negation rule overrides the match
    if (micromatch.isMatch(filePath, negatePatterns)) {
      return { excluded: false, reason: '' }; // Negated, so include
    }
    return { excluded: true, reason: 'Gitignore Rule' }; // Matched positive, not negated
  }

  // Not matched by any positive pattern
  return { excluded: false, reason: '' };
}
