const Groq = require('groq-sdk');
const ContextVector = require('../models/ContextVector');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const User = require('../models/User');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');
// Placeholder key keeps construction from throwing when AI is not configured;
// calls then fail gracefully and the controllers fall back to static content.
const groq = new Groq({ apiKey: env.GROQ_API_KEY || 'not-configured' });

// 1. Real Gemini Embeddings Generation
async function createEmbedding(text) {
    try {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            console.warn('[RAG] No valid GEMINI_API_KEY. Defaulting to empty array.');
            return new Array(768).fill(0);
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (err) {
        console.error('[RAG] Error creating embedding:', err);
        return new Array(768).fill(0);
    }
}

// 2. Cosine Similarity (Step 4 part A)
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 3. Context assembly (full-context injection, not vector retrieval).
 *
 * At this data scale, fetching the user's records fresh on every query is
 * cheaper, faster and more accurate than embedding-based retrieval — there is
 * no corpus large enough to need ranking. Named honestly so the architecture
 * is not mistaken for RAG.
 */
async function retrieveContext(userId) {
    try {
        const services = await Event.find({ createdBy: userId }).lean();
        const serviceIds = services.map(s => s._id);

        // Booking has customerId / vendorId — there is no `userId` field.
        const bookingsData = await Booking.find({
            $or: [
                { eventId: { $in: serviceIds } },
                { vendorId: userId },
                { customerId: userId }
            ]
        }).select('status offerPrice eventId').lean();

        const context = [{
            type: 'aggregate',
            content: `The user has ${services.length} services and ${bookingsData.length} bookings.`
        }];

        services.forEach(s => {
            context.push({
                type: 'service',
                content: `Service: ${s.title}, Price: $${s.price}, Category: ${s.category}`
            });
        });

        return context;
    } catch (err) {
        console.error('Error assembling context:', err);
        return [];
    }
}

// 4. Data Pipeline: Build Context Strings (Step 1)
function buildAggregateContext(user, services, bookings) {
    // Generate intelligent readable block defining their business state.
    const revenue = bookings.reduce((sum, b) => sum + (b.eventId?.price || 0), 0);

    return `
Business Overview for Provider: ${user.name}
Email: ${user.email}
Total Services Listed: ${services.length}
Total Bookings Secured: ${bookings.length}
Total Earned Revenue: $${revenue}
    `.trim();
}

// 5. Auto Update Embeddings (No-Op in Full-Context Mode)
async function generateUserEmbeddings(userId) {
    // In Full-Context mode, we fetch data on-the-fly during the query.
    // This ensures 100% data freshness and zero storage overhead.
    console.log(`[RAG] Full-Context mode active for user ${userId}. No pre-vectorization needed.`);
}

// 6. Real-time Intelligence + AI Generation (Steps 5 & 8)
async function generateResponse(query, contextDocuments, userId) {
    try {
        // Step 8: Pre-generation Intelligence Layer (Rules)
        let ruleInstructions = "";
        const user = await User.findById(userId);
        if (!user) return "User account not isolated in the AI data map.";

        const services = await Event.find({ createdBy: userId }).lean();

        // Filter in the database, not in JavaScript. This previously ran
        // Booking.find() with no filter at all, pulling every booking on the
        // platform into memory on every single AI query.
        const myEventIds = services.map(s => s._id);
        const myBookings = await Booking.find({
            $or: [
                { eventId: { $in: myEventIds } },
                { vendorId: userId }
            ],
            status: { $in: ['confirmed', 'completed'] }
        })
            .populate('eventId', 'title price')
            .lean();

        // 1. Calculate Detailed Metrics
        const totalRevenue = myBookings.reduce((sum, b) => sum + (b.offerPrice || b.eventId?.price || 0), 0);
        const avgBookingValue = myBookings.length > 0 ? (totalRevenue / myBookings.length).toFixed(2) : 0;

        // Find top performing service
        const serviceCounts = {};
        myBookings.forEach(b => {
            const title = b.eventId?.title;
            if (!title) return;
            serviceCounts[title] = (serviceCounts[title] || 0) + 1;
        });
        const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None yet";

        // Construct complete real-time knowledge base
        const knowledgeBase = [
            `Provider Profile: ${user.name} (${user.email})`,
            `FINANCIAL METRICS:`,
            `- Total Revenue: $${totalRevenue}`,
            `- Total Bookings: ${myBookings.length}`,
            `- Average Booking Value: $${avgBookingValue}`,
            `- Top Performing Package: ${topService}`,
            `PORTFOLIO:`,
            `- Services List: ${services.map(s => `${s.title} ($${s.price})`).join(', ')}`,
            `PERFORMANCE SUMMARY: ${myBookings.length === 0 ? 'Zero sales records found. Business is in startup phase.' : `${myBookings.length} confirmed deals. Growth is stable.`}`
        ].join('\n');

        if (services.length === 0) {
            ruleInstructions += "RULE 1: The user has NO active services listed. You MUST instruct them to navigate to the 'My Services' tab to create their first portfolio package.\n";
        } else if (myBookings.length === 0) {
            ruleInstructions += "RULE 2: The user has active services but ZERO bookings. Suggest a 10% price drop or category diversification.\n";
        }

        // Detect if it's a "Report Request"
        const isReportRequest = query.toLowerCase().includes('report') || query.toLowerCase().includes('analysis') || query.toLowerCase().includes('performance');
        if (isReportRequest) {
            ruleInstructions += "RULE: The user requested a REPORT. Use a formal, analytical tone. Break down their metrics clearly with bullet points. Compare their portfolio against their performance. Propose actionable growth steps.\n";
        }

        const contextText = knowledgeBase; // We pass the full KB now

        const systemPrompt = `
You are "Smartie", the elite AI Business Partner for the SmartEvents platform.
Your goal is to be a supportive, proactive, and highly intelligent companion for service providers.

CONVERSATIONAL GUIDELINES:
1. **Be Human-Like**: Don't just provide data. Use phrases like "I see your business is growing!" or "That's a great idea for a service."
2. **Be Smart**: You have full access to their business data. Use it to give specific advice.
3. **Handle Regular Chat**: If they talk about their day or ask general questions, respond warmly but keep the focus on how you can help their event business.

ACTION PROTOCOL:
You can trigger "Actions" by outputting a specific JSON block AT THE END of your message. 
ONLY output an action block if the user has provided enough details or if you are proposing a specific next step that they have agreed to.

FORMAT FOR EVENT CREATION:
If proposing to create a service/event, include:
[ACTION_EVENT_CREATE]: { "title": "NAME", "type": "CATEGORY", "price": NUMBER, "description": "DETAILS" }

FORMAT FOR REPORT GENERATION:
If proposing a performance report:
[ACTION_REPORT_GENERATE]: { "timeframe": "monthly/weekly", "metrics": ["revenue", "bookings", "leads"] }

USER DATA CONTEXT:
${contextText}

CRITICAL BUSINESS RULES:
${ruleInstructions}

INSTRUCTIONS:
- Speak naturally and keep responses to 2-3 concise paragraphs.
- When you detect an intent to "do or create work", ask for missing details first, then output the [ACTION_...] block once confirmed.
        `.trim();

        const model = "llama-3.3-70b-versatile";

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            model: model,
            temperature: 0.5,
            max_tokens: 1024,
        });

        return chatCompletion.choices[0]?.message?.content || "No response generated.";
    } catch (err) {
        if (err.status === 429) {
            return "Groq capacity reached. Please wait a few seconds and try again. (Rate Limit)";
        }
        console.error('Error generating Groq response:', err);
        return "I encountered an error with the Groq AI engine. Please check your API key and quota.";
    }
}

// 7. Generate RFP payload for Event Matchmaking
async function generateRFP(query) {
    try {
        const systemPrompt = `You are an AI Event Matchmaker. 
Turn the abstract event query into a structured RFP JSON. 
Output exactly this JSON format:
{
  "title": "",
  "theme": "",
  "budget": 0,
  "servicesRequired": [],
  "estimatedFeasibility": "High/Medium/Low",
  "recommendations": ["A", "B"]
}`;
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            response_format: { type: "json_object" }
        });
        return JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
    } catch (err) {
        console.error('Error generating RFP:', err);
        return null;
    }
}

// 8. Enterprise Timeline Generator
async function generateEnterpriseTimeline(eventDetails) {
    try {
        const prompt = `Generate a detailed planning timeline for a ${eventDetails.type} event titled "${eventDetails.title}" happening on ${eventDetails.date}.
        Include milestones for: Venue Booking, Catering, Invitations, Logistics, and Final Review.
        Output as a JSON array of objects: [{ "milestone": "string", "daysBefore": number, "description": "string" }]`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            response_format: { type: "json_object" }
        });
        const result = JSON.parse(chatCompletion.choices[0]?.message?.content || '{"timeline": []}');
        return result.timeline || result;
    } catch (err) {
        console.error('Error generating timeline:', err);
        return [];
    }
}

// 9. Advanced Budget Analyzer
async function analyzeEventBudget(totalBudget, services) {
    try {
        const prompt = `Analyze a budget of $${totalBudget} for these services: ${JSON.stringify(services)}.
        Detect overspending, suggest optimizations, and provide percentage breakdown.
        Output as JSON: { "analysis": "string", "breakdown": { "category": percentage }, "warnings": ["string"] }`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            response_format: { type: "json_object" }
        });
        return JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
    } catch (err) {
        console.error('Error analyzing budget:', err);
        return null;
    }
}

module.exports = {
    createEmbedding,
    cosineSimilarity,
    retrieveContext,
    generateUserEmbeddings,
    generateResponse,
    generateRFP,
    generateEnterpriseTimeline,
    analyzeEventBudget
};

