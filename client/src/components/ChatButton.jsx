import React from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import ChatModal from './ChatModal';

const ChatButton = () => {
    const [open, setOpen] = React.useState(false);

    const toggleChat = () => setOpen(!open);

    return (
        <>
            <button
                onClick={toggleChat}
                className="chat-button"
                aria-label="Open AI Assistant"
            >
                <FiMessageSquare size={24} />
            </button>
            {open && <ChatModal onClose={toggleChat} />}
        </>
    );
};

export default ChatButton;
