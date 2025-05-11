import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

export const generateWorkflowJson = async (model, prompt) => {
  const url = `${BASE_URL}/${model}/generate-workflow-json`;
  const { data } = await axios.post(url, { prompt });
  return data;
};

export const convertToBpmn = async (model, workflowJson, writeToFile) => {
  const url = `${BASE_URL}/${model}/convert-to-bpmn`;
  const { data } = await axios.post(url, {
    workflow: workflowJson.workflow,
    writeToFile
  });
  return data;
};

export const saveWorkflowBpmn = async (model, workflowJson) => {
  const url = `${BASE_URL}/${model}/save-bpmn`;
  const { data } = await axios.post(url, workflowJson);
  return data;
};

// Add more APIs as needed...
