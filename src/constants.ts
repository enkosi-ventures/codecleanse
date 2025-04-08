// --- File Processing & Filtering ---
export const DEFAULT_PRE_FILTER_FOLDERS: ReadonlySet<string> = new Set([
    '.git', 'node_modules', 'vendor', 'target', 'dist', 'build',
    'bin', 'obj', 'venv', '.venv', 'env', '__pycache__',
]);
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit for reading content initially
export const MAX_TOTAL_SIZE_BYTES = 100 * 1024 * 1024; // 100MB overall limit

// --- Configuration Defaults ---
export const DEFAULT_REDACTION_PLACEHOLDER = '[REDACTED]';
export const DEFAULT_USE_GITIGNORE = true;

// --- Storage ---
export const CONFIG_STORAGE_KEY = 'codecleanse_config_v1';

// --- Export ---
export const EXPORT_ZIP_FILENAME = 'codecleanse_export.zip';
export const EXPORT_TEXT_FILENAME = 'codecleanse_export.txt';

// --- Advertising ---
export const AD_ENABLED = true;
export const AD_PROMO_URL = "https://darkthemer.com";
export const AD_IMAGE_FILENAME = "darkthemer_ad_banner.png";
export const AD_IMAGE_ALT = "DarkThemer - Transform any UI into an elegant dark theme in seconds";
export const AD_IMAGE_SRC = import.meta.env.BASE_URL + AD_IMAGE_FILENAME;

export const AD_EVENT_CATEGORY = "Internal Ad";
export const AD_EVENT_ACTION = "Click";
export const AD_EVENT_LABEL = "Dark Themer Banner";