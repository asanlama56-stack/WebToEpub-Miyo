import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ShellExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export async function executeCommand(command: string, timeout: number = 30000): Promise<ShellExecutionResult> {
  try {
    const { stdout, stderr } = await execAsync(command, { 
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    return {
      stdout,
      stderr,
      exitCode: 0,
      success: true,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "Unknown error",
      exitCode: error.code || 1,
      success: false,
    };
  }
}

export async function executeCommandWithStream(
  command: string,
  onProgress: (data: string) => void,
  timeout: number = 30000
): Promise<ShellExecutionResult> {
  return new Promise((resolve) => {
    const childProcess = exec(command, { 
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      resolve({
        stdout,
        stderr,
        exitCode: error?.code || 0,
        success: !error,
      });
    });

    if (childProcess.stdout) {
      childProcess.stdout.on("data", (data) => {
        onProgress(data.toString());
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.on("data", (data) => {
        onProgress(`[ERROR] ${data.toString()}`);
      });
    }
  });
}
