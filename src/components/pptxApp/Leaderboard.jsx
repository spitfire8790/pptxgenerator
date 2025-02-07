import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Trophy, MapPin, X } from 'lucide-react';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const Leaderboard = ({ isOpen, onClose }) => {
    const [userStats, setUserStats] = useState([]);
    const [suburbStats, setSuburbStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchStats();
        }
    }, [isOpen]);

    const fetchStats = async () => {
        try {
            const { data, error } = await supabase
                .from('report_stats')
                .select('*');

            if (error) throw error;

            // Process user statistics
            const userStatsMap = data.reduce((acc, record) => {
                if (!acc[record.user_name]) {
                    acc[record.user_name] = {
                        name: record.user_name,
                        reports: 0
                    };
                }
                acc[record.user_name].reports++;
                return acc;
            }, {});

            // Process suburb statistics
            const suburbStatsMap = data.reduce((acc, record) => {
                const suburb = record.suburb || 'Unknown LGA';
                if (!acc[suburb]) {
                    acc[suburb] = {
                        name: suburb,
                        reports: 0
                    };
                }
                acc[suburb].reports++;
                return acc;
            }, {});

            // Convert to arrays and sort by report count
            const userStatsArray = Object.values(userStatsMap)
                .sort((a, b) => b.reports - a.reports);

            const suburbStatsArray = Object.values(suburbStatsMap)
                .sort((a, b) => b.reports - a.reports);

            setUserStats(userStatsArray);
            setSuburbStats(suburbStatsArray);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching stats:', error);
            setLoading(false);
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border rounded shadow">
                    <p className="font-medium">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {`${entry.name}: ${entry.value}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        Report Generation Statistics
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* User Statistics */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Reports by User</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports Generated</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {userStats.map((user, index) => (
                                            <tr key={user.name} className={index === 0 ? 'bg-yellow-50' : ''}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {index + 1}
                                                    {index === 0 && '🏆'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{user.reports}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Suburb Statistics */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-blue-500" />
                                Reports by LGA
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LGA</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports Generated</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {suburbStats.map((suburb) => (
                                            <tr key={suburb.name}>
                                                <td className="px-6 py-4 whitespace-nowrap">{suburb.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{suburb.reports}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6">
                                <BarChart 
                                    width={800} 
                                    height={300} 
                                    data={suburbStats} 
                                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="name" 
                                        angle={-45} 
                                        textAnchor="end" 
                                        height={60}
                                        tick={props => {
                                            const text = props.payload.value;
                                            const truncated = text.length > 15 ? `${text.substring(0, 15)}...` : text;
                                            return (
                                                <g transform={`translate(${props.x},${props.y})`}>
                                                    <text
                                                        x={0}
                                                        y={0}
                                                        dy={16}
                                                        textAnchor="end"
                                                        fill="#666"
                                                        transform="rotate(-45)"
                                                    >
                                                        {truncated}
                                                    </text>
                                                </g>
                                            );
                                        }}
                                    />
                                    <YAxis />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="reports" fill="#3B82F6" name="Reports by LGA" />
                                </BarChart>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard; 