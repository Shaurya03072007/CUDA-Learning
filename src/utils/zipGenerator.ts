import JSZip from 'jszip';
import { CODEBASE_TREE } from '../data/codebaseTree';
import { FLAGSHIP_PROJECTS } from '../data/flagshipProjects';
import { PROJECT_GUIDES } from '../data/projectsData';
import { ONE_THOUSAND_QUESTIONS } from '../data/questionsData';
import { FileTreeNode } from '../types';

export async function generateMasterZip(): Promise<Blob> {
  const zip = new JSZip();

  // 1. Add virtual files from the tree
  function addNodesToZip(folder: JSZip, nodes: FileTreeNode[]) {
    for (const node of nodes) {
      if (node.type === 'directory' && node.children) {
        const subFolder = folder.folder(node.name);
        if (subFolder) addNodesToZip(subFolder, node.children);
      } else if (node.type === 'file') {
        folder.file(node.name, node.content || `// File: ${node.path}\n// Description: ${node.description || 'CUDA Deep Learning Infra'}\n\n#include <cuda_runtime.h>\n`);
      }
    }
  }

  addNodesToZip(zip, CODEBASE_TREE);

  // 2. Add Project 1: MiniTorch-CUDA complete files
  const minitorchFolder = zip.folder('projects/minitorch_cuda');
  if (minitorchFolder) {
    FLAGSHIP_PROJECTS[0].coreModules.forEach(mod => {
      minitorchFolder.file(mod.filename.split('/').pop() || 'module.cpp', mod.code);
    });
    minitorchFolder.file('README.md', `# MiniTorch-CUDA\n\n${FLAGSHIP_PROJECTS[0].description}\n\n## Quickstart\n\`\`\`bash\n${FLAGSHIP_PROJECTS[0].quickstartCommands.join('\n')}\n\`\`\``);
  }

  // 3. Add Project 2: FlashLLM-Engine complete files
  const flashllmFolder = zip.folder('projects/flash_llm_engine');
  if (flashllmFolder) {
    FLAGSHIP_PROJECTS[1].coreModules.forEach(mod => {
      flashllmFolder.file(mod.filename.split('/').pop() || 'kernel.cu', mod.code);
    });
    flashllmFolder.file('README.md', `# FlashLLM-Engine\n\n${FLAGSHIP_PROJECTS[1].description}\n\n## Quickstart\n\`\`\`bash\n${FLAGSHIP_PROJECTS[1].quickstartCommands.join('\n')}\n\`\`\``);
  }

  // 4. Add 5 Mini Projects & 2 Major Project Guides
  const guidesFolder = zip.folder('project_guides');
  if (guidesFolder) {
    PROJECT_GUIDES.forEach(g => {
      const content = `# ${g.title}\n\n**Tagline**: ${g.tagline}\n**Difficulty**: ${g.difficulty} | **Est. Time**: ${g.estimatedHours}\n\n## Overview\n${g.overview}\n\n## Learning Objectives\n${g.learningObjectives.map(o => `- ${o}`).join('\n')}\n\n## Architecture\n\`\`\`\n${g.architectureDiagram}\n\`\`\`\n\n## Complete Implementation\n\`\`\`cpp\n${g.completeCode}\n\`\`\`\n\n## Test Suite\n\`\`\`cpp\n${g.testSuiteCode}\n\`\`\`\n\n## CMakeLists.txt\n\`\`\`cmake\n${g.cmakeFile}\n\`\`\`\n`;
      guidesFolder.file(`${g.id}.md`, content);
    });
  }

  // 5. Add 1,000 Questions Comprehensive Bank File
  let questionsMarkdown = `# 1,000 Deep Learning CUDA C++ & Systems Questions\n\n`;
  ONE_THOUSAND_QUESTIONS.forEach(q => {
    questionsMarkdown += `### Q#${q.id}: ${q.question}\n**Category**: ${q.category} | **Difficulty**: ${q.difficulty}\n\n**Short Answer**: ${q.shortAnswer}\n\n**Detailed Explanation**:\n${q.detailedExplanation}\n\n`;
    if (q.codeSnippet) {
      questionsMarkdown += `\`\`\`cpp\n${q.codeSnippet}\n\`\`\`\n\n`;
    }
    if (q.hardwareInsight) {
      questionsMarkdown += `> **Hardware Insight**: ${q.hardwareInsight}\n\n`;
    }
    questionsMarkdown += `---\n\n`;
  });

  zip.file('1000_CUDA_DEEP_LEARNING_QUESTIONS.md', questionsMarkdown);

  return await zip.generateAsync({ type: 'blob' });
}
