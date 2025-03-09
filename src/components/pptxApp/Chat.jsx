import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, User, Smile } from 'lucide-react';
import supabase from '../../lib/supabase';
import { getCurrentUserName } from './utils/auth/tokenUtils';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const Chat = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userName, setUserName] = useState('Unknown User');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editMessageText, setEditMessageText] = useState('');
    const [userReportCounts, setUserReportCounts] = useState({});
    const messageContainerRef = useRef(null);
    const chatSubscription = useRef(null);
    const refreshInterval = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchMessages();
            setupRealtimeSubscription();
            getUserNameFromGiraffe();
            fetchUserReportCounts();
            
            // Set up refresh interval for more frequent updates (every 500ms)
            refreshInterval.current = setInterval(() => {
                fetchMessages();
            }, 500);
        }

        return () => {
            if (chatSubscription.current) {
                chatSubscription.current.unsubscribe();
            }
            if (refreshInterval.current) {
                clearInterval(refreshInterval.current);
            }
        };
    }, [isOpen]);

    useEffect(() => {
        // Scroll to bottom when messages change
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchUserReportCounts = async () => {
        try {
            if (!supabase) {
                throw new Error('Supabase client is not initialized.');
            }

            const { data, error: supabaseError } = await supabase
                .from('report_stats')
                .select('*');

            if (supabaseError) throw supabaseError;

            // Process user statistics
            const userStatsMap = data.reduce((acc, record) => {
                if (!acc[record.user_name]) {
                    acc[record.user_name] = 0;
                }
                acc[record.user_name]++;
                return acc;
            }, {});

            setUserReportCounts(userStatsMap);
        } catch (error) {
            console.error('Error fetching report counts:', error);
        }
    };

    const getUserNameFromGiraffe = async () => {
        try {
            const name = await getCurrentUserName();
            if (name && name !== 'Unknown User') {
                setUserName(name);
                localStorage.setItem('pptxgen_chat_username', name);
            } else {
                // Fall back to stored username if available
                const storedUserName = localStorage.getItem('pptxgen_chat_username');
                if (storedUserName) {
                    setUserName(storedUserName);
                }
            }
        } catch (error) {
            console.error('Error getting user name:', error);
            // Fall back to stored username
            const storedUserName = localStorage.getItem('pptxgen_chat_username');
            if (storedUserName) {
                setUserName(storedUserName);
            }
        }
    };

    const setupRealtimeSubscription = () => {
        if (chatSubscription.current) {
            chatSubscription.current.unsubscribe();
        }

        chatSubscription.current = supabase
            .channel('pptxgen_chat_messages')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'pptxgen_chat_messages' }, 
                (payload) => {
                    const newMessage = payload.new;
                    setMessages(prev => [...prev, newMessage]);
                }
            )
            .subscribe();
    };

    const fetchMessages = async () => {
        try {
            if (!supabase) {
                throw new Error('Supabase client is not initialized. Chat is temporarily unavailable.');
            }

            const { data, error } = await supabase
                .from('pptxgen_chat_messages')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(100);

            if (error) throw error;

            // Only update messages if there are new ones to avoid flickering
            if (data && data.length > 0) {
                setMessages(prevMessages => {
                    if (prevMessages.length === 0) return data || [];
                    
                    // Only append new messages that don't exist in the current state
                    const lastMessageTime = prevMessages[prevMessages.length - 1].created_at;
                    const newMessages = data.filter(msg => 
                        new Date(msg.created_at) > new Date(lastMessageTime)
                    );
                    
                    if (newMessages.length === 0) return prevMessages;
                    return [...prevMessages, ...newMessages];
                });
            } else if (messages.length === 0) {
                setMessages([]);
            }
            
            setError(null);
            if (loading) setLoading(false);
        } catch (error) {
            console.error('Error fetching messages:', error);
            setError(error.message);
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const { error } = await supabase
                .from('pptxgen_chat_messages')
                .insert({
                    user_name: userName,
                    message: newMessage.trim(),
                    created_at: new Date().toISOString()
                });

            if (error) throw error;

            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm('Are you sure you want to delete this message?')) {
            return;
        }

        try {
            // Find the message to ensure it's the user's own message
            const messageToDelete = messages.find(msg => msg.id === messageId);
            if (!messageToDelete || messageToDelete.user_name !== userName) {
                alert('You can only delete your own messages.');
                return;
            }

            // Add custom header for RLS policy
            const { error } = await supabase
                .from('pptxgen_chat_messages')
                .delete()
                .eq('id', messageId)
                .select()
                .headers({ 'x-user-name': userName });

            if (error) throw error;

            // Optimistically remove message from state
            setMessages(messages.filter(msg => msg.id !== messageId));
        } catch (error) {
            console.error('Error deleting message:', error);
            alert('Failed to delete message. Please try again.');
        }
    };

    const handleEditMessage = (message) => {
        setEditingMessageId(message.id);
        setEditMessageText(message.message);
    };

    const saveEditedMessage = async () => {
        if (!editMessageText.trim()) {
            return;
        }

        try {
            // Find the message to ensure it's the user's own message
            const messageToEdit = messages.find(msg => msg.id === editingMessageId);
            if (!messageToEdit || messageToEdit.user_name !== userName) {
                alert('You can only edit your own messages.');
                setEditingMessageId(null);
                return;
            }

            // Add custom header for RLS policy
            const { error } = await supabase
                .from('pptxgen_chat_messages')
                .update({ message: editMessageText.trim() })
                .eq('id', editingMessageId)
                .select()
                .headers({ 'x-user-name': userName });

            if (error) throw error;

            // Optimistically update message in state
            setMessages(messages.map(msg => 
                msg.id === editingMessageId ? 
                { ...msg, message: editMessageText.trim() } : 
                msg
            ));

            // Reset editing state
            setEditingMessageId(null);
            setEditMessageText('');
        } catch (error) {
            console.error('Error editing message:', error);
            alert('Failed to update message. Please try again.');
        }
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setEditMessageText('');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-AU', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short',
        }).format(date);
    };

    const handleChangeUserName = () => {
        const newUserName = prompt('Enter your name:', userName);
        if (newUserName && newUserName.trim()) {
            setUserName(newUserName.trim());
            localStorage.setItem('pptxgen_chat_username', newUserName.trim());
        }
    };

    const addEmoji = (emoji) => {
        setNewMessage(prev => prev + emoji.native);
        setShowEmojiPicker(false);
    };

    const messageAnimation = `
        @keyframes slideInRight {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInLeft {
            from { transform: translateX(-20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes starPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
        }
        .admin-star {
            display: inline-block;
            animation: starPulse 1.5s infinite ease-in-out;
        }
        .message-animate-in-right {
            animation: slideInRight 0.3s ease-out forwards;
        }
        .message-animate-in-left {
            animation: slideInLeft 0.3s ease-out forwards;
        }
        .message-bubble {
            transition: all 0.2s ease;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .message-bubble:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            transform: translateY(-1px);
        }
        .message-bubble-user {
            border-radius: 18px 18px 4px 18px;
        }
        .message-bubble-other {
            border-radius: 18px 18px 18px 4px;
        }
    `;

    const renderUserWithReportCount = (userName) => {
        const reportCount = userReportCounts[userName] || 0;
        
        // Special handling for the admin user
        if (userName === "James Strutt") {
            return (
                <span className="flex items-center">
                    {userName} <span className="ml-1 text-blue-600 font-semibold">(Admin</span> 
                    <span className="admin-star ml-0.5 mr-1">⭐</span>
                    <span className="text-blue-600 font-semibold">)</span>
                </span>
            );
        }
        
        return (
            <span>
                {userName} {reportCount > 0 && <span className="text-gray-500">({reportCount} Reports)</span>}
            </span>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
            <style>{messageAnimation}</style>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-blue-500" />
                        Chat
                    </h2>
                    <div className="flex items-center gap-3">
                        <div 
                            className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer hover:text-blue-600"
                            onClick={handleChangeUserName}
                        >
                            <User className="w-4 h-4" />
                            <span>{renderUserWithReportCount(userName)}</span>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <MessageSquare className="w-12 h-12 text-red-500 mb-4" />
                        <p className="text-gray-600">{error}</p>
                        <p className="text-sm text-gray-500 mt-2">Please try again later or contact support if the issue persists.</p>
                    </div>
                ) : (
                    <>
                        <div 
                            ref={messageContainerRef}
                            className="flex-1 overflow-y-auto mb-4 border rounded-lg p-4 bg-gray-50"
                            style={{ minHeight: '300px', maxHeight: '500px' }}
                        >
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                                    <MessageSquare className="w-12 h-12 mb-4 text-gray-300" />
                                    <p>No messages yet. Be the first to say something!</p>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isCurrentUser = msg.user_name === userName;
                                    return (
                                        <div key={index} className={`mb-4 last:mb-0 ${isCurrentUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-sm text-gray-700">{renderUserWithReportCount(msg.user_name)}</span>
                                                <span className="text-xs text-gray-500">{formatDate(msg.created_at)}</span>
                                            </div>
                                            <div className="flex items-start gap-2 max-w-[80%]">
                                                <div 
                                                    className={`relative py-2 px-3 shadow-sm message-bubble ${isCurrentUser 
                                                        ? 'bg-blue-500 text-white message-bubble-user message-animate-in-right' 
                                                        : 'bg-white text-gray-800 border message-bubble-other message-animate-in-left'}`}
                                                >
                                                    {editingMessageId === msg.id ? (
                                                        <div className="flex flex-col gap-2">
                                                            <input
                                                                type="text"
                                                                value={editMessageText}
                                                                onChange={(e) => setEditMessageText(e.target.value)}
                                                                className="w-full px-2 py-1 border rounded-md text-gray-800 bg-white text-sm"
                                                                autoFocus
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={saveEditedMessage}
                                                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={cancelEdit}
                                                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-md"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="break-words">{msg.message}</div>
                                                    )}
                                                </div>
                                                {isCurrentUser && !editingMessageId && (
                                                    <div className="flex flex-col gap-1">
                                                        <button 
                                                            onClick={() => handleEditMessage(msg)}
                                                            className="text-xs text-gray-500 hover:text-blue-500 p-1"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                                                <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                                                                <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                                                            </svg>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className="text-xs text-gray-500 hover:text-red-500 p-1"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                                >
                                    <Smile className="w-5 h-5" />
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-full right-0 mb-2">
                                        <Picker 
                                            data={data} 
                                            onEmojiSelect={addEmoji} 
                                            theme="light"
                                            previewPosition="none"
                                        />
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                Send
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default Chat;
