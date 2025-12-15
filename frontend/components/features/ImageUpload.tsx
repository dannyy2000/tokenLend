'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Image from 'next/image';

interface ImageUploadProps {
    onImagesUploaded: (files: File[]) => void;
}

export function ImageUpload({ onImagesUploaded }: ImageUploadProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles((prev) => [...prev, ...acceptedFiles]);

        // Create preview URLs
        acceptedFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                setPreviews((prev) => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
        },
        maxFiles: 5,
    });

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleContinue = () => {
        if (files.length > 0) {
            onImagesUploaded(files);
        }
    };

    return (
        <Card variant="glass" className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Upload Asset Images</h2>
                <p className="text-gray-400">
                    Upload 2-5 clear photos of your asset from different angles
                </p>
            </div>

            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isDragActive
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-gray-700 hover:border-indigo-500/50 hover:bg-white/5'
                    }`}
            >
                <input {...getInputProps()} />
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                    <p className="text-lg text-indigo-400">Drop the images here...</p>
                ) : (
                    <>
                        <p className="text-lg text-gray-300 mb-2">
                            Drag & drop images here, or click to select
                        </p>
                        <p className="text-sm text-gray-500">
                            PNG, JPG, JPEG, WEBP (max 5 images)
                        </p>
                    </>
                )}
            </div>

            {/* Preview Grid */}
            {previews.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        Uploaded Images ({files.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {previews.map((preview, index) => (
                            <div key={index} className="relative group">
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-800">
                                    <Image
                                        src={preview}
                                        alt={`Preview ${index + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                                <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                                    <p className="text-xs text-white truncate">{files[index].name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex justify-between items-center">
                <div className="text-sm text-gray-400">
                    {files.length === 0 ? (
                        <span>No images uploaded yet</span>
                    ) : (
                        <span className="text-green-400">
                            ✓ {files.length} image{files.length > 1 ? 's' : ''} ready
                        </span>
                    )}
                </div>
                <Button
                    size="lg"
                    onClick={handleContinue}
                    disabled={files.length === 0}
                >
                    Continue to Details
                </Button>
            </div>

            {/* Tips */}
            <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <h4 className="text-sm font-semibold text-indigo-400 mb-2">📸 Photo Tips:</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Take photos in good lighting</li>
                    <li>• Show all sides of the asset</li>
                    <li>• Include any serial numbers or labels</li>
                    <li>• Avoid using stock photos (AI will detect them)</li>
                </ul>
            </div>
        </Card>
    );
}
