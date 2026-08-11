const fs = require('fs');
const files = [
    'src/pages/Inspiration.jsx',
    'src/pages/Contact.jsx',
    'src/pages/Auth/Signup.jsx',
    'src/pages/Auth/ResetPassword.jsx',
    'src/pages/Auth/Login.jsx',
    'src/pages/Auth/ForgotPassword.jsx',
    'src/components/Navbar.jsx'
];

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');

    if (!content.includes('useNavigate')) {
        content = "import { useNavigate } from 'react-router-dom';\n" + content;
    }

    if (f.includes('Navbar.jsx')) {
        content = content.replace(/function Navbar\(\{\s*currentPage,\s*setPage,\s*user,\s*onLogout\s*\}\)/, "function Navbar({ currentPage, user, onLogout })");
        content = content.replace(/function\s+(\w+)\s*\([^)]*\)\s*\{/, match => `${match}\n    const navigate = useNavigate();`);
    } else {
        content = content.replace(/function\s+(\w+)\s*\(\s*\{\s*([^}]*)(?:,\s*setPage|setPage\s*,?)\s*([^}]*)\}\s*\)/, (match, name, p1, p3) => {
            let params = [p1, p3].map(p => p.trim()).filter(Boolean).join(', ');
            if (params.endsWith(',')) params = params.slice(0, -1);
            return `function ${name}(${params ? `{ ${params} }` : ''})`;
        });
        content = content.replace(/function\s+(\w+)\s*\([^)]*\)\s*\{/, match => `${match}\n    const navigate = useNavigate();`);
    }

    content = content.replace(/setPage\('home'\)/g, "navigate('/home')");
    content = content.replace(/setPage\('dashboard'\)/g, "navigate('/')");
    content = content.replace(/setPage\('login'\)/g, "navigate('/login')");
    content = content.replace(/setPage\('signup'\)/g, "navigate('/signup')");
    content = content.replace(/setPage\('inspiration'\)/g, "navigate('/inspiration')");
    content = content.replace(/setPage\('forgot-password'\)/g, "navigate('/forgot-password')");
    content = content.replace(/setPage\('reset-password'\)/g, "navigate('/reset-password')");
    content = content.replace(/setPage\('contact'\)/g, "navigate('/contact')");

    // remove any remaining setPage that might cause errors if used dynamically (just in case)
    fs.writeFileSync(f, content);
});
