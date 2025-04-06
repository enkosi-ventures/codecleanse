import { describe, it, expect } from 'vitest';
import { scanAndRedact } from './sensitiveScanner';

describe('scanAndRedact', () => {
  const placeholder = '[REDACTED]';

  it('should redact AWS Access Key ID', () => {
    const content = 'key: AKIAIOSFODNN7EXAMPLE';
    const { redactedContent, sensitiveFound } = scanAndRedact(content, placeholder);
    expect(sensitiveFound).toBe(true);
    expect(redactedContent).toBe(`key: ${placeholder}`);
  });

  it('should redact AWS Secret Access Key', () => {
    const content = 'secret = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"'; // 40 chars
    const { redactedContent, sensitiveFound } = scanAndRedact(content, placeholder);
    expect(sensitiveFound).toBe(true);
    expect(redactedContent).toBe(`secret = "${placeholder}"`);
  });

  it('should NOT redact things that look like base64 but not AWS Secret Key', () => {
    const content = 'data: "dGhpc2lzYXNhbXBsZW9mYmFzZTY0c3RyaW5nZm9ydGVzdGluZw=="'; // Normal base64
    const { redactedContent, sensitiveFound } = scanAndRedact(content, placeholder);
    // Assuming GENERIC_SECRET is commented out or refined, this should not match AWS key
    expect(sensitiveFound).toBe(false);
    expect(redactedContent).toBe(content);
  });

  it('should redact generic API keys in quotes/assignments', () => {
    const content1 = 'config.apiKey = "aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890aBcD"'; // 40 chars
    const content2 = 'const my_api_key = \'another-secret-key-longer-than-32-chars-maybe-with-dots.and_underscores\'';
    const content3 = 'API_KEY="shortkey"'; // Too short
    const content4 = '{"service_key": "key-value-pair-secret-1234567890abcdefghijklm"}';

    const res1 = scanAndRedact(content1, placeholder);
    expect(res1.sensitiveFound, "Test 1").toBe(true);
    expect(res1.redactedContent, "Test 1").toBe(`config.apiKey = "${placeholder}"`);

    const res2 = scanAndRedact(content2, placeholder);
    expect(res2.sensitiveFound, "Test 2").toBe(true);
    expect(res2.redactedContent, "Test 2").toBe(`const my_api_key = '${placeholder}'`);

    const res3 = scanAndRedact(content3, placeholder);
    expect(res3.sensitiveFound, "Test 3").toBe(false); // Key is too short
    expect(res3.redactedContent, "Test 3").toBe(content3);

    const res4 = scanAndRedact(content4, placeholder);
    expect(res4.sensitiveFound, "Test 4").toBe(true);
    expect(res4.redactedContent, "Test 4").toBe(`{"service_key": "${placeholder}"}`);
  });

  it('should redact GitHub tokens (various types)', () => {
    const content = `
            PAT: ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZaBcDeFgHiJkL
            OAuth: gho_anotherFakeToken1234567890abcdefghij
            User2Server: ghu_userToServerTokenExample12345678901
            Server2Server: ghs_serverToServerTokenExample123456789
        `;
    const { redactedContent, sensitiveFound } = scanAndRedact(content, placeholder);
    expect(sensitiveFound).toBe(true);
    expect(redactedContent).toContain(`PAT: ${placeholder}`);
    expect(redactedContent).toContain(`OAuth: ${placeholder}`);
    expect(redactedContent).toContain(`User2Server: ${placeholder}`);
    expect(redactedContent).toContain(`Server2Server: ${placeholder}`);
  });

  it('should redact Slack tokens', () => {
    const content = 'token=xoxp-123456789012-123456789012-123456789012-abcdefghijklmnopqrstuvwxyz123456; type=bot';
    const { redactedContent, sensitiveFound } = scanAndRedact(content, placeholder);
    expect(sensitiveFound).toBe(true);
    expect(redactedContent).toBe(`token=${placeholder}; type=bot`);
  });

  it('should redact Stripe keys', () => {
    const content = 'STRIPE_SECRET=sk_live_abcdefghijklmnopqrstuvwx'; // 24 chars after sk_live_
    const { redactedContent, sensitiveFound } = scanAndRedact(content, placeholder);
    expect(sensitiveFound).toBe(true);
    expect(redactedContent).toBe(`STRIPE_SECRET=${placeholder}`);
  });

  it('should redact Twilio SIDs and Auth Tokens', () => {
    const content = `
            AccountSid = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx123;
            AuthToken = SKyyyyyyyyyyyyyyyyyyyyyyyyyyyyy456;
        `;
    const { redactedContent, sensitiveFound } = scanAndRedact(content, placeholder);
    expect(sensitiveFound).toBe(true);
    expect(redactedContent).toContain(`AccountSid = ${placeholder};`);
    // Note: Twilio Auth Token (SK...) might be caught by generic key regex first if not carefully ordered or if patterns overlap significantly. Test assumes specific Twilio patterns run.
    expect(redactedContent).toContain(`AuthToken = ${placeholder};`);
  });

  it('should handle content with no secrets', () => {
    const content = 'This is normal text with no secrets.\nconst variable = 123;\nURL = "https://example.com"';
    const { redactedContent, sensitiveFound } = scanAndRedact(content, placeholder);
    expect(sensitiveFound).toBe(false);
    expect(redactedContent).toBe(content);
  });

  it('should handle content with multiple secrets', () => {
    const content = `
            AWS Key: AKIAIOSFODNN7EXAMPLE
            Some code...
            Secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            GitHub: ghp_anotherTokenExample1234567890abcdef
        `;
    const { redactedContent, sensitiveFound } = scanAndRedact(content, placeholder);
    expect(sensitiveFound).toBe(true);
    expect(redactedContent).toContain(`AWS Key: ${placeholder}`);
    expect(redactedContent).toContain(`Secret: "${placeholder}"`);
    expect(redactedContent).toContain(`GitHub: ${placeholder}`);
  });

  // Optional: Test GENERIC_SECRET if uncommented and refined
  // it('should redact potential generic secrets (use with caution)', () => {
  //     const content = 'PossibleSecretValue_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'; // High entropy
  //     // Needs GENERIC_SECRET regex enabled in sensitiveScanner.ts
  //     const { redactedContent, sensitiveFound } = scanAndRedact(content, placeholder);
  //     // Assertions depend on the exact regex used
  // });
});