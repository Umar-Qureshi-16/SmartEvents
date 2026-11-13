const ContextVector = require('../models/ContextVector');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const User = require('../models/User');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');
const { complete, AIError } = require('./groqClient');

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
        let ruleInstructions = "";
        const user = await User.findById(userId).lean();
        if (!user) return "I could not find your account. Please sign in again.";

        // The assistant used to address every user as a service provider, so a
        // customer asking about their wedding was told their "business is in
        // its startup phase". Context and persona now follow the actual role.
        const isProvider = user.role === 'provider' || user.role === 'admin' || user.role === 'superadmin';

        let knowledgeBase;

        if (isProvider) {
            const services = await Event.find({ createdBy: userId }).lean();
            const myEventIds = services.map(s => s._id);

            // Filter in the database, not in JavaScript. This previously ran
            // Booking.find() with no filter at all, pulling every booking on
            // the platform into memory on every single AI query.
            const myBookings = await Booking.find({
                $or: [{ eventId: { $in: myEventIds } }, { vendorId: userId }],
                status: { $in: ['confirmed', 'completed'] }
            }).populate('eventId', 'title price').lean();

            const openLeads = await Booking.countDocuments({
                vendorId: userId, status: { $in: ['pending', 'negotiating'] }
            });

            const totalRevenue = myBookings.reduce((sum, b) => sum + (b.offerPrice || b.eventId?.price || 0), 0);
            const avgBookingValue = myBookings.length ? (totalRevenue / myBookings.length).toFixed(2) : 0;

            const serviceCounts = {};
            myBookings.forEach(b => {
                const title = b.eventId?.title;
                if (title) serviceCounts[title] = (serviceCounts[title] || 0) + 1;
            });
            const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None yet';

            knowledgeBase = [
                `ROLE: Service provider`,
                `Provider: ${user.name} (${user.email})`,
                `Trust score: ${user.trustScore ?? 'not yet rated'} / 100`,
                `FINANCIAL METRICS:`,
                `- Total revenue: $${totalRevenue}`,
                `- Confirmed bookings: ${myBookings.length}`,
                `- Average booking value: $${avgBookingValue}`,
                `- Top performing package: ${topService}`,
                `- Open leads awaiting response: ${openLeads}`,
                `PORTFOLIO:`,
                `- Services listed: ${services.length ? services.map(s => `${s.title} ($${s.price})`).join(', ') : 'none yet'}`,
            ].join('\n');

            if (services.length === 0) {
                ruleInstructions += "RULE: This provider has NO services listed. Encourage them to create their first package from the 'My Services' page.\n";
            } else if (myBookings.length === 0) {
                ruleInstructions += "RULE: This provider has services but no confirmed bookings yet. Suggest concrete steps such as adjusting pricing or broadening categories.\n";
            }
            if (openLeads > 0) {
                ruleInstructions += `RULE: ${openLeads} lead(s) are awaiting a response. Remind them to reply promptly — response speed affects their trust score.\n`;
            }
        } else {
            // Customer: their context is the events they are planning.
            const myBookings = await Booking.find({ customerId: userId })
                .populate('eventId', 'title price')
                .populate('vendorId', 'name')
                .lean();

            const confirmed = myBookings.filter(b => ['confirmed', 'completed'].includes(b.status));
            const active = myBookings.filter(b => ['pending', 'negotiating'].includes(b.status));
            const committed = confirmed.reduce((sum, b) => sum + (b.offerPrice || 0), 0);

            const upcoming = confirmed
                .filter(b => b.eventDetails?.date && new Date(b.eventDetails.date) > new Date())
                .sort((a, b) => new Date(a.eventDetails.date) - new Date(b.eventDetails.date))[0];

            knowledgeBase = [
                `ROLE: Customer planning events`,
                `Customer: ${user.name} (${user.email})`,
                `PLANNING STATUS:`,
                `- Confirmed bookings: ${confirmed.length}`,
                `- Negotiations in progress: ${active.length}`,
                `- Total committed spend: $${committed}`,
                upcoming
                    ? `- Next event: ${upcoming.eventId?.title || upcoming.eventDetails?.eventType} on ${new Date(upcoming.eventDetails.date).toDateString()} with ${upcoming.vendorId?.name || 'a provider'}`
                    : `- No upcoming confirmed events`,
                `- Bookings: ${myBookings.length ? myBookings.map(b => `${b.eventId?.title || b.eventDetails?.eventType} ($${b.offerPrice}, ${b.status})`).join('; ') : 'none yet'}`,
            ].join('\n');

            if (myBookings.length === 0) {
                ruleInstructions += "RULE: This customer has no bookings yet. Help them think through their event, then point them to the Events or Vendors pages to make their first offer.\n";
            }
            if (active.length > 0) {
                ruleInstructions += `RULE: ${active.length} negotiation(s) are open. Offer practical advice on countering, and remind them they can accept or counter from the Bookings page.\n`;
            }
            ruleInstructions += "RULE: This user is a CUSTOMER, not a business. Never refer to 'your business', 'your revenue' or 'your services'. Never propose creating a service package.\n";
        }

        const isReportRequest = /report|analysis|performance/i.test(query);
        if (isReportRequest && isProvider) {
            ruleInstructions += "RULE: A REPORT was requested. Use a formal analytical tone, break the metrics down with bullet points, and propose actionable next steps.\n";
        }

        const contextText = knowledgeBase;

        const personaBlock = isProvider
            ? `You are "Smartie", the AI business partner for service providers on SmartEvents.
Help them win more bookings, price competitively, and respond to leads quickly.`
            : `You are "Smartie", the AI event-planning assistant on SmartEvents.
Help this customer plan their event: choosing services, setting a realistic budget,
negotiating a fair price, and staying on schedule.`;

        const actionBlock = isProvider
            ? `ACTION PROTOCOL
You may append ONE machine-readable block at the very end of your reply, and only
when the user has given enough detail or has agreed to a specific next step.

Creating a service package:
[ACTION_EVENT_CREATE]: { "title": "NAME", "type": "Wedding|Corporate|Concert|Birthday|Conference|Exhibition", "price": NUMBER, "description": "DETAILS" }

Generating a performance report:
[ACTION_REPORT_GENERATE]: { "timeframe": "monthly|weekly", "metrics": ["revenue", "bookings", "leads"] }

Never output an action block on its own — always write your reply first.`
            : `Do NOT output any [ACTION_...] blocks. You cannot create services for a customer.`;

        const systemPrompt = `
${personaBlock}

CONVERSATIONAL GUIDELINES
- Write naturally and warmly, in 2-3 short paragraphs.
- Use the real figures below rather than speaking in generalities.
- If you do not have the data to answer, say so plainly instead of inventing it.
- Amounts are in USD.

${actionBlock}

USER DATA
${contextText}

RULES
${ruleInstructions || '- None.'}
        `.trim();

        const chatCompletion = await complete({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            temperature: 0.5,
            max_tokens: 1024,
        });

        return chatCompletion.choices[0]?.message?.content || "No response generated.";
    } catch (err) {
        // Re-throw so the controller returns a real error status instead of
        // a 200 containing an apology the UI renders as a normal reply.
        if (err instanceof AIError) throw err;
        console.error('Error generating AI response:', err);
        throw new AIError('unknown', 'Smartie hit an unexpected error. Please try again.', err);
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
        const chatCompletion = await complete({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
        });
        return JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
    } catch (err) {
        console.error('Error generating RFP:', err);
        return null;
    }
}

