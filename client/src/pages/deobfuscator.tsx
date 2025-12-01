import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Download, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Deobfuscator() {
  const [obfuscatedCode, setObfuscatedCode] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: job, isLoading: isJobLoading } = useQuery({
    queryKey: ["/api/deobfuscate/job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await fetch(`/api/deobfuscate/job/${jobId}`);
      if (!response.ok) throw new Error("Failed to fetch job");
      return response.json();
    },
    refetchInterval: jobId && job?.status === "processing" ? 1000 : false,
  });

  const deobfuscateMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest("POST", "/api/deobfuscate", { code });
    },
    onSuccess: (data) => {
      setJobId(data.jobId);
      toast({
        title: "Success",
        description: "Deobfuscation started",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Deobfuscation failed",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!obfuscatedCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter code to deobfuscate",
        variant: "destructive",
      });
      return;
    }
    deobfuscateMutation.mutate(obfuscatedCode);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
  };

  const handleDownload = (text: string, filename: string) => {
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Luau Deobfuscator</h1>
          <p className="text-muted-foreground mt-2">
            Deobfuscate Luau code using AI-powered analysis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Obfuscated Code</h2>
                <Textarea
                  placeholder="Paste your obfuscated Luau code here..."
                  value={obfuscatedCode}
                  onChange={(e) => setObfuscatedCode(e.target.value)}
                  className="h-96 font-mono text-sm"
                  disabled={deobfuscateMutation.isPending}
                  data-testid="textarea-obfuscated-code"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={
                  deobfuscateMutation.isPending ||
                  !obfuscatedCode.trim() ||
                  isJobLoading
                }
                className="w-full"
                data-testid="button-deobfuscate"
              >
                {deobfuscateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Deobfuscate"
                )}
              </Button>
            </div>
          </Card>

          {/* Output Section */}
          <Card className="p-6">
            <div className="space-y-4 h-full flex flex-col">
              <h2 className="text-xl font-semibold">Deobfuscated Code</h2>

              {!jobId ? (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground">
                  Enter code and click "Deobfuscate" to see results here
                </div>
              ) : job?.status === "processing" ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Processing: {job?.progress || 0}%</p>
                  </div>
                </div>
              ) : job?.status === "error" ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{job?.error}</AlertDescription>
                </Alert>
              ) : job?.deobfuscatedCode ? (
                <>
                  <Textarea
                    value={job.deobfuscatedCode}
                    readOnly
                    className="h-80 font-mono text-sm"
                    data-testid="textarea-deobfuscated-code"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(job.deobfuscatedCode)}
                      data-testid="button-copy-code"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(job.deobfuscatedCode, "deobfuscated.lua")}
                      data-testid="button-download-code"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>

                  {job.geminiAnalysis && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-sm mb-2">AI Analysis</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {job.geminiAnalysis}
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="mt-8 p-6 bg-muted">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Paste your obfuscated Luau code in the left panel</li>
            <li>Click "Deobfuscate" to analyze and process the code</li>
            <li>Gemini 2.5 AI helps identify patterns and reconstruct readable code</li>
            <li>Copy or download the deobfuscated code</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
