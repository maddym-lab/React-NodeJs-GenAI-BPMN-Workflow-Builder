var express = require('express');
var router = express.Router();
const dotenv = require('dotenv')
dotenv.config();

const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Prompt template
const formatPrompt = (input) => `
You are a workflow engineer. Convert the following natural language into a structured JSON workflow.

Input:
${input}

Output format (JSON):
{
  "name": "Workflow Name",
  "steps": [
    { "name": "Step 1", "type": "action", "details": "Description or config" },
    { "name": "Step 2", "type": "condition", "details": "Condition description" },
    ...
  ]
}
Return only valid JSON.
`;

router.post('/generate-workflow-json', async (req, res) => {
  const { prompt } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: formatPrompt(prompt) }],
    });

    const rawText = completion.choices[0].message.content;

    // Try parsing as JSON
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      return res.status(500).json({ error: "Failed to parse JSON", raw: rawText });
    }

    res.json({ workflow: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OpenAI API error" });
  }
});


router.get('/', function(req, res, next) {
    //res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.send('API is working properly');
});

module.exports = router;
