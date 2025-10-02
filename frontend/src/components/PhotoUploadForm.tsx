import React, { useState } from 'react';

interface PhotoUploadFormProps {
  jobId: string;
  onUpload: (jobId: string, file: File, caption: string) => void;
  uploading: boolean;
}

const PhotoUploadForm: React.FC<PhotoUploadFormProps> = ({ jobId, onUpload, uploading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-generate caption from filename if empty
      if (!caption) {
        setCaption(file.name.split('.')[0].replace(/[-_]/g, ' '));
      }
      // Upload in background without blocking UI
      setTimeout(() => {
        onUpload(jobId, file, caption || file.name.split('.')[0].replace(/[-_]/g, ' '));
        // Reset form after upload starts
        setSelectedFile(null);
        setCaption('');
      }, 100);
    }
  };

  return (
    <div className="space-y-4">
      {/* Take Photo Button */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Take Photo</label>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <div className="bg-darker-blue hover:bg-blue-700 text-white px-4 py-4 rounded-lg border-2 border-dashed border-blue-400 cursor-pointer text-center transition-colors">
            <div className="text-2xl mb-2">📷</div>
            <div className="font-medium">
              {selectedFile ? 'Photo Captured!' : 'Tap to Take Photo'}
            </div>
            <div className="text-sm opacity-80 mt-1">
              {selectedFile ? 'Uploading in background...' : 'Camera will open'}
            </div>
          </div>
        </div>
        {selectedFile && (
          <div className="mt-3 p-3 bg-green-900 bg-opacity-30 rounded-lg border border-green-500">
            <div className="flex items-center justify-center text-green-300">
              <div className="text-green-400 mr-2">✓</div>
              Photo captured! Uploading in background...
            </div>
          </div>
        )}
        {uploading && (
          <div className="mt-3 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-500">
            <div className="flex items-center justify-center text-blue-300">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300 mr-2"></div>
              Uploading photo...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoUploadForm;
