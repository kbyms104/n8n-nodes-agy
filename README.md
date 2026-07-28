# n8n-nodes-agy

Official **n8n Community Node** to execute **Google Antigravity CLI (AGY)** AI agents directly inside your **n8n workflows**.

Transform your n8n instance into an autonomous AI agent engine—powering code generation, project refactoring, and multi-turn AI reasoning tasks seamlessly.

---

## 🚀 Quick Start in n8n

### 1. Install Node in n8n
1. Go to **Settings ➡️ Community Nodes** in your n8n dashboard.
2. Click **Install a community node**.
3. Enter `n8n-nodes-agy` and click **Install**.

### 2. Add AGY Node to Canvas
1. Search for **AGY** in your n8n workflow node selector.
2. Enter your prompt in the **Prompt / Instruction** field:
   > *"Analyze this JSON payload and draft a refactored Python backend function."*
3. Click **Test step** — receive structured AI response and token metrics instantly!

---

## 🔑 AGY Authentication & `.gemini` Directory Setup

To run AGY inside n8n headlessly without interactive login prompts, the n8n Docker container accesses your host's AGY authentication session stored in `~/.gemini`.

### 1. Initial Host Authentication
Before running the node in n8n, perform a one-time login on your host machine:
```bash
# Run AGY CLI on host to authenticate with Google
agy
```
This generates OAuth tokens (`antigravity-oauth-token`) and configuration files inside your host directory `~/.gemini`.

### 2. Set Host Folder Permissions (`~/.gemini`)
OAuth tokens are initially created with strict owner-only permissions (`600`). To allow the n8n container process to read authentication tokens and write refreshed sessions without exposing files to world/others, grant group read and write permissions:

```bash
# Grant group read and write permissions to ~/.gemini (keeps world/others access blocked)
sudo chmod -R g+rw ~/.gemini
```

---

## 📥 Output Payload Schema (n8n Data Mapping)

The AGY node returns structured JSON data ready for downstream n8n nodes (HTTP Request, Slack, Email, Postgres, Webhook):

```json
{
  "success": true,
  "exitCode": 0,
  "parsed": {
    "conversation_id": "8a32a4f7-5b5a-4631-9c24-46da12e853a3",
    "status": "SUCCESS",
    "response": "Here is the refactored Python function with optimized memory usage...",
    "duration_seconds": 3.094,
    "num_turns": 1,
    "usage": {
      "input_tokens": 9946,
      "output_tokens": 254,
      "thinking_tokens": 175,
      "cache_read_tokens": 8141,
      "total_tokens": 10200
    }
  },
  "prompt": "Refactor python function",
  "model": "Gemini 3.6 Flash (High)",
  "command": "agy --dangerously-skip-permissions --output-format json --model \"Gemini 3.6 Flash (High)\" -p \"Refactor python function\""
}
```

### Accessing Output in n8n Expressions:
- **AI Response Text**: `{{ $json.parsed.response }}`
- **Total Token Count**: `{{ $json.parsed.usage.total_tokens }}`
- **Conversation Session ID**: `{{ $json.parsed.conversation_id }}`

---

## ⚡ Workflow Integration Examples

### Example 1: Webhook ➡️ AGY AI ➡️ Slack Notification
1. **Webhook Trigger**: Receives code review request or user prompt via HTTP POST.
2. **AGY Node**: Runs prompt with `Gemini 3.6 Flash (High)` in headless unattended mode.
3. **Slack Node**: Sends `{{ $json.parsed.response }}` directly to your dev channel.

### Example 2: Scheduled Daily Code Health Check
1. **Schedule Trigger**: Runs daily at 09:00 AM.
2. **AGY Node**: Executes system refactoring analysis on target repository.
3. **Email / Notion Node**: Archives daily AI code recommendations.

---

## ⚙️ n8n Node Options & Parameters

| Parameter | Description | Options / Defaults |
| --- | --- | --- |
| **Prompt / Instruction** | Main prompt or task instruction | Supports dynamic n8n expressions (`{{ $json.body.prompt }}`) |
| **Model** | AI Model selection | `Gemini 3.6 Flash (High)` (Default), `Gemini 3.5 Flash`, `Gemini 3.1 Pro`, `Claude Sonnet 4.6 (Thinking)`, `Claude Opus 4.6 (Thinking)`, `GPT-OSS 120B (Medium)`, or `Custom` |
| **Output Format** | Output parsing format | `json` (Parsed object), `text` (Raw string), `stream-json` |
| **Execution Mode** | AGY execution mode | `default`, `plan` (Planning mode), `accept-edits` |
| **Terminal Sandbox** | Security isolation | `default`, `sandbox`, `no-sandbox` |
| **Subagent Name** | Delegate to specialized subagent | e.g. `research`, `codebase-analyzer` |
| **Working Directory** | Workspace project directory | Defaults to `/tmp` |

---

## 🐳 Docker Deployment Template for n8n Servers

If hosting n8n in Docker (Oracle Cloud, AWS, GCP, VPS), use this `docker-compose.yml` to mount the host `agy` binary, `.gemini` settings, and glibc libraries:

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - HOME=/home/node                     # Container HOME path
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
      - WEBHOOK_URL=http://<YOUR_SERVER_IP>:5678
      - N8N_SECURE_COOKIE=false             # Allow HTTP IP login
    volumes:
      - n8n_data:/home/node/.n8n
      # Custom node volume
      - ./custom_nodes/n8n-nodes-agy:/home/node/.n8n/custom/node_modules/n8n-nodes-agy
      # Mount host AGY binary & authentication
      - ~/.local/bin/agy:/usr/local/bin/agy:ro
      - ~/.gemini:/home/node/.gemini
      # Mount host glibc dynamic libraries
      - /lib/aarch64-linux-gnu:/lib/aarch64-linux-gnu:ro
      - /lib/ld-linux-aarch64.so.1:/lib/ld-linux-aarch64.so.1:ro

volumes:
  n8n_data:
```

---

## ❓ Troubleshooting FAQs

- **`open /home/node/.gemini/antigravity-cli/...: permission denied`**: Run `sudo chmod -R g+rw ~/.gemini` on the host to grant group read and write access without exposing files to world/others.
- **`authentication required`**: Perform initial interactive login on host by running `agy` once before starting n8n.
- **`Error relocating /usr/local/bin/agy: symbol not found`**: Ensure host glibc libraries (`/lib/aarch64-linux-gnu`) are mounted in your `docker-compose.yml`.

---

## 📄 License

MIT License
