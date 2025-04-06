import JSZip from 'jszip';
import { ProcessedData } from '../types';

export async function generateZip(filesToExport: ProcessedData['filesToExport']): Promise<Blob> {
  const zip = new JSZip();

  filesToExport.forEach(file => {
    zip.file(file.path, file.content);
  });

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6, // Balance between speed and compression (1-9)
    },
  });

  return zipBlob;
}

export function generateConcatenatedText(filesToExport: ProcessedData['filesToExport']): Blob {
  let concatenatedContent = '--- START OF CODECLEANSE EXPORT ---\n\n';
  const encoder = new TextEncoder(); // For consistent UTF-8 encoding

  filesToExport.forEach(file => {
    concatenatedContent += `--- START FILE: ${file.path} ---\n`;

    if (typeof file.content === 'string') {
      concatenatedContent += file.content;
    } else if (file.content instanceof ArrayBuffer) {
      // Represent binary content as a placeholder or base64 if needed
      // For LLMs, binary content is usually not useful, so a placeholder is better.
      const byteLength = file.content.byteLength;
      concatenatedContent += `[Binary content (${byteLength} bytes) - Not included in text export]`;
      // Alternatively, Base64 encode (can be very large):
      // const base64String = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(file.content))));
      // concatenatedContent += base64String;
    } else {
      concatenatedContent += '[Content not available or unreadable]';
    }


    concatenatedContent += `\n--- END FILE: ${file.path} ---\n\n`;
  });

  concatenatedContent += '--- END OF CODECLEANSE EXPORT ---\n';

  const textBlob = new Blob([encoder.encode(concatenatedContent)], { type: 'text/plain;charset=utf-8' });
  return textBlob;
}