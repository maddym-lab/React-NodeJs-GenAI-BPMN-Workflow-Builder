const fs = require('fs');
const path = require('path');

const resourcesDir = path.resolve(__dirname, '..', 'resources');

if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

const writeBpmnFile = async (workflowName, xmlContent) => {
  const baseFileName = workflowName.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();

  const files = fs.readdirSync(resourcesDir);
  const matchingVersions = files
    .filter(name => name.startsWith(baseFileName + '_v') && name.endsWith('.bpmn'))
    .map(name => {
      const match = name.match(/_v(\d+)\.bpmn$/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nextVersion = matchingVersions.length > 0 ? Math.max(...matchingVersions) + 1 : 1;
  const versionedFileName = `${baseFileName}_v${nextVersion}.bpmn`;

  const filePath = path.join(resourcesDir, versionedFileName);

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, xmlContent, 'utf8', (err) => {
      if (err) {
        console.error('Error writing BPMN file:', err);
        return reject(err);
      }
      console.log(`BPMN file written to: ${filePath}`);
      resolve(filePath);
    });
  });
};

module.exports = { writeBpmnFile };
