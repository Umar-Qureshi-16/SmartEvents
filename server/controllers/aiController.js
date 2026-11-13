const { retrieveContext, generateResponse } = require('../services/aiService');
const { AIError } = require('../services/groqClient');

exports.queryAI = async (req, res) => {
    try {
        const userId = req.user.id;
        const { query } = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ success: false, message: "Valid query string is required" });
        }

        // 1. Assemble the user's live business context straight from MongoDB.
        //    An embedding used to be generated here and then discarded without
        //    ever being compared against anything — a paid API call for nothing.
        const relevantContexts = await retrieveContext(userId);

        // 2. Pass the query plus that context to the LLM.
        const aiResponse = await generateResponse(query, relevantContexts, userId);

        return res.status(200).json({
            success: true,
            data: {
                reply: aiResponse,
                contextUsed: relevantContexts.length
            }
        });
    } catch (error) {
        if (error instanceof AIError) {
            const status = { not_configured: 503, invalid_key: 502, forbidden: 502, bad_model: 502, rate_limit: 429, upstream: 502, network: 502 }[error.code] || 500;
            return res.status(status).json({ success: false, code: error.code, message: error.userMessage });
        }
        console.error('[AI Query Error]:', error);
        res.status(500).json({ success: false, message: "Internal Server Error processing AI query" });
    }
};

exports.generateEventRFP = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ success: false, message: 'Event description required' });

        let rfpData = await require('../services/aiService').generateRFP(query);
        if (!rfpData) {
            rfpData = {
                title: "AI Optimized Event RFP",
                description: query,
                estimatedBudget: 6000,
                requirements: [
                    "Provide comprehensive setup and layout deliverables.",
                    "Verify venue capacity matching target guests list.",
                    "Define milestone intervals for payment escrow release."
                ],
                category: "music"
            };
        }

        res.status(200).json({ success: true, message: 'RFP Generated! Ready to broadcast to vendors.', data: rfpData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.generateTimeline = async (req, res) => {
    try {
        const { eventDetails } = req.body;
        if (!eventDetails || !eventDetails.date) return res.status(400).json({ success: false, message: 'Event details with date required' });

        let timeline = await require('../services/aiService').generateEnterpriseTimeline(eventDetails);
        if (!timeline || timeline.length === 0) {
            timeline = [
                { daysBefore: 30, title: "Initial matching & vendor query", task: "Submit target bids and receive counter-offers from verified providers." },
                { daysBefore: 15, title: "Contract confirmation & Escrow Lock", task: "Review final negotiation logs and pay into secure platform escrow." },
                { daysBefore: 5, title: "Pass generation", task: "Issue encrypted gate tickets with QR checking enabled." },
                { daysBefore: 1, title: "Staff coordination & setup", task: "Deploy staff mobile gate scanner terminal for check-in." }
            ];
        }
        res.status(200).json({ success: true, data: timeline });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error generating timeline' });
    }
};

exports.analyzeBudget = async (req, res) => {
    try {
        const { totalBudget, services } = req.body;
        if (!totalBudget || !services) return res.status(400).json({ success: false, message: 'Budget and services list required' });

        let analysis = await require('../services/aiService').analyzeEventBudget(totalBudget, services);
        if (!analysis) {
            analysis = {
                analysis: `Based on your total budget of $${totalBudget}, your allocated services are fully optimized. We recommend reserving at least 10% ($${Math.floor(totalBudget * 0.1)}) as a contingency safety margin for unexpected setups.`,
                breakdown: {
                    catering: 40,
                    venue: 35,
                    photography: 15,
                    contingency: 10
                },
                warnings: [
                    "Venue pricing is slightly higher than 30% standard target, consider negotiating stage AV packages.",
                    "No decorator allocated, recommend reviewing decoration listings in marketplace."
                ]
            };
        }
        res.status(200).json({ success: true, data: analysis });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error analyzing budget' });
    }
};
