import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * A password input with a show/hide (eye) button. Accepts every prop a normal
 * <input> does; the text is masked until the user chooses to reveal it.
 */
export default function PasswordField({ className = '', wrapperClassName = '', ...props }) {
    const [visible, setVisible] = useState(false);
    return (
        <div className={`relative ${wrapperClassName}`}>
            <input
                {...props}
                type={visible ? 'text' : 'password'}
                className={`${className} pr-11`}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-fg"
                aria-label={visible ? 'Hide password' : 'Show password'}
                aria-pressed={visible}
                tabIndex={0}
            >
                {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
        </div>
    );
}
