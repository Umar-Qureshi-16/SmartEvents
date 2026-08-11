const toolDefinitions = [
    {
        name: "create_event",
        description: "Create a new event/package for the provider.",
        parameters: {
            type: "object",
            properties: {
                title: { type: "string", description: "The title of the event" },
                price: { type: "number", description: "The price of the event in Rs." },
                description: { type: "string", description: "Detailed description of the event" },
                type: { type: "string", description: "Category/type of event (e.g., Wedding, Corporate, Gala)" },
            },
            required: ["title", "price", "description", "type"],
        },
    },
    {
        name: "update_event",
        description: "Update an existing event's details.",
        parameters: {
            type: "object",
            properties: {
                oldTitle: { type: "string", description: "The current title of the event to update" },
                newTitle: { type: "string", description: "The new title (optional)" },
                price: { type: "number", description: "The new price (optional)" },
                description: { type: "string", description: "The new description (optional)" },
            },
            required: ["oldTitle"],
        },
    },
    {
        name: "delete_event",
        description: "Delete an event by its title.",
        parameters: {
            type: "object",
            properties: {
                title: { type: "string", description: "The title of the event to delete" },
            },
            required: ["title"],
        },
    },
    {
        name: "get_my_events",
        description: "List all events created by the current provider.",
        parameters: { type: "object", properties: {} },
    },
    {
        name: "get_revenue_stats",
        description: "Get total earnings and revenue details for the provider.",
        parameters: { type: "object", properties: {} },
    },
    {
        name: "get_booking_stats",
        description: "Get counts and details of bookings (leads, active, completed).",
        parameters: { type: "object", properties: {} },
    },
    {
        name: "navigate_to",
        description: "Navigate the user to a specific page in the application.",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", enum: ["/revenue", "/bookings", "/leads", "/services", "/dashboard", "/profile"], description: "The destination path" },
            },
            required: ["path"],
        },
    },
];

module.exports = { toolDefinitions };
