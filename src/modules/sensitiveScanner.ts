// Basic Regex patterns for common secrets - THIS IS NOT EXHAUSTIVE OR FOOLPROOF!
// Consider enhancing these or using more sophisticated detection libraries if needed.
const patterns = {
  AWS_ACCESS_KEY_ID: /AKIA[0-9A-Z]{16}/g,
  AWS_SECRET_ACCESS_KEY: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g, // Avoid base64 blocks
  GENERIC_SECRET: /(\b\w*(?:secret|private|key)\w*\b["']?\s*[:=]\s*['"])([a-zA-Z0-9-_.]{12,})(['"])/gi,
  GITHUB_TOKEN: /ghp_[a-zA-Z0-9]{20,}/g, // GitHub Personal Access Token (New Format)
  GITHUB_OAUTH: /gho_[a-zA-Z0-9]{20,}/g,
  GITHUB_USER_TO_SERVER: /ghu_[a-zA-Z0-9]{20,}/g,
  GITHUB_SERVER_TO_SERVER: /ghs_[a-zA-Z0-9]{20,}/g,
  OPENAI_TOKEN: /sk-[A-Za-z0-9-_]*[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/g,
  SLACK_TOKEN: /(?:xox[pboa]r?-[0-9]{10,12}-[0-9]{10,12}-[0-9]{10,12}-[a-z0-9]{32})/g,
  STRIPE_KEY: /sk_live_[0-9a-zA-Z]{24,}/g, // Stripe Live Key
  TWILIO_SID: /AC[a-zA-Z0-9]{32}/g,
  TWILIO_AUTH_TOKEN: /SK[a-zA-Z0-9]{32}/g, // Can overlap with generic key, place carefully
  // Potential Generic Secret (High entropy string often indicates a secret)
  // This is prone to false positives, use with caution or refinement
  // GENERIC_SECRET: /(?<![A-Za-z0-9/+=])([A-Za-z0-9/+_-]{20,})(?![A-Za-z0-9/+=])/g,
};

// Function to scan content and replace findings
export function scanAndRedact(content: string, placeholder: string): { redactedContent: string; sensitiveFound: boolean } {
  let redactedContent = content;
  let sensitiveFound = false;

  for (const [key, regex] of Object.entries(patterns)) {
    // Use replace with a function to only set sensitiveFound if a match actually occurs
    let matchOccurred = false;
    redactedContent = redactedContent.replace(regex, (_, group1, __, group3) => {
      matchOccurred = true;
      if (group1 !== undefined && group3 !== undefined) {
        return `${group1}${placeholder}${group3}`;
      }
      return placeholder; // Use the generic placeholder
    });

    if (matchOccurred) {
      sensitiveFound = true;
      console.log(`Sensitive pattern found: ${key}`);
    }
  }

  return { redactedContent, sensitiveFound };
}
