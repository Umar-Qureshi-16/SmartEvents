const Groq = require('groq-sdk');
const Event = require('../models/Event');
const VendorProfile = require('../models/VendorProfile');
const Booking = require('../models/Booking');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

exports.handleChatbot = async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!process.env.GROQ_API_KEY) {
            return res.json({
                reply: "I'm currently in 'Prototype Mode' because the Groq API Key is not set. Please add your API key to the .env file to enable my full intelligence!",
                action: null
            });
        }

        const systemPrompt = "You are SmartEvents AI Assistant. You help users with event planning, pricing advice, venue selection, and navigating the SmartEvents platform. Be concise, friendly, and helpful. When users ask about pricing, remind them they can negotiate directly with providers using our counter-offer system.";

        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: message }
        ];

        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.1-8b-instant",
            temperature: 0.5,
            max_tokens: 1024,
        });

        const content = chatCompletion.choices[0]?.message?.content || "No response generated.";

        return res.json({ reply: content, action: null });

    } catch (error) {
        console.error("Groq Error:", error);
        if (error.status === 429) {
            return res.json({
                reply: "I'm receiving too many requests right now. Please wait a few seconds and try again!",
                action: null
            });
        }
        res.status(500).json({ message: 'Error in AI Assistant', error: error.message });
    }
};
