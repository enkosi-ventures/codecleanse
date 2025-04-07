import micromatch from 'micromatch';

const STANDARD_IGNORE_PATTERNS = [
  '**/.git/**',
  // '.git',
];

export function applyGitignoreRules(
  filePath: string, // Assumed to be relative path from root, e.g., 'src/file.js'
  userRules: string[],
  useGitignore: boolean
): { excluded: boolean; reason: string } {

  const options = { dot: true };

  if (micromatch.isMatch(filePath, STANDARD_IGNORE_PATTERNS, options)) { // Add dot:true for .git
    return { excluded: true, reason: 'Standard Ignore (.git)' };
  }

  if (!useGitignore || userRules.length === 0) {
    return { excluded: false, reason: '' };
  }

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

    // Trim whitespace which might affect patterns
    rule = rule.trim();

    // --- NEW: Track if rule is root-relative ---
    let isRoot = false;
    if (rule.startsWith('/')) {
      isRoot = true;
      // Remove the leading slash but preserve that it's a root-relative rule.
      rule = rule.substring(1);
    }

    // ** Micromatch Pattern Adjustments **

    // 1. Directory pattern: `foo/` should match `foo` and `foo/**`
    if (rule.endsWith('/')) {
      // Remove trailing slash for base match
      rule = rule.substring(0, rule.length - 1);
      // Add both the directory name and its contents pattern
      const dirPattern = rule;
      const contentsPattern = `${rule}/**`;
      if (isNegate) {
        negatePatterns.push(dirPattern, contentsPattern);
      } else {
        patterns.push(dirPattern, contentsPattern);
      }
      return; // Handled the directory case, skip default push
    }

    // 2. Default/Wildcard: For rules like `*.js` or `foo`
    // If the rule does not contain a slash and is not root-relative,
    // prepend '**/' so that it matches anywhere in the path.
    if (!rule.includes('/') && !isRoot) {
      rule = `**/${rule}`;
    }
    // Note: For root-relative patterns (isRoot === true) we leave the rule as-is,
    // ensuring it only matches at the repository root.

    // Push the (potentially modified) rule into the appropriate array.
    if (isNegate) {
      negatePatterns.push(rule);
    } else {
      patterns.push(rule);
    }
  });

  // Check positive patterns first using micromatch
  if (micromatch.isMatch(filePath, patterns, options)) {
    // Check if a negation pattern overrides the positive match.
    if (micromatch.isMatch(filePath, negatePatterns, options)) {
      return { excluded: false, reason: '' }; // Negated, so include
    }
    return { excluded: true, reason: 'Gitignore Rule' }; // Matched positive, not negated
  }

  return { excluded: false, reason: '' };
}
