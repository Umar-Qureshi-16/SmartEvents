require('dotenv').config({ path: './.env' });
const { handleChatbot } = require('./controllers/chatbotController.js');

const req = {
    body: {
        message: "Hello",
        conversationHistory: []
    }
};

const res = {
    json: (data) => console.log(JSON.stringify(data)),
    status: (code) => {
        return { json: (data) => console.log("STATUS", code, data) }
    }
};

console.log("Testing Groq handleChatbot module with model llama3-8b-8192...");
handleChatbot(req, res).then(() => {
    console.log("Test completed.");
}).catch(console.error);
