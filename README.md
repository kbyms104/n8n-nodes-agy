# n8n-nodes-agy

An official, specification-aligned **n8n Community Node** designed to integrate and execute **Google Antigravity CLI (`agy`)** natively inside n8n workflows.

---

## 🌟 Key Features

- **Exact Model Resolution**: Pre-configured exact string matches for AGY CLI models:
  - `Gemini 3.6 Flash (High)` (Default)
  - `Gemini 3.6 Flash (Medium)`
  - `Gemini 3.6 Flash (Low)`
  - `Gemini 3.5 Flash (High / Medium / Low)`
  - `Gemini 3.1 Pro (High / Low)`
  - `Claude Sonnet 4.6 (Thinking)`
  - `Claude Opus 4.6 (Thinking)`
  - `GPT-OSS 120B (Medium)`
  - `Custom Model Name` (allows custom model string overrides)
- **Unattended Automation (`--dangerously-skip-permissions`)**: Bypasses confirmation dialogs for headless background workflow execution.
- **Rich Structured Output Parsing**: Automatically parses CLI JSON output into n8n native JSON fields (`$json.parsed.response`, `$json.parsed.usage.total_tokens`, `$json.parsed.conversation_id`).
- **Execution Modes & Terminal Sandbox (`--mode`, `--sandbox`)**: Planning mode (`plan`), edit acceptance (`accept-edits`), and OS security sandbox isolation.
- **Subagent & Session Resumption (`--subagent`, `-c / --conversation`)**: Delegate tasks to specialized subagents and resume session contexts across workflows.

---

## 📋 Prerequisites

1. The host server running n8n must have the **AGY CLI** installed.
   ```bash
   # Install AGY CLI on host
   curl -fsSL https://antigravity.google/install.sh | bash

   # Verify installation and complete initial interactive login
   agy --version
   agy
   ```

---

## 🚀 Installation & Setup

### Method 1. Community Node UI Installation (Recommended)

1. Open your n8n web dashboard.
2. Go to **Settings ➡️ Community Nodes**.
3. Click **Install a community node**.
4. Enter package name: `n8n-nodes-agy`
5. Click **Install**.

---

### Method 2. Secure Production Setup for Docker / Cloud Instances (`docker-compose.yml`)

Use the following clean `docker-compose.yml` template for Docker deployments (e.g. Oracle Cloud, AWS, GCP, Ubuntu VPS). This template mounts the host AGY binary, configuration directory, and required glibc libraries:

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - HOME=/home/node                     # Explicit container HOME
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
      - WEBHOOK_URL=http://<YOUR_SERVER_IP>:5678
      - N8N_SECURE_COOKIE=false             # Allow HTTP IP login
    volumes:
      - n8n_data:/home/node/.n8n
      # Custom node mount
      - ./custom_nodes/n8n-nodes-agy:/home/node/.n8n/custom/node_modules/n8n-nodes-agy
      # Mount host AGY binary and authentication settings
      - ~/.local/bin/agy:/usr/local/bin/agy:ro
      - ~/.gemini:/home/node/.gemini
      # Mount host glibc dynamic libraries (ARM64 / x86_64)
      - /lib/aarch64-linux-gnu:/lib/aarch64-linux-gnu:ro
      - /lib/ld-linux-aarch64.so.1:/lib/ld-linux-aarch64.so.1:ro

volumes:
  n8n_data:
```

---

### 🛡️ Host File Permissions Setup

Ensure the container process has read/write permissions to `.gemini` files:

```bash
# Ensure directory and file permissions for container access
sudo chmod -R 775 ~/.gemini
```

---

## ⚙️ Node Parameters Reference

| Parameter Name | Type | Default | CLI Flag | Description |
| --- | --- | --- | --- | --- |
| **Prompt / Instruction** | Multiline String | **Required** | `-p "<prompt>"` | Instruction passed to AGY |
| **Model** | Options | `Gemini 3.6 Flash (High)` | `--model <name>` | Select exact model label |
| **Output Format** | Options | `json` | `--output-format` | `text`, `json`, or `stream-json` |
| **Execution Mode** | Options | `default` | `--mode` | `default`, `plan`, `accept-edits` |
| **Terminal Sandbox** | Options | `default` | `--sandbox` / `--no-sandbox` | Security sandbox isolation |
| **Subagent Name** | String | `""` | `--subagent <name>` | Delegate task to subagent |
| **Working Directory** | String | `""` | `cwd` / `--add-dir` | Project working directory (defaults to `/tmp`) |
| **AGY Executable Path** | String | `agy` | N/A | Path or binary name of AGY CLI |
| **Timeout (Seconds)** | Number | `300` | N/A | Execution timeout in seconds |
| **Additional Flags** | String | `""` | Custom | Extra CLI flags |

---

## 📊 Output Data Structure

The node returns structured JSON data containing both raw stdout and parsed AGY payloads:

```json
{
  "success": true,
  "exitCode": 0,
  "output": "...",
  "stderr": "",
  "parsed": {
    "conversation_id": "8a32a4f7-5b5a-4631-9c24-46da12e853a3",
    "status": "SUCCESS",
    "response": "Hello! I am Antigravity, an AI coding assistant developed by Google DeepMind...",
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
  "prompt": "Who are you?",
  "model": "Gemini 3.6 Flash (High)",
  "workingDir": "/tmp",
  "command": "agy --dangerously-skip-permissions --output-format json --model \"Gemini 3.6 Flash (High)\" -p \"Who are you?\""
}
```

---

## 💡 Usage Example

1. Add **AGY** node to your n8n workflow canvas.
2. Set **Prompt**: `Write a Python script to fetch weather data from an API and save it to CSV.`
3. Set **Model**: `Gemini 3.6 Flash (High)`
4. Set **Output Format**: `JSON Object (json)`
5. Click **Test step**.
6. Access the response in downstream nodes via `{{ $json.parsed.response }}`.

---

## ❓ Troubleshooting FAQs

### Q1. `Error relocating /usr/local/bin/agy: __read: symbol not found`
- **Cause**: Missing host glibc dynamic libraries inside container.
- **Solution**: Add the glibc volume mounts (`/lib/aarch64-linux-gnu` and `/lib/ld-linux-aarch64.so.1`) to `docker-compose.yml`.

### Q2. `open /home/node/.gemini/antigravity-cli/antigravity-oauth-token: permission denied`
- **Cause**: OAuth token file lacks read permissions for the n8n container process.
- **Solution**: Run `sudo chmod -R 775 ~/.gemini`.

### Q3. `invalid model selection (--model "Gemini 3.6 Flash"): --effort is not supported`
- **Cause**: Model flags require exact label strings (e.g. `Gemini 3.6 Flash (High)`).
- **Solution**: Select model from the dropdown or pass exact label string in `Custom Model Name`.

---

## 📄 License

MIT License
