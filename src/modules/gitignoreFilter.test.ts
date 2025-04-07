import { describe, it, expect } from 'vitest';
import { applyGitignoreRules } from './gitignoreFilter';

describe('applyGitignoreRules', () => {
  const standardRules = ['node_modules/', '*.log', 'build/'];
  const rulesWithNegation = ['*.js', '!src/important.js', 'dist/', '!dist/keep.txt', '.hidden/'];
  const rootRules = ['/config.yaml', '/data/', 'dist/']; // `/config.yaml` should only match at root

  // --- Basic Cases ---
  it('should ignore files matching standard rules', () => {
    expect(applyGitignoreRules('node_modules/package/index.js', standardRules, true).excluded).toBe(true);
    expect(applyGitignoreRules('debug.log', standardRules, true).excluded).toBe(true);
    expect(applyGitignoreRules('build/output/file', standardRules, true).excluded).toBe(true);
  });

  it('should not ignore files not matching any rules', () => {
    expect(applyGitignoreRules('src/index.ts', standardRules, true).excluded).toBe(false);
    expect(applyGitignoreRules('README.md', standardRules, true).excluded).toBe(false);
  });

  it('should respect the useGitignore flag', () => {
    expect(applyGitignoreRules('node_modules/package/index.js', standardRules, false).excluded).toBe(false); // Rule exists but flag is false
    expect(applyGitignoreRules('debug.log', standardRules, false).excluded).toBe(false);
  });

  // --- Negation ---
  it('should handle negation rules correctly', () => {
    // Micromatch default for *.js matches anywhere
    expect(applyGitignoreRules('test.js', rulesWithNegation, true).excluded).toBe(true);
    expect(applyGitignoreRules('src/other.js', rulesWithNegation, true).excluded).toBe(true); // *.js still matches
    // Negation applies
    expect(applyGitignoreRules('src/important.js', rulesWithNegation, true).excluded).toBe(false);
    // Directory match
    expect(applyGitignoreRules('dist/temp.txt', rulesWithNegation, true).excluded).toBe(true);
    expect(applyGitignoreRules('dist/subdir/file', rulesWithNegation, true).excluded).toBe(true); // dist/**
    // Directory negation
    expect(applyGitignoreRules('dist/keep.txt', rulesWithNegation, true).excluded).toBe(false);

     // Test hidden files matching directory pattern
     expect(applyGitignoreRules('.hidden/file', rulesWithNegation, true).excluded).toBe(true);
     expect(applyGitignoreRules('.hidden/', rulesWithNegation, true).excluded).toBe(true);
});

  // --- Directory Matching ---
  it('should correctly match directories', () => {
    const rules = ['logs/', 'temp/data/', '.metadata']; // Add a dotfile pattern
    expect(applyGitignoreRules('logs/error.log', rules, true).excluded).toBe(true);
    expect(applyGitignoreRules('logs/subdir/debug.log', rules, true).excluded).toBe(true);
    expect(applyGitignoreRules('temp/data/file.bin', rules, true).excluded).toBe(true);
    expect(applyGitignoreRules('temp/data/', rules, true).excluded).toBe(true); // Match dir itself
    expect(applyGitignoreRules('temp/other/file', rules, true).excluded).toBe(false);
    expect(applyGitignoreRules('notlogs/file', rules, true).excluded).toBe(false);
    expect(applyGitignoreRules('.metadata', rules, true).excluded).toBe(true); // Match dotfile exactly
});

  // --- Standard Ignores (.git) ---
  it('should always ignore .git directory and its contents', () => {
    expect(applyGitignoreRules('.git/config', [], true).excluded).toBe(true);
    expect(applyGitignoreRules('.git/hooks/pre-commit', ['!.git/hooks/pre-commit'], true).excluded).toBe(true); // Standard ignore overrides negation
    expect(applyGitignoreRules('src/.git/config', [], true).excluded).toBe(true); // .git anywhere
  });

  // --- Root Matching ---
  // Micromatch default behavior for patterns without '/' matches anywhere.
  // To enforce root matching like gitignore's `/pattern`, we rely on micromatch's interpretation.
  // A pattern like '/file' in gitignore would often be written as 'file' in micromatch patterns when matching against relative paths starting from the root.
  // Our current implementation doesn't explicitly handle the leading '/' removal, assuming micromatch handles it correctly or that root patterns are less common/critical for this tool's purpose compared to directory/wildcard matches.
  // Adding tests based on expected micromatch behavior:
  it('should handle root-relative patterns (micromatch interpretation)', () => {
    // '/config.yaml' should ideally only match 'config.yaml' at the root.
    // Micromatch's interpretation of 'config.yaml' (from '/config.yaml') might match anywhere by default.
    // Let's test the current behavior:
    expect(applyGitignoreRules('config.yaml', rootRules, true).excluded).toBe(true); // Should match 'config.yaml'
    // This test might *fail* with strict gitignore `/` interpretation if micromatch matches `config.yaml` anywhere.
    // Depending on exact micromatch setup, `src/config.yaml` might also match `config.yaml`.
    // If stricter root matching is needed, the pattern transformation in gitignoreFilter.ts needs adjustment.
    expect(applyGitignoreRules('src/config.yaml', rootRules, true).excluded).toBe(false); // Should NOT match according to gitignore / rules

    // Rule '/data/' -> patterns 'data', 'data/**'
    expect(applyGitignoreRules('data/file.txt', rootRules, true).excluded).toBe(true);
    expect(applyGitignoreRules('data/', rootRules, true).excluded).toBe(true);
    expect(applyGitignoreRules('src/data/file.txt', rootRules, true).excluded).toBe(false);

    // Rule 'dist/' -> patterns 'dist', 'dist/**' (matches anywhere if no leading slash)
    // But rootRules has it, so it should match only 'dist/' at root?
    // Let's re-test the rule `dist/` when added without the leading slash
    const nonRootDistRule = ['dist/'];
    expect(applyGitignoreRules('dist/file.js', nonRootDistRule, true).excluded).toBe(true);
  });

  // --- Edge Cases ---
  it('should handle empty rules array', () => {
    expect(applyGitignoreRules('src/index.ts', [], true).excluded).toBe(false);
  });

  it('should ignore comments and empty lines in rules', () => {
    const rules = ['# Temporary files', '', '*.tmp', ' '];
    expect(applyGitignoreRules('file.tmp', rules, true).excluded).toBe(true);
    expect(applyGitignoreRules('other.txt', rules, true).excluded).toBe(false);
  });
});