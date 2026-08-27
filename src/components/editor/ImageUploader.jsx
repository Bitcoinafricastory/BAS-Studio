'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Link2, X, ImageIcon } from 'lucide-react';

// value can be a URL string or a Blob (pending upload).
export default function ImageUploader({ value, preview, onChange, label = 'Image', aspect = 'aspect-video', compact = false }) {
  const [mode, setMode] = useState('upload');
  const [dragging, setDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState(preview || (typeof value === 'string' ? value : ''));
  const inputRef = useRef(null);

  const handleFile = useCallback(
    (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be under 5MB.');
        return;
      }
      const url = URL.createObjectURL(file);
      setLocalPreview(url);
      onChange(file, url);
    },
    [onChange]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clearImage = () => {
    setLocalPreview('');
    onChange('', '');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <div className="flex gap-1 bg-black/40 rounded-lg p-0.5">
          <button type="button" onClick={() => setMode('upload')} className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${mode === 'upload' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            <Upload size={13} /> Upload
          </button>
          <button type="button" onClick={() => setMode('url')} className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${mode === 'url' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            <Link2 size={13} /> URL
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => {
            setLocalPreview(e.target.value);
            onChange(e.target.value, e.target.value);
          }}
          placeholder="https://example.com/image.jpg"
          className="w-full px-4 py-3 bg-black/40 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500"
        />
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer border-2 border-dashed rounded-xl transition-all ${dragging ? 'border-yellow-500 bg-yellow-500/5' : 'border-gray-800 hover:border-gray-700'} ${compact ? 'p-4' : 'p-8'}`}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <div className="flex flex-col items-center justify-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <ImageIcon className="text-yellow-500" size={18} />
            </div>
            <p className="text-sm text-gray-400">
              <span className="text-yellow-500 font-medium">Click to upload</span> or drag and drop
            </p>
            {!compact && <p className="text-xs text-gray-600">PNG, JPG, WebP up to 5MB</p>}
          </div>
        </div>
      )}

      {localPreview && (
        <div className={`relative mt-3 rounded-lg overflow-hidden border border-gray-800 ${aspect}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={localPreview} alt="Preview" className="w-full h-full object-cover" />
          <button type="button" onClick={clearImage} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-red-500/80 flex items-center justify-center text-white transition-colors">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
