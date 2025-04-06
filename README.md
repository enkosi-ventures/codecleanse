# CodeCleanse

**CodeCleanse** is a browser-based, front-end–only tool that cleans up code repositories by removing unwanted files, sensitive data, binaries, caches, and media files. Originally designed to prepare repositories for LLM analysis, CodeCleanse also serves as a general repository sanitization tool—helping you publish clean, secure code whether you're open-sourcing a project or preparing for a public release.

## Features

- **Gitignore-Based Filtering:**  
  Automatically filters files and folders based on both user-supplied and standard .gitignore rules (e.g., `node_modules`, build directories).

- **Sensitive Data Obfuscation:**  
  Detects and replaces API keys, tokens, and personal information using standard regex patterns.

- **Binary, Cache, and Media File Removal:**  
  Cleans out binaries, compiled objects, caches, and media files to streamline your repository.

- **Dual Export Options:**  
  Export your cleaned repository as a zip archive or as a concatenated document with annotated file paths.

- **Manual File Override:**  
  Review and adjust the automatic cleaning decisions with an interactive file override panel.

- **Light Ad Integration:**  
  Built-in support for ad placements to facilitate monetization through external or internal ads.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.