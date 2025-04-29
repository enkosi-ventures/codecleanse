import { ProcessableFile } from '../types';


export const getFilename = (path: string): string => path.substring(path.lastIndexOf('/') + 1);

export const createMockFile = (
  relativePath: string,
  include: boolean,
  content = 'file content',
  type = 'text/plain',
  sensitiveDetected = false,
  excludeReason?: string
): ProcessableFile => ({
  id: relativePath,
  file: new File([content], relativePath.split('/').pop() || 'file', { type: type }),
  relativePath,
  include,
  sensitiveDetected,
  excludeReason,
});