/**
 * Pulls the milestone array out of whatever wrapper the model chose.
 *
 * `response_format: json_object` guarantees valid JSON but NOT a stable shape:
 * the model returns `{timeline: []}`, `{planningTimeline: []}`, `{milestones: []}`
 * or a bare array on different runs. The previous code only checked
 * `result.timeline`, so in practice it handed a plain object back to the UI,
 * which expects an array — and the timeline silently rendered nothing.
 */
function extractArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];

    // First array-valued property wins.
    for (const value of Object.values(payload)) {
        if (Array.isArray(value)) return value;
    }
    return [];
}

// 8. Enterprise Timeline Generator
async function generateEnterpriseTimeline(eventDetails) {
    try {
        const prompt = `Generate a planning timeline for a ${eventDetails.type || 'event'} titled "${eventDetails.title || 'Untitled'}" happening on ${eventDetails.date}.
Include milestones for: Venue Booking, Catering, Invitations, Logistics, and Final Review.
Respond with a JSON object of exactly this shape, ordered from the earliest milestone (largest daysBefore) to the latest:
{ "timeline": [{ "milestone": "string", "daysBefore": number, "description": "string" }] }`;

        const chatCompletion = await complete({
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        const parsed = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');
        const items = extractArray(parsed);

        // Normalise field names and drop anything unusable, then order by lead
        // time — the model does not reliably sort, and an out-of-order plan is
        // worse than no plan.
        return items
            .map(m => ({
                milestone: m.milestone || m.title || m.task || 'Milestone',
                daysBefore: Number(m.daysBefore ?? m.days_before ?? m.days) || 0,
                description: m.description || m.task || '',
            }))
            .filter(m => m.milestone)
            .sort((a, b) => b.daysBefore - a.daysBefore);
    } catch (err) {
        console.error('Error generating timeline:', err.message);
        return [];
    }
}

// 9. Advanced Budget Analyzer
async function analyzeEventBudget(totalBudget, services) {
    try {
        const prompt = `Analyze a budget of $${totalBudget} for these services: ${JSON.stringify(services)}.
        Detect overspending, suggest optimizations, and provide percentage breakdown.
        Output as JSON: { "analysis": "string", "breakdown": { "category": percentage }, "warnings": ["string"] }`;

        const chatCompletion = await complete({
            messages: [{ role: "user", content: prompt }],
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

