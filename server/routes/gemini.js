var express = require('express');
var router = express.Router();
const BpmnModdle = require('bpmn-moddle');
const { layoutProcess } = require('bpmn-auto-layout');
// Import the utility function
const { writeBpmnFile } = require('../utils/fileWriter');
const dotenv = require('dotenv')
dotenv.config();

var XMLBuilder = require('fast-xml-parser');
var fs = require('fs');
var path = require('path');

const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

// Prompt template
  const formatJsonPrompt = (input) => `
  You are a workflow engineer. Convert the following natural language into a structured JSON workflow 
  and return only JSON in the output format below without any additional text.

  Input:
  ${input}

  Output format (JSON):
  {
    "name": "Workflow Name",
    "steps": [
      id: "fetch_linkedin_jobs"
      action: "fetch_linkedin_jobs",
      parameters: {
          job_titles: ["Sr. Manager of Engineering", "Director of Engineering"],
          status: "open"
      },
      output: "job_list"
    ]
  }
  Return only valid JSON.
  `;

router.post('/generate-workflow-json', async (req, res) => {
  const { prompt } = req.body;
  try {
      console.log("prompt at server:" + prompt)
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: formatJsonPrompt(prompt),
      });
      const rawText = response.text;
      console.log("raw json:" +rawText);
      let lines = rawText.split('\n');
      lines.splice(0,1);
      lines.splice(lines.length-1,1)
      // join the array back into a single string
      var newtext = lines.join('\n');

      // Try parsing as JSON
      parsed = JSON.parse(newtext);
      console.log("parsed json:" + parsed)
      res.send({ workflow: parsed })
 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini API-build-wf-json error" });
  }
});

router.post('/convert-to-bpmn', async (req, res) => {
  try {
    const { workflow, writeToFile } = req.body;
    if (!workflow || !workflow.steps) {
      return res.status(400).send('Invalid workflow input');
    }
    const steps = workflow.steps;
    console.log("writeBpmnToFile:" + writeToFile)

    if(steps.length > 0)
      console.log("no of steps from json:" + steps.length)
    else
      console.log("no steps in json:")

    const moddle = new BpmnModdle();

    const startEvent = moddle.create('bpmn:StartEvent', {
      id: 'StartEvent_1',
      name: 'Start',
      incoming: [],
      outgoing: []
    });

    const endEvent = moddle.create('bpmn:EndEvent', {
      id: 'EndEvent_1',
      name: 'End',
      incoming: [],
      outgoing: []
    });

    // Create task elements
    const taskElements = steps.map(step =>
      moddle.create('bpmn:Task', {
        id: step.id,
        name: step.action,
        incoming: [],
        outgoing: []
      })
    );

    // Map all elements by ID
    const allElements = [startEvent, ...taskElements, endEvent];
    const elementMap = {};
    allElements.forEach(el => {
      elementMap[el.id] = el;
    });

    // Create sequence flows and link incoming/outgoing
    const allIds = [startEvent.id, ...taskElements.map(t => t.id), endEvent.id];
    const sequenceFlows = [];

    for (let i = 0; i < allIds.length - 1; i++) {
      const source = elementMap[allIds[i]];
      const target = elementMap[allIds[i + 1]];

      const flow = moddle.create('bpmn:SequenceFlow', {
        id: `Flow_${i + 1}`,
        sourceRef: source,
        targetRef: target
      });

      source.outgoing.push(flow);
      target.incoming.push(flow);

      sequenceFlows.push(flow);
    }

    // Create the process
    const process = moddle.create('bpmn:Process', {
      id: 'Process_1',
      isExecutable: true,
      flowElements: [...allElements, ...sequenceFlows]
    });

    // Create the definitions
    const definitions = moddle.create('bpmn:Definitions', {
      targetNamespace: 'http://bpmn.io/schema/bpmn',
      rootElements: [process]
    });

    // Serialize BPMN to XML
    const { xml } = await moddle.toXML(definitions, { format: true });
    console.log("xml before layout:" + xml)

    // Apply auto-layout, using vertical display of diagram as default is left to right
    const layoutedXml = await layoutProcess(xml);

    // Write the BPMN file
    var filePath_writtenTo = ""
    if(writeToFile){
        filePath_writtenTo = await writeBpmnFile(workflow.name, layoutedXml);
    } 

    res.json({ bpmnXml: layoutedXml, filePath_writtenTo });
  } catch (err) {
    console.error('Error converting to BPMN:', err);
    res.status(500).send('Error converting to BPMN: ' + err.message);
  }
});

/*
function writeXMLFile(fileName, layoutedXml){
  // Ensure ./server/resources directory exists
  const resourcesDir = path.join(__dirname, 'resources');
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir);
  }

  // Use workflow name from JSON or fallback
  const fileNameSafe = (fileName || 'unnamed_workflow')
    .replace(/[^a-z0-9_\-]/gi, '_')  // Sanitize filename
    .toLowerCase();

  const filePath = path.join(resourcesDir, `${fileNameSafe}.bpmn`);

  fs.writeFile(filePath, layoutedXml, 'utf8', (err) => {
    if (err) {
      console.error('Failed to write BPMN file:', err);
    } else {
      console.log('BPMN diagram saved to', filePath);
    }
  });

}


router.post('/build-wf-xml', async (req, res) => {
  const { prompt } = req.body;
  try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      const rawText = response.text;
      let lines = rawText.split('\n');
      lines.splice(0,1);
      lines.splice(lines.length-1,1)
      lines.splice(lines.length-1,1)
      // join the array back into a single string
      var newtext = lines.join('\n');
      console.log(newtext)
      //const outputPath = path.resolve('../../src/resources/process-1.bpmn');
      var xmlPath = path.join(__dirname, 'resources', 'process-1.bpmn');
      fs.writeFile(xmlPath, newtext, 'utf8', (err) => {
        if (err) {
          console.error('Error writing file:', err);
          return;
        }
        console.log('File written successfully!');
      });
      res.send({ workflowXML :  newtext})         
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini API-build-wf-xml error" });
  }
});
*/
router.get('/', function(req, res, next) {
    //res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.send('API is working properly');
});

module.exports = router;