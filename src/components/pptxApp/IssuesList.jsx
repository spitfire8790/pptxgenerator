import React, { useState, useEffect } from 'react';
import { X, ExternalLink, CheckCircle, Clock, AlertCircle, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import supabase from '../../lib/supabase';
import { checkUserClaims } from './utils/auth/tokenUtils';

const ADMIN_EMAIL = 'james.strutt@dpie.nsw.gov.au';

const IssuesList = ({ isOpen, onClose }) => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [statusUpdateLoading, setStatusUpdateLoading] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [editingIssue, setEditingIssue] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);

    const [imageUrls, setImageUrls] = useState({});

    useEffect(() => {
        if (isOpen) {
            fetchIssues();
            checkAdminStatus();
        }
    }, [isOpen]);

    useEffect(() => {
        // Load signed URLs for all images when issues change
        const loadImageUrls = async () => {
            const newUrls = {};
            for (const issue of issues) {
                if (issue.image_urls) {
                    for (const url of issue.image_urls) {
                        newUrls[url] = await getImageUrl(url);
                    }
                }
            }
            setImageUrls(newUrls);
        };
        
        loadImageUrls();
    }, [issues]);

    const checkAdminStatus = async () => {
        try {
            const user = await checkUserClaims();
            setCurrentUser(user);
            setIsAdmin(user?.email === ADMIN_EMAIL);
        } catch (err) {
            console.error('Error checking admin status:', err);
            setIsAdmin(false);
        }
    };

    const canModifyIssue = (issue) => {
        return isAdmin || (currentUser && issue.name === currentUser.name);
    };

    const handleEdit = (issue) => {
        setEditingIssue({
            ...issue,
            subject: issue.subject,
            description: issue.description
        });
    };

    const handleSaveEdit = async () => {
        try {
            const { error } = await supabase
                .from('issues')
                .update({
                    subject: editingIssue.subject,
                    description: editingIssue.description
                })
                .eq('id', editingIssue.id);

            if (error) throw error;
            
            // Update local state
            setIssues(prev => prev.map(issue => 
                issue.id === editingIssue.id 
                    ? { ...issue, subject: editingIssue.subject, description: editingIssue.description }
                    : issue
            ));
            setEditingIssue(null);
        } catch (err) {
            setError('Failed to update issue: ' + err.message);
        }
    };

    const handleDelete = async (issueId) => {
        try {
            const { error } = await supabase
                .from('issues')
                .delete()
                .eq('id', issueId);

            if (error) throw error;
            
            // Update local state
            setIssues(prev => prev.filter(issue => issue.id !== issueId));
            setDeleteConfirmation(null);
        } catch (err) {
            setError('Failed to delete issue: ' + err.message);
        }
    };

    const fetchIssues = async () => {
        try {
            const { data, error } = await supabase
                .from('issues')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setIssues(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateIssueStatus = async (issueId, newStatus) => {
        setStatusUpdateLoading(issueId);
        try {
            const { error } = await supabase
                .from('issues')
                .update({ status: newStatus })
                .eq('id', issueId);

            if (error) throw error;
            
            // Update local state
            setIssues(prev => prev.map(issue => 
                issue.id === issueId ? { ...issue, status: newStatus } : issue
            ));
        } catch (err) {
            setError('Failed to update issue status: ' + err.message);
        } finally {
            setStatusUpdateLoading(null);
        }
    };

    const getImageUrl = async (path) => {
        const { data } = await supabase.storage
            .from('issue-images')
            .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days expiry
        return data.signedUrl;
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'resolved':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'in_progress':
                return <Clock className="w-5 h-5 text-yellow-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-red-500" />;
        }
    };

    const StatusDropdown = ({ issue }) => {
        const [isOpen, setIsOpen] = useState(false);
        const statuses = ['open', 'in_progress', 'resolved'];
        
        if (!isAdmin) {
            return (
                <div className="flex items-center gap-2">
                    {getStatusIcon(issue.status)}
                    <span className="text-sm capitalize">
                        {issue.status?.replace('_', ' ') || 'Open'}
                    </span>
                </div>
            );
        }

        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={statusUpdateLoading === issue.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                    {statusUpdateLoading === issue.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    ) : (
                        <>
                            {getStatusIcon(issue.status)}
                            <span className="text-sm capitalize">
                                {issue.status?.replace('_', ' ') || 'Open'}
                            </span>
                            <ChevronDown className="w-4 h-4" />
                        </>
                    )}
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg py-1 z-10">
                        {statuses.map(status => (
                            <button
                                key={status}
                                onClick={() => {
                                    updateIssueStatus(issue.id, status);
                                    setIsOpen(false);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50"
                            >
                                {getStatusIcon(status)}
                                <span className="capitalize">{status.replace('_', ' ')}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <AlertCircle className="w-6 h-6 text-blue-600" />
                            Reported Issues
                        </h2>
                        {isAdmin && (
                            <p className="text-sm text-gray-500 mt-1">
                                Admin mode: You can update issue statuses
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-gray-600">{error}</p>
                    </div>
                ) : issues.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600">No issues have been reported yet.</p>
                    </div>
                ) : (
                    <div className="overflow-y-auto flex-1">
                        <div className="space-y-4">
                            {issues.map((issue) => (
                                <div
                                    key={issue.id}
                                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 mr-4">
                                            {editingIssue?.id === issue.id ? (
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        value={editingIssue.subject}
                                                        onChange={(e) => setEditingIssue(prev => ({ ...prev, subject: e.target.value }))}
                                                        className="w-full p-2 border rounded-md"
                                                    />
                                                    <textarea
                                                        value={editingIssue.description}
                                                        onChange={(e) => setEditingIssue(prev => ({ ...prev, description: e.target.value }))}
                                                        className="w-full p-2 border rounded-md"
                                                        rows="4"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingIssue(null)}
                                                            className="px-3 py-1 text-gray-600 hover:text-gray-800"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <h3 className="font-medium text-gray-900">{issue.subject}</h3>
                                                    <p className="text-sm text-gray-500">
                                                        Reported by {issue.name || 'Anonymous'} on {formatDate(issue.created_at)}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {canModifyIssue(issue) && !editingIssue && (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(issue)}
                                                        className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
                                                        title="Edit issue"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmation(issue.id)}
                                                        className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"
                                                        title="Delete issue"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            <StatusDropdown issue={issue} />
                                        </div>
                                    </div>
                                    {!editingIssue?.id === issue.id && (
                                        <p className="text-gray-700 whitespace-pre-wrap mb-3">{issue.description}</p>
                                    )}
                                    {issue.image_urls && issue.image_urls.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap gap-4">
                                                {issue.image_urls.map((url, index) => (
                                                    <div key={index} className="relative group">
                                                        <a
                                                            href={imageUrls[url]}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block"
                                                        >
                                                            <img
                                                                src={imageUrls[url]}
                                                                alt={`Issue attachment ${index + 1}`}
                                                                className="h-24 w-auto rounded-lg border border-gray-200 object-cover hover:border-blue-500 transition-colors"
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-lg">
                                                                <ExternalLink className="w-5 h-5 text-white" />
                                                            </div>
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 text-sm text-gray-500">
                                                {issue.image_urls.map((_, index) => (
                                                    <span key={index}>
                                                        Attachment {index + 1}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                        <h3 className="text-lg font-medium mb-4">Delete Issue?</h3>
                        <p className="text-gray-600 mb-6">Are you sure you want to delete this issue? This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmation)}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssuesList; 