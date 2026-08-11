import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Calendar as CalendarIcon, ArrowLeft, ArrowRight, ShieldAlert, Check } from 'lucide-react';

export default function AvailabilityCalendar() {
    const [blockedDates, setBlockedDates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const fetchBlockedDates = async () => {
        try {
            const res = await axios.get('/vendor/calendar');
            if (res.data.success) {
                setBlockedDates(res.data.data.map(d => new Date(d).toDateString()));
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load blocked dates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlockedDates();
    }, []);

    const toggleDate = async (date) => {
        const dateStr = date.toDateString();
        const isBlocked = blockedDates.includes(dateStr);
        setLoading(true);

        try {
            let res;
            if (isBlocked) {
                res = await axios.post('/vendor/calendar/unblock', { date });
            } else {
                res = await axios.post('/vendor/calendar/block', { date });
            }

            if (res.data.success) {
                setBlockedDates(res.data.data.map(d => new Date(d).toDateString()));
                toast.success(isBlocked ? 'Date is now available' : 'Date is now blocked');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to update date status');
        } finally {
            setLoading(false);
        }
    };

    // Calendar Calculations
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days = [];
    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        days.push({
            date: new Date(year, month - 1, prevMonthTotalDays - i),
            isCurrentMonth: false
        });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
        days.push({
            date: new Date(year, month, i),
            isCurrentMonth: true
        });
    }

    // Next month filler days to complete grid (multiples of 7)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
        days.push({
            date: new Date(year, month + 1, i),
            isCurrentMonth: false
        });
    }

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#E5E7EB]">
                <div className="space-y-1">
                    <span className="adyen-badge">VENDOR CALENDAR</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#111827]">
                        Availability Schedule
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">Block or unblock dates in your schedule. Locked dates block customers from booking your services.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Calendar Grid */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="adyen-card bg-white border border-[#E5E7EB] p-6 space-y-6 shadow-sm">
                        {/* Month Selector */}
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-[#111827]">
                                {monthNames[month]} {year}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={prevMonth} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                    <ArrowLeft size={16} />
                                </button>
                                <button onClick={nextMonth} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="space-y-2">
                            {/* Weekday headers */}
                            <div className="grid grid-cols-7 text-center text-xs font-mono font-bold text-slate-400 py-2">
                                <span>SUN</span>
                                <span>MON</span>
                                <span>TUE</span>
                                <span>WED</span>
                                <span>THU</span>
                                <span>FRI</span>
                                <span>SAT</span>
                            </div>

                            {/* Days */}
                            <div className="grid grid-cols-7 gap-2">
                                {days.map((day, idx) => {
                                    const isBlocked = blockedDates.includes(day.date.toDateString());
                                    const isToday = new Date().toDateString() === day.date.toDateString();
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => toggleDate(day.date)}
                                            className={`h-24 p-2 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                                                isBlocked 
                                                    ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                                                    : day.isCurrentMonth
                                                        ? 'bg-white border-[#E5E7EB] hover:border-[#0ABF53]'
                                                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                                            } ${isToday ? 'ring-2 ring-[#0ABF53] ring-offset-2' : ''}`}
                                        >
                                            <span className="text-xs font-bold font-mono">
                                                {day.date.getDate()}
                                            </span>
                                            {isBlocked ? (
                                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-200/50 text-rose-700 w-fit uppercase">
                                                    Blocked
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100/50 text-emerald-700 w-fit uppercase">
                                                    Free
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Calendar Legend & Policy */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="adyen-card p-6 bg-white border border-[#E5E7EB] space-y-4">
                        <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Calendar Settings</h3>
                        
                        <div className="space-y-3 text-xs font-medium text-slate-600 leading-relaxed">
                            <div className="flex gap-2.5">
                                <div className="w-5 h-5 rounded bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                                    <ShieldAlert size={12} className="text-rose-600" />
                                </div>
                                <p><strong>Blocked Days:</strong> Locked dates will automatically reject new customer proposals at the database write boundary.</p>
                            </div>
                            <div className="flex gap-2.5">
                                <div className="w-5 h-5 rounded bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                                    <Check size={12} className="text-emerald-600" />
                                </div>
                                <p><strong>Free Days:</strong> Default state. Customers are allowed to book direct listings or send quote requests.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
