import React, { useState } from 'react';
import { Send, User, ShieldCheck, Image, Paperclip } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ChatWindow({ recipientName, recipientRole = "Vendor", onClose }) {
    const [messages, setMessages] = useState([
        { id: 1, sender: recipientName, role: recipientRole, text: 'Hello! We reviewed your event requirements. We can provide full AV stage lighting and audio.', time: '10:14 AM' },
        { id: 2, sender: 'You', role: 'Organizer', text: 'Great! Can you include 2 extra stage monitors in the $13,800 proposal?', time: '10:18 AM' }
    ]);
    const [inputMessage, setInputMessage] = useState('');

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        const newMsg = {
            id: Date.now(),
            sender: 'You',
            role: 'Organizer',
            text: inputMessage.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages([...messages, newMsg]);
        setInputMessage('');
        toast.success('Message sent');
    };

    return (
        <div className="adyen-card bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col h-[420px] overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#0ABF53] text-black font-bold flex items-center justify-center text-xs">
                        {recipientName.charAt(0)}
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-white">{recipientName}</h4>
                        <span className="text-[10px] text-[#0ABF53] font-mono font-bold block">{recipientRole} • Online</span>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-bold">Close</button>
                )}
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8F9FA]">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-2xl max-w-xs text-xs space-y-1 ${msg.sender === 'You' ? 'bg-[#0ABF53] text-white rounded-br-none' : 'bg-white border border-slate-200 text-[#111827] rounded-bl-none shadow-sm'}`}>
                            <p>{msg.text}</p>
                            <span className={`text-[9px] block text-right ${msg.sender === 'You' ? 'text-white/80' : 'text-slate-400'}`}>{msg.time}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type message to vendor..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs text-[#111827] outline-none focus:border-[#0ABF53]"
                />
                <button type="submit" className="p-2.5 bg-[#0ABF53] text-white rounded-full shadow-sm hover:bg-[#09aa49]">
                    <Send size={14} />
                </button>
            </form>
        </div>
    );
}
