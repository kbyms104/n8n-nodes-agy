import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';
import { spawn } from 'child_process';
import * as os from 'os';

export class Agy implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AGY (Antigravity CLI)',
    name: 'agy',
    icon: 'file:agy.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["prompt"]}}',
    description: 'Execute Google Antigravity CLI (agy) commands seamlessly in n8n workflows',
    defaults: {
      name: 'AGY',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Prompt / Instruction',
        name: 'prompt',
        type: 'string',
        typeOptions: {
          rows: 4,
        },
        default: '',
        required: true,
        description: 'Instruction or prompt to pass to AGY CLI (-p / --print)',
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: [
          { name: 'Gemini 3.6 Flash (High) - Default', value: 'Gemini 3.6 Flash (High)' },
          { name: 'Gemini 3.6 Flash (Medium)', value: 'Gemini 3.6 Flash (Medium)' },
          { name: 'Gemini 3.6 Flash (Low)', value: 'Gemini 3.6 Flash (Low)' },
          { name: 'Gemini 3.5 Flash (High)', value: 'Gemini 3.5 Flash (High)' },
          { name: 'Gemini 3.5 Flash (Medium)', value: 'Gemini 3.5 Flash (Medium)' },
          { name: 'Gemini 3.5 Flash (Low)', value: 'Gemini 3.5 Flash (Low)' },
          { name: 'Gemini 3.1 Pro (High)', value: 'Gemini 3.1 Pro (High)' },
          { name: 'Gemini 3.1 Pro (Low)', value: 'Gemini 3.1 Pro (Low)' },
          { name: 'Claude Sonnet 4.6 (Thinking)', value: 'Claude Sonnet 4.6 (Thinking)' },
          { name: 'Claude Opus 4.6 (Thinking)', value: 'Claude Opus 4.6 (Thinking)' },
          { name: 'GPT-OSS 120B (Medium)', value: 'GPT-OSS 120B (Medium)' },
          { name: 'Custom Model Name', value: 'custom' },
        ],
        default: 'Gemini 3.6 Flash (High)',
        description: 'AI model to use for the AGY execution (--model)',
      },
      {
        displayName: 'Custom Model Name',
        name: 'customModelName',
        type: 'string',
        displayOptions: {
          show: {
            model: ['custom'],
          },
        },
        default: '',
        description: 'Exact model identifier passed to --model',
      },
      {
        displayName: 'Output Format',
        name: 'outputFormat',
        type: 'options',
        options: [
          { name: 'Plain Text (text)', value: 'text' },
          { name: 'JSON Object (json)', value: 'json' },
          { name: 'Stream JSON (stream-json)', value: 'stream-json' },
        ],
        default: 'json',
        description: 'Stdout output format for AGY CLI (--output-format)',
      },
      {
        displayName: 'Execution Mode',
        name: 'mode',
        type: 'options',
        options: [
          { name: 'Default / Auto', value: 'default' },
          { name: 'Planning Mode (--mode plan)', value: 'plan' },
          { name: 'Accept Edits Mode (--mode accept-edits)', value: 'accept-edits' },
        ],
        default: 'default',
        description: 'Operating mode for AGY CLI (--mode)',
      },
      {
        displayName: 'Terminal Sandbox',
        name: 'sandbox',
        type: 'options',
        options: [
          { name: 'Default System Setting', value: 'default' },
          { name: 'Force Sandbox Enabled (--sandbox)', value: 'sandbox' },
          { name: 'Disable Sandbox (--no-sandbox)', value: 'no-sandbox' },
        ],
        default: 'default',
        description: 'Control sandbox security isolation for terminal execution',
      },
      {
        displayName: 'Subagent Name',
        name: 'subagent',
        type: 'string',
        default: '',
        description: 'Delegate task to a specific AGY subagent (--subagent)',
      },
      {
        displayName: 'Working Directory',
        name: 'workingDirectory',
        type: 'string',
        default: '',
        description: 'Target project working directory (leave blank for automatic safe tmp directory)',
      },
      {
        displayName: 'AGY Executable Path',
        name: 'commandPath',
        type: 'string',
        default: 'agy',
        description: 'Path or binary name of AGY CLI (default: agy)',
      },
      {
        displayName: 'Timeout (Seconds)',
        name: 'timeout',
        type: 'number',
        default: 300,
        description: 'Maximum execution timeout in seconds',
      },
      {
        displayName: 'Additional Flags',
        name: 'additionalArgs',
        type: 'string',
        default: '',
        description: 'Space-separated additional CLI flags',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const prompt = this.getNodeParameter('prompt', itemIndex, '') as string;
        const model = this.getNodeParameter('model', itemIndex, 'Gemini 3.6 Flash (High)') as string;
        const customModelName = this.getNodeParameter('customModelName', itemIndex, '') as string;
        const outputFormat = this.getNodeParameter('outputFormat', itemIndex, 'json') as string;
        const mode = this.getNodeParameter('mode', itemIndex, 'default') as string;
        const sandbox = this.getNodeParameter('sandbox', itemIndex, 'default') as string;
        const subagent = this.getNodeParameter('subagent', itemIndex, '') as string;
        const userWorkingDir = this.getNodeParameter('workingDirectory', itemIndex, '') as string;
        const commandPath = this.getNodeParameter('commandPath', itemIndex, 'agy') as string;
        const timeoutSeconds = this.getNodeParameter('timeout', itemIndex, 300) as number;
        const additionalArgsStr = this.getNodeParameter('additionalArgs', itemIndex, '') as string;

        // Resolve working directory: fallback to OS temp dir if empty
        let targetCwd = userWorkingDir.trim();
        if (!targetCwd) {
          targetCwd = os.tmpdir();
        }

        const homeDir = process.env.HOME || '/home/node';
        const args: string[] = [];

        // 1. Permission override flag (FIRST)
        args.push('--dangerously-skip-permissions');

        // 2. Output format (--output-format)
        if (outputFormat && outputFormat.length > 0) {
          args.push('--output-format', outputFormat);
        }

        // 3. Add workspace directory if set
        if (userWorkingDir.trim().length > 0) {
          args.push('--add-dir', userWorkingDir.trim());
        }

        // 4. Model selection (--model) - Pass exact AGY model string
        const targetModel = model === 'custom' ? customModelName.trim() : model;
        if (targetModel.length > 0) {
          args.push('--model', targetModel);
        }

        // 5. Execution mode (--mode)
        if (mode && mode !== 'default') {
          args.push('--mode', mode);
        }

        // 6. Terminal sandbox (--sandbox / --no-sandbox)
        if (sandbox === 'sandbox') {
          args.push('--sandbox');
        } else if (sandbox === 'no-sandbox') {
          args.push('--no-sandbox');
        }

        // 7. Subagent delegation (--subagent)
        if (subagent.trim().length > 0) {
          args.push('--subagent', subagent.trim());
        }

        // 8. Additional custom CLI flags
        if (additionalArgsStr.trim().length > 0) {
          const splitArgs = additionalArgsStr.trim().split(/\s+/);
          args.push(...splitArgs);
        }

        // 9. Headless prompt flag MUST BE LAST (-p "prompt")
        args.push('-p', prompt);

        const options: { cwd: string; env: NodeJS.ProcessEnv } = {
          cwd: targetCwd,
          env: {
            ...process.env,
            HOME: homeDir,
            USER: process.env.USER || 'node',
            NONINTERACTIVE: '1',
            CI: 'true',
            TMPDIR: os.tmpdir(),
          },
        };

        const executionResult = await new Promise<{
          stdout: string;
          stderr: string;
          exitCode: number | null;
        }>((resolve, reject) => {
          const child = spawn(commandPath, args, options);
          let stdout = '';
          let stderr = '';

          const timer = setTimeout(() => {
            child.kill('SIGTERM');
            reject(new Error(`AGY execution timed out after ${timeoutSeconds} seconds`));
          }, timeoutSeconds * 1000);

          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          child.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
          });

          child.on('close', (code) => {
            clearTimeout(timer);
            resolve({
              stdout,
              stderr,
              exitCode: code,
            });
          });
        });

        let parsedOutput: any = null;
        const stdoutTrimmed = executionResult.stdout.trim();

        if ((outputFormat === 'json' || outputFormat === 'stream-json') && stdoutTrimmed.length > 0) {
          try {
            if (outputFormat === 'stream-json') {
              parsedOutput = stdoutTrimmed
                .split('\n')
                .filter((line) => line.trim().length > 0)
                .map((line) => JSON.parse(line));
            } else {
              parsedOutput = JSON.parse(stdoutTrimmed);
            }
          } catch (e) {
            // Keep raw stdout if JSON parsing fails
          }
        }

        // Format printable command string with quotes around arguments containing spaces
        const formattedCmdArgs = args.map((arg) => (arg.includes(' ') ? `"${arg}"` : arg));
        const displayCommand = `${commandPath} ${formattedCmdArgs.join(' ')}`;

        returnData.push({
          json: {
            success: executionResult.exitCode === 0,
            exitCode: executionResult.exitCode,
            output: stdoutTrimmed,
            stderr: executionResult.stderr.trim(),
            parsed: parsedOutput,
            prompt,
            model: targetModel,
            workingDir: targetCwd,
            command: displayCommand,
          },
        });
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              success: false,
              error: error.message || String(error),
            },
          });
          continue;
        }
        throw new NodeOperationError(this.getNode(), error, {
          itemIndex,
        });
      }
    }

    return [returnData];
  }
}
