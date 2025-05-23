#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import https from 'https';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
if (!token || !repo) {
  console.error('GITHUB_TOKEN and GITHUB_REPOSITORY must be set');
  process.exit(0); // gracefully exit if not provided
}

const [owner, repoName] = repo.split('/');

function githubRequest(method, apiPath, data) {
  const options = {
    method,
    hostname: 'api.github.com',
    path: apiPath,
    headers: {
      'User-Agent': 'todo-sync-action',
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : {});
        } else {
          reject(new Error(`GitHub API ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
}

const TODO_PATH = path.join(process.cwd(), 'TODO.md');
if (!fs.existsSync(TODO_PATH)) {
  console.log('No TODO.md found, skipping');
  process.exit(0);
}

let todoContent = fs.readFileSync(TODO_PATH, 'utf8').split(/\r?\n/);

function lineHasIssueRef(line) {
  return /#(\d+)/.test(line);
}

async function createIssue(title) {
  const issue = await githubRequest('POST', `/repos/${owner}/${repoName}/issues`, { title, body: 'Created from TODO.md' });
  return issue;
}

async function ensureTodoEntriesForOpenIssues() {
  const issues = await githubRequest('GET', `/repos/${owner}/${repoName}/issues?state=open`);
  issues.forEach(issue => {
    if (!todoContent.some(line => line.includes(`#${issue.number}`))) {
      todoContent.push(`- [ ] ${issue.title} #${issue.number}`);
    }
  });
}

async function moveClosedIssuesToCompleted() {
  const lines = [];
  const completedLines = [];
  for (const line of todoContent) {
    const match = line.match(/#(\d+)/);
    if (match) {
      const num = match[1];
      try {
        const issue = await githubRequest('GET', `/repos/${owner}/${repoName}/issues/${num}`);
        const filename = path.join('.todo', `${num}-${slugify(issue.title)}.md`);
        fs.mkdirSync('.todo', { recursive: true });
        fs.writeFileSync(filename, issue.body || '');
        if (issue.state === 'closed') {
          completedLines.push(`- [x] ${issue.title} #${num}`);
          continue;
        }
      } catch (err) {
        console.error(err.message);
      }
    }
    lines.push(line);
  }
  // find completed section index
  let idx = lines.findIndex(l => l.trim().startsWith('### Completed'));
  if (idx === -1) {
    lines.push('');
    lines.push('### Completed \u2713');
    idx = lines.length - 1;
  }
  if (completedLines.length) {
    lines.splice(idx + 1, 0, ...completedLines);
  }
  todoContent = lines;
}

async function createIssuesForNewTasks() {
  for (let i = 0; i < todoContent.length; i++) {
    const line = todoContent[i];
    if (/^- \[ \]/.test(line) && !lineHasIssueRef(line)) {
      const title = line.replace(/^- \[ \] ?/, '').trim();
      try {
        const issue = await createIssue(title);
        const slug = slugify(issue.title);
        const filename = path.join('.todo', `${issue.number}-${slug}.md`);
        fs.mkdirSync('.todo', { recursive: true });
        fs.writeFileSync(filename, issue.body || '');
        todoContent[i] = `- [ ] ${title} #${issue.number}`;
      } catch (err) {
        console.error(err.message);
      }
    }
  }
}

(async function main() {
  try {
    await createIssuesForNewTasks();
    await ensureTodoEntriesForOpenIssues();
    await moveClosedIssuesToCompleted();
    fs.writeFileSync(TODO_PATH, todoContent.join('\n'));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
