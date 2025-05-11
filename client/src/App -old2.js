import React, { useState } from 'react';
//import ReactFlow, { Background, Controls } from 'react-flow-renderer';
import Editor from '@monaco-editor/react';
import './App.css';
import BpmnJS from 'bpmn-js'

/*
const initialNodes = [];
const initialEdges = [];
*/


function App() {
  const [input, setInput] = useState('');
  const [model, setModel] = useState('');
  const [workflow, setWorkflow] = useState(null);
    /*
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  */
  const [editorValue, setEditorValue] = useState('');

  const handleSubmit = async () => {
    const urlJSON = `http://localhost:3001/${model}/build-wf-json`

    /*
      Example prompt:
      Fetch a list of open linkedin job posts of Sr. Manager or Director of Engineering, assess the skills match, 
      filter those jobs if skills match is greater than 70%.
    */

    const res = await fetch(urlJSON, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input })
    });

    const data = await res.json();
    setWorkflow(data.workflow);
    setEditorValue(JSON.stringify(data.workflow, null, 2));
    updateDiagram();

    const urlXML = `http://localhost:3001/${model}/build-wf-xml`

    const resBpmn = await fetch(urlXML, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Now, build BPMN compatible workflow xml without any help text or additional information' })
    });
    const dataXML = await resBpmn.json()
    const xml = JSONtoXML(dataXML);
    console.log(xml);     
    //generateGraph(data.workflow);
  };

  function JSONtoXML(obj) {
    let xml = '';
    for (let prop in obj) {
      xml += obj[prop] instanceof Array ? '' : '<' + prop + '>';
      if (obj[prop] instanceof Array) {
        for (let array in obj[prop]) {
          xml += '\n<' + prop + '>\n';
          //xml += JSONtoXML(new Object(obj[prop][array]));
          xml += JSONtoXML(function Object() {new Object(obj[prop][array])});
          xml += '</' + prop + '>';
        }
      } else if (typeof obj[prop] == 'object') {
        //xml += JSONtoXML(new Object(obj[prop]));
        xml += JSONtoXML(function Object(){ new Object(obj[prop])});
      } else {
        xml += obj[prop];
      }
      xml += obj[prop] instanceof Array ? '' : '</' + prop + '>\n';
    }
    xml = xml.replace(/<\/?[0-9]{1,}>/g, '');
    return xml;
  };

  const handleEditorChange = (value) => {
    setEditorValue(value);
    try {
      const parsed = JSON.parse(value);
      setWorkflow(parsed);
      //generateGraph(parsed);
    } catch (e) {
      console.warn("Invalid JSON");
    }
  };

    /*
  const generateGraph = (workflowData) => {
    if (!workflowData || !workflowData.steps) return;

    const nodes = workflowData.steps.map((step, i) => ({
      id: step.name,
      data: { label: `${step.name}` },
      position: { x: 100 * i, y: 100 }
    }));

    const edges = workflowData.steps.slice(1).map((step, i) => ({
      id: `e${i}-${i + 1}`,
      source: workflowData.steps[i].name,
      target: step.name,
      type: 'smoothstep'
    }));


    setNodes(nodes);
    setEdges(edges);
    
    
  };*/
  
  async function updateDiagram() {
    const viewer = new BpmnJS();
    const json = JSON.parse(editorValue);
    const res = await fetch('/convert-to-bpmn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json)
    });
    const { bpmnXml } = await res.json();
    viewer.importXML(bpmnXml);
  }
 
  const onOptionChange = e => {
    setModel(e.target.value)
  }


  return (
    <div className="App">
      <h1>AI Workflow Builder</h1>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Describe your workflow..."
        rows={6}
        cols={60}
      />
      <br />
      <h3>Select AI Model:</h3>
      <input type="radio" name="model" value="openai" id="model" onChange={onOptionChange}/>
      <label htmlFor="openai">openAI</label>

      <input type="radio" name="model" value="gemini" id="model" onChange={onOptionChange}/>
      <label htmlFor="gemini">gemini</label>
      <p></p>
      <button onClick={handleSubmit}>Generate Workflow</button>

      {workflow && (
        <>
          <h2>Edit Workflow JSON</h2>
          <Editor
            height="300px"
            defaultLanguage="json"
            value={editorValue}
            onChange={handleEditorChange}
          />
        </>
      )}

      <h2>Workflow Visualization</h2>         
    </div>
  );
}

export default App;
