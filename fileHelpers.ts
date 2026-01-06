import mammoth from 'mammoth';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const extractTextFromDocx = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    return "";
  }
};

export interface ProcessedFilePart {
  inlineData?: {
    data: string;
    mimeType: string;
  };
  text?: string;
}

export const processFiles = async (files: File[]): Promise<ProcessedFilePart[]> => {
  const parts: ProcessedFilePart[] = [];
  
  for (const file of files) {
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      const base64 = await fileToBase64(file);
      parts.push({
        inlineData: {
          data: base64,
          mimeType: file.type
        }
      });
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
       const text = await extractTextFromDocx(file);
       if (text) {
         parts.push({ text: `\n[Content from Word Document: ${file.name}]\n${text}\n` });
       }
    } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
       const text = await readFileAsText(file);
       parts.push({ text: `\n[Content from Text File: ${file.name}]\n${text}\n` });
    }
  }
  return parts;
};