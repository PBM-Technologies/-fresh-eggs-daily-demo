/** Read an image file and return a compressed JPEG data URL no larger than maxSize px on its long edge. */
export function compressImage(file: File, maxSize = 360, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that photo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That photo format is not supported.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not process that photo.'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function downloadText(filename: string, text: string, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseMoney(v: string): number | null {
  const n = Number(v.replace(/[^0-9.]/g, ''));
  return v.trim() === '' || !Number.isFinite(n) ? null : Math.round(n * 100) / 100;
}
export function parseNum(v: string): number | null {
  const n = Number(v.replace(/[^0-9.]/g, ''));
  return v.trim() === '' || !Number.isFinite(n) ? null : n;
}
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
