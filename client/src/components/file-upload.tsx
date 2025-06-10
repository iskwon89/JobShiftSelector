import { useState } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseExcelFile } from '@/lib/excel-parser';
import { apiRequest } from '@/lib/queryClient';
import { InsertEmployee } from '@shared/schema';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  const handleFile = async (file: File) => {
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setUploadStatus('error');
      setUploadMessage('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      // Parse Excel file
      const employees: InsertEmployee[] = await parseExcelFile(file);
      
      // Send parsed data to backend
      await apiRequest('POST', '/api/employees/bulk', employees);
      
      setUploadStatus('success');
      setUploadMessage(`Successfully uploaded ${employees.length} employee records`);
      onUploadSuccess();
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Employee Database (Excel File)
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : uploadStatus === 'success'
            ? 'border-green-400 bg-green-50'
            : uploadStatus === 'error'
            ? 'border-red-400 bg-red-50'
            : 'border-slate-300 hover:border-blue-400'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => document.getElementById('excel-file')?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-600 font-medium">Processing Excel file...</p>
          </div>
        ) : uploadStatus === 'success' ? (
          <div className="flex flex-col items-center">
            <Check className="mx-auto h-12 w-12 text-green-400 mb-4" />
            <p className="text-green-600 font-medium">{uploadMessage}</p>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="flex flex-col items-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-600 font-medium">{uploadMessage}</p>
            <p className="text-sm text-slate-500 mt-1">Click to try again</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <p className="text-slate-600 font-medium">Upload Excel file or click to browse</p>
            <p className="text-sm text-slate-500 mt-1">Supports .xlsx, .xls files</p>
          </>
        )}
        
        <input
          type="file"
          id="excel-file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
      
      {uploadStatus === 'idle' && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <p className="text-sm font-medium text-slate-700 mb-2">Excel File Format:</p>
          <div className="text-sm text-slate-600">
            <p>Required columns: ID, Name, Eligible, Cohort</p>
            <p className="text-xs text-slate-500 mt-1">
              • ID: Employee ID (text/number)<br/>
              • Name: Full name<br/>
              • Eligible: TRUE/FALSE or 1/0<br/>
              • Cohort: A, B, C, etc. (optional if not eligible)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
