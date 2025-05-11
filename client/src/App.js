import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import BpmnJS from 'bpmn-js';
//import axios from 'axios';
import './App.css';
import { generateWorkflowJson, convertToBpmn } from './Api';

const defaultJson = {
  workflow: {
    name: "LinkedIn Job Filter",
    steps: [
      {
        id: "fetch_jobs",
        action: "fetch_linkedin_jobs",
        parameters: {
          job_titles: ["Sr. Manager of Engineering", "Director of Engineering"],
          status: "open"
        },
        output: "job_list"
      },
      {
        id: "assess_skills",
        action: "evaluate_skills_match",
        parameters: {
          job_list: "${job_list}"
        },
        output: "scored_jobs"
      },
      {
        id: "filter_jobs",
        action: "filter_by_score",
        parameters: {
          input_list: "${scored_jobs}",
          threshold: 70
        },
        output: "filtered_jobs"
      }
    ],
    output: "${filtered_jobs}"
  }
};

function App() {
  const viewerRef = useRef(null);
  const bpmnViewer = useRef(null);
  //const debounceTimer = useRef(null);

  const [jsonValue, setJsonValue] = useState(JSON.stringify(defaultJson, null, 2));
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState(null);
  const [model, setModel] = useState('gemini');
  const [shouldWriteToFile, setShouldWriteToFile] = useState(false);

  // Initialize BPMN viewer once
  useEffect(() => {
    console.log("Children inside viewerRef:", viewerRef.current?.children);
    console.log("BPMN current container:", viewerRef.current);
    bpmnViewer.current = new BpmnJS({ container: viewerRef.current });
    
    //to avoid bjs-container & associated dom elements being loaded twice
    return () => {
      if (bpmnViewer.current) {
        bpmnViewer.current.destroy();
        bpmnViewer.current = null;
      }
    };
  }, []);

  //load the BPMN viewer with default workflow
  useEffect(() => {
  if (model && jsonValue && bpmnViewer.current) {
    renderDiagram(jsonValue);
  }
  }, [jsonValue, model]); // trigger on initial model set

  /*
  // Debounced BPMN diagram update for every change in JSON to update BPMN viewer
  useEffect(() => {
    if (!model || !jsonValue || !bpmnViewer.current) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      renderDiagram(jsonValue);
    }, 500);

    return () => clearTimeout(debounceTimer.current);
  }, [jsonValue, model]);
  */

  const renderDiagram = async (jsonInput) => {
    try {
      setError(null);
      const parsed = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
      //const urlBpmn = `http://localhost:3001/${model}/convert-to-bpmn`;
      //const { data } = await axios.post(urlBpmn, parsed);
      const data = await convertToBpmn(model, parsed, shouldWriteToFile);
      console.log("Received BPMN XML:", data.bpmnXml);
      //to clear previous contents and helps in avoiding bjs-container & associated dom elements being loaded twice
      await bpmnViewer.current.clear();
      await bpmnViewer.current.importXML(data.bpmnXml);
      bpmnViewer.current.get('canvas').zoom('fit-viewport'); // Optional: fit the canvas to the view
    } catch (err) {
      console.log(err)
      setError("BPMN render error: " + err.message);
    }
  };

  const handleEditorChange = async (value) => {
    setJsonValue(value);
    try {
      const parsed = typeof jsonInput === 'string' ? JSON.parse(value) : value;
      const data = await convertToBpmn(model, parsed);
      console.log("BPMN file saved to:", data.filePath);
    } catch (err) {
      console.error("Error saving BPMN file:", err);
    }
  };  
  
  const handlePromptSubmit = async () => {
    try {
      //const urlJson = `http://localhost:3001/${model}/generate-workflow-json`;
      //const { data } = await axios.post(urlJson, { prompt });
      const data = await generateWorkflowJson(model, prompt);
      const newJson = JSON.stringify(data, null, 2);
      setJsonValue(newJson); // this will trigger BPMN update
    } catch (err) {
      setError("Prompt processing error: " + err.message);
    }
  };

  const onOptionChange = (e) => {
    setModel(e.target.value);
  };
 
  return (
    <div className="app">
      <div className="editor-panel">
        <h2>Workflow Prompt</h2>
        <div className="prompt-box">
          <input
            type="text"
            placeholder="e.g., fetch jobs from LinkedIn and filter by skill match > 70%"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button onClick={handlePromptSubmit} className="button">Generate Workflow</button>
        </div>

        <div>
        <h3>Select AI Model:</h3>
        <input type="radio" name="model" value="openai" onChange={onOptionChange} checked={model === 'openai'} />
        <label htmlFor="openai">openAI</label>

        <input type="radio" name="model" value="gemini" onChange={onOptionChange} checked={model === 'gemini'} />
        <label htmlFor="gemini">gemini</label>
        
        <h3>Write BPMN XML to a File?</h3>
          <input
            type="radio"
            name="writeFile"
            value="yes"
            onChange={() => setShouldWriteToFile(true)}
            checked={shouldWriteToFile}
          /> Yes
          <input
            type="radio"
            name="writeFile"
            value="no"
            onChange={() => setShouldWriteToFile(false)}
            checked={!shouldWriteToFile}
          /> No
        </div>

        <div className="json-header">
          <h2>Workflow JSON</h2>
          <button onClick={() => renderDiagram(jsonValue)} className="button">
            Update BPMN Viewer
          </button>
        </div>

        <Editor
          height="400px"
          defaultLanguage="json"
          value={jsonValue}
          onChange={handleEditorChange}
          theme="vs-dark"
        />
        {error && <p className="error">{error}</p>}
      </div>

      <div className="diagram-panel">
        <h2>BPMN Viewer</h2>
        <div ref={viewerRef} className="diagram-box" />
      </div>
    </div>
  );
}

export default App;
