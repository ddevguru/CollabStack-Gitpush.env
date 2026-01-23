/**
 * WhatsApp Code Sharing Utility
 * Formats and shares code snippets via WhatsApp
 */

interface ShareOptions {
  code: string;
  fileName?: string;
  language?: string;
  shareType?: 'selected' | 'full';
  includeLineNumbers?: boolean;
}

export const shareCodeToWhatsApp = (options: ShareOptions): void => {
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

  // Create WhatsApp message
  const languageLabel = language ? ` (${language})` : '';
  const shareTypeLabel = shareType === 'selected' ? 'Selected Code' : 'Full File';
  
  const message = `*${shareTypeLabel}${languageLabel}*\n` +
    `📁 *File:* ${fileName}\n\n` +
    `\`\`\`${language || ''}\n${formattedCode}\n\`\`\`\n\n` +
    `_Shared from CollabStack IDE_`;

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // Create WhatsApp URL
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  
  // Open WhatsApp in new tab
  window.open(whatsappUrl, '_blank');
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

