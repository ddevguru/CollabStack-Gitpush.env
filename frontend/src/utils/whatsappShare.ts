/**
 * WhatsApp Code Sharing Utility
 * Creates a compressed ZIP file and shares it via WhatsApp
 */

import JSZip from 'jszip';

interface ShareOptions {
  code: string;
  fileName?: string;
  language?: string;
  shareType?: 'selected' | 'full';
  includeLineNumbers?: boolean;
}

export const shareCodeToWhatsApp = async (options: ShareOptions): Promise<void> => {
  const {
    code,
    fileName = 'code',
    language = '',
    shareType = 'selected',
    includeLineNumbers = false,
  } = options;

  if (!code || code.trim().length === 0) {
    throw new Error('No code to share');
  }

  try {
    // Format code with line numbers if requested
    let formattedCode = code;
    if (includeLineNumbers) {
      const lines = code.split('\n');
      const maxLineNumWidth = String(lines.length).length;
      formattedCode = lines
        .map((line, index) => {
          const lineNum = String(index + 1).padStart(maxLineNumWidth, ' ');
          return `${lineNum} | ${line}`;
        })
        .join('\n');
    }

    // Determine file extension based on language
    const extMap: Record<string, string> = {
      'javascript': 'js',
      'typescript': 'ts',
      'python': 'py',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'markdown': 'md',
      'bash': 'sh',
      'shell': 'sh',
    };
    const ext = extMap[language.toLowerCase()] || 'txt';
    const baseFileName = fileName.split('/').pop() || fileName;
    const fullFileName = baseFileName.includes('.') ? baseFileName : `${baseFileName}.${ext}`;

    // Create a ZIP file with the code
    const zip = new JSZip();
    zip.file(fullFileName, formattedCode);

    // Generate ZIP file as Blob
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    
    // Create download link for the ZIP file
    const zipFileName = `${baseFileName.replace(/\.[^/.]+$/, '') || 'code'}.zip`;
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);

    // Create WhatsApp message
    const languageLabel = language ? ` (${language})` : '';
    const shareTypeLabel = shareType === 'selected' ? 'Selected Code' : 'Full File';
    
    const message = `*${shareTypeLabel}${languageLabel}*\n` +
      `📁 *File:* ${zipFileName}\n\n` +
      `Compressed file downloaded! Please attach the ZIP file to share.\n\n` +
      `_Shared from CollabStack IDE_`;

    // Create WhatsApp URL with message
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open WhatsApp after a short delay to allow download
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 500);
  } catch (error) {
    console.error('Error sharing code:', error);
    // Fallback to text sharing if ZIP creation fails
    const languageLabel = language ? ` (${language})` : '';
    const shareTypeLabel = shareType === 'selected' ? 'Selected Code' : 'Full File';
    
    const message = `*${shareTypeLabel}${languageLabel}*\n` +
      `📁 *File:* ${fileName}\n\n` +
      `\`\`\`${language || ''}\n${code.substring(0, 1000)}${code.length > 1000 ? '...' : ''}\n\`\`\`\n\n` +
      `_Shared from CollabStack IDE_`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }
};

/**
 * Get selected code from Monaco Editor
 */
export const getSelectedCodeFromMonaco = (editorRef: any): string | null => {
  if (!editorRef?.current) {
    return null;
  }

  const editor = editorRef.current;
  const selection = editor.getSelection();
  
  if (!selection || selection.isEmpty()) {
    return null;
  }

  const selectedText = editor.getModel()?.getValueInRange(selection);
  return selectedText || null;
};

/**
 * Get entire file content from Monaco Editor
 */
export const getFullCodeFromMonaco = (editorRef: any): string | null => {
  if (!editorRef?.current) {
    return null;
  }

  const editor = editorRef.current;
  return editor.getValue() || null;
};

/**
 * Detect language from file extension
 */
export const detectLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sh: 'bash',
    bash: 'bash',
    sql: 'sql',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    json: 'json',
    xml: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
    md: 'markdown',
    vue: 'vue',
    dart: 'dart',
    lua: 'lua',
    perl: 'perl',
    r: 'r',
    matlab: 'matlab',
  };

  return langMap[ext] || ext || 'text';
};
