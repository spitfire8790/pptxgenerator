import React, { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import supabase from '../../lib/supabase';

const IssueModal = ({ isOpen, onClose }) => {
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(file => {
            const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
            const isValidType = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type);
            return isValidSize && isValidType;
        });

        if (validFiles.length !== files.length) {
            setError('Some files were skipped. Images must be under 10MB and in JPG, PNG, or GIF format.');
        }

        setImages(prevImages => [...prevImages, ...validFiles]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Upload images first if any
            const imageUrls = [];
            for (const image of images) {
                const fileName = `${Date.now()}-${image.name}`;
                const { data, error: uploadError } = await supabase.storage
                    .from('issue-images')
                    .upload(fileName, image);

                if (uploadError) throw uploadError;
                imageUrls.push(data.path);
            }

            // Create the issue record
            const { error: issueError } = await supabase
                .from('issues')
                .insert([{
                    name: name || null,
                    subject,
                    description,
                    image_urls: imageUrls,
                    created_at: new Date().toISOString()
                }]);

            if (issueError) throw issueError;

            // Reset form and close modal
            setName('');
            setSubject('');
            setDescription('');
            setImages([]);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        Log Issue
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name (Optional)
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-2 border rounded-md"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Subject *
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full p-2 border rounded-md"
                                placeholder="Issue subject"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description *
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-2 border rounded-md"
                                rows="4"
                                placeholder="Describe the issue"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Attach Images (Optional)
                            </label>
                            <div className="flex items-center space-x-2">
                                <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-md border flex items-center">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Choose Files
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/jpeg,image/png,image/gif"
                                        multiple
                                        onChange={handleImageUpload}
                                    />
                                </label>
                                <span className="text-sm text-gray-500">
                                    {images.length} file(s) selected
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Max 10MB per image. JPG, PNG, or GIF only.
                            </p>
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-2 bg-blue-600 text-white rounded-md
                                    ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                            >
                                {loading ? 'Submitting...' : 'Submit Issue'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default IssueModal;
