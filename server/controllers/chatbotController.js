const { complete, isConfigured, AIError } = require('../services/groqClient');

const SYSTEM_PROMPT = "You are SmartEvents AI Assistant. You help users with event planning, pricing advice, venue selection, and navigating the SmartEvents platform. Be concise, friendly, and helpful. When users ask about pricing, remind them they can negotiate directly with providers using our counter-offer system.";

exports.handleChatbot = async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ message: 'Message is required' });
        }

        if (!isConfigured()) {
            return res.status(503).json({
                code: 'not_configured',
                message: 'AI is not configured: GROQ_API_KEY is missing on the server.',
                reply: null,
                action: null
            });
        }

        // Only accept well-formed turns from the client.
        const history = Array.isArray(conversationHistory)
            ? conversationHistory
                .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
                .slice(-20)
            : [];

        const chatCompletion = await complete({
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }],
            model: 'llama-3.1-8b-instant',
            temperature: 0.5,
            max_tokens: 1024,
        });

        const content = chatCompletion.choices[0]?.message?.content || 'No response generated.';
        return res.json({ reply: content, action: null });
    } catch (error) {
        if (error instanceof AIError) {
            const status = error.code === 'rate_limit' ? 429 : error.code === 'not_configured' ? 503 : 502;
            return res.status(status).json({ code: error.code, message: error.userMessage, reply: null, action: null });
        }
        console.error('Chatbot error:', error);
        res.status(500).json({ message: 'Error in AI Assistant', error: error.message });
    }
};
