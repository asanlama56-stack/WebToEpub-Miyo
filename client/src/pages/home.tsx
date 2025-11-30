import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Book, Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { UrlInput } from "@/components/url-input";
import { FormatSelector } from "@/components/format-selector";
import { ChapterList } from "@/components/chapter-list";
import { MetadataDisplay } from "@/components/metadata-display";
import { SettingsPanel } from "@/components/settings-panel";
import { DownloadQueue } from "@/components/download-queue";
import { EmptyState } from "@/components/empty-state";
import type {
  DownloadJob,
  BookMetadata,
  OutputFormatType,
  DownloadSettings,
  AnalyzeResponse,
} from "@shared/schema";
import { defaultSettings } from "@shared/schema";

export default function Home() {
  const [currentJob, setCurrentJob] = useState<DownloadJob | null>(null);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormatType>("epub");
  const [settings, setSettings] = useState<DownloadSettings>(defaultSettings);
  const [editableMetadata, setEditableMetadata] = useState<Partial<BookMetadata>>({});
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageJobId, setImageJobId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; text: string; sender: 'user' | 'ai' }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: downloadJobs = [] } = useQuery<DownloadJob[]>({
    queryKey: ["/api/jobs"],
    refetchInterval: 2000,
  });

  // Poll for image status when we have an imageJobId
  useEffect(() => {
    if (!imageJobId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${imageJobId}/image-status`);
        if (!response.ok) {
          console.warn("[IMG-POLL] Status check failed:", response.status);
          return;
        }
        const data = await response.json();
        console.log("[IMG-POLL] Status:", data.state, "FinalUrl:", !!data.finalUrl);

        if (data.state === "success" && data.finalUrl) {
          // Update metadata with the validated image
          setEditableMetadata(prev => ({
            ...prev,
            coverUrl: data.finalUrl
          }));
          setImageLoaded(true);
          clearInterval(interval);
        } else if (data.state === "failed") {
          console.error("[IMG-POLL] Image validation failed:", data.error);
          setImageLoaded(true); // Allow download even without image
          clearInterval(interval);
        }
      } catch (error) {
        console.error("[IMG-POLL] Error checking image status:", error);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [imageJobId]);

  const analyzeMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/analyze", { url });
      return await response.json() as AnalyzeResponse;
    },
    onSuccess: (data) => {
      if (data.success && data.job) {
        setCurrentJob(data.job);
        setSelectedChapterIds(data.job.chapters.map((ch) => ch.id));
        setImageLoaded(false);
        if (data.job.metadata) {
          setOutputFormat(data.job.metadata.recommendedFormat);
          setEditableMetadata({
            title: data.job.metadata.title,
            author: data.job.metadata.author,
            description: data.job.metadata.description,
            coverUrl: data.job.metadata.coverUrl,
          });
          // Start polling for image validation if imageJobId exists
          const imgJobId = (data.job.metadata as any).imageJobId;
          if (imgJobId) {
            setImageJobId(imgJobId);
          }
        }
        toast({
          title: "Analysis Complete",
          description: `Found ${data.job.chapters.length} chapters`,
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: data.message || "Could not analyze the URL",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze the URL",
        variant: "destructive",
      });
    },
  });

  const [analysisProgress, setAnalysisProgress] = useState(0);

  const { data: analysisJob } = useQuery<DownloadJob | null>({
    queryKey: ["/api/jobs"],
    refetchInterval: 500,
    select: (jobs: DownloadJob[]) => {
      return (jobs || []).find((j: DownloadJob) => j.status === "analyzing") || null;
    },
    enabled: analyzeMutation.isPending,
  });

  useEffect(() => {
    if (analysisJob) {
      setAnalysisProgress(analysisJob.progress);
    }
  }, [analysisJob?.progress]);

  const downloadMutation = useMutation({
    mutationFn: async (params: {
      jobId: string;
      selectedChapterIds: string[];
      outputFormat: OutputFormatType;
      metadata?: Partial<BookMetadata>;
      settings?: Partial<DownloadSettings>;
    }) => {
      const response = await apiRequest("POST", "/api/download", params);
      return await response.json() as { success: boolean; jobId: string; message?: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
        toast({
          title: "Download Started",
          description: "Your book is being processed",
        });
        setCurrentJob(null);
        setSelectedChapterIds([]);
      } else {
        toast({
          title: "Download Failed",
          description: data.message || "Failed to start download",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = useCallback((url: string) => {
    analyzeMutation.mutate(url);
  }, [analyzeMutation]);

  const handleStartDownload = useCallback(() => {
    if (!currentJob) return;
    
    if (selectedChapterIds.length > 2000) {
      toast({
        title: "Too Many Chapters",
        description: "Downloads are limited to 2000 chapters maximum to ensure stability on mobile devices. Please select fewer chapters.",
        variant: "destructive",
      });
      return;
    }
    
    downloadMutation.mutate({
      jobId: currentJob.id,
      selectedChapterIds,
      outputFormat,
      metadata: editableMetadata,
      settings: {
        concurrentDownloads: settings.concurrentDownloads,
        delayBetweenRequests: settings.delayBetweenRequests,
        retryAttempts: settings.retryAttempts,
        includeImages: settings.includeImages,
        cleanupHtml: settings.cleanupHtml,
      },
    });
  }, [currentJob, selectedChapterIds, outputFormat, editableMetadata, settings, downloadMutation, toast]);

  const handleDownloadFile = useCallback(async (job: DownloadJob) => {
    if (job.outputPath) {
      try {
        const response = await fetch(`/api/download-file/${job.id}`);
        if (!response.ok) throw new Error("Download failed");
        
        const blob = await response.blob();
        const contentDisposition = response.headers.get("content-disposition") || "";
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        const filename = filenameMatch ? filenameMatch[1] : `book.${job.outputFormat}`;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download Started",
          description: `${filename} is downloading to your device`,
        });
      } catch (error) {
        toast({
          title: "Download Failed",
          description: "Could not download the file. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const handleCancelJob = useCallback(async (jobId: string) => {
    try {
      const response = await apiRequest("POST", `/api/jobs/${jobId}/cancel`, {});
      await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Download Cancelled",
        description: "The download has been cancelled",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to cancel download",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

  const handleClearCompleted = useCallback(async () => {
    try {
      const response = await apiRequest("POST", "/api/jobs/clear-completed", {});
      await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    } catch {
      toast({
        title: "Error",
        description: "Failed to clear completed downloads",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

  const handleSettingsChange = useCallback((newSettings: Partial<DownloadSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const handleMetadataChange = useCallback((newMetadata: Partial<BookMetadata>) => {
    setEditableMetadata((prev) => ({ ...prev, ...newMetadata }));
  }, []);

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { id: Date.now().toString(), text: userMessage, sender: 'user' }]);
    setChatLoading(true);

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyB4ilhZI-C6_J6-AADS0VONispc8IhTXls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      });

      if (!response.ok) throw new Error('AI error');
      const data = await response.json();
      const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I encountered an error.';
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: aiReply, sender: 'ai' }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: 'Sorry, I encountered an error. Please try again.', sender: 'ai' }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Book className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">WebToBook</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Web Novel to EPUB/PDF Converter
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <UrlInput
          onAnalyze={handleAnalyze}
          isLoading={analyzeMutation.isPending}
        />

        {analyzeMutation.isPending && (
          <div className="p-6 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Analyzing URL and detecting chapters...</p>
              <p className="text-xs text-muted-foreground">{Math.round(analysisProgress)}%</p>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}

        {analyzeMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {analyzeMutation.error?.message || "Failed to analyze URL"}
            </AlertDescription>
          </Alert>
        )}

        {currentJob ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <ChapterList
                chapters={currentJob.chapters}
                selectedIds={selectedChapterIds}
                onSelectionChange={setSelectedChapterIds}
                isLoading={downloadMutation.isPending}
              />

              {currentJob.chapters.length > 2000 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Chapter Limit Warning</AlertTitle>
                  <AlertDescription>
                    This novel has {currentJob.chapters.length} chapters. Downloads are limited to 2000 chapters maximum to ensure stability and performance on mobile devices. Please select 2000 or fewer chapters to proceed.
                  </AlertDescription>
                </Alert>
              )}

              {selectedChapterIds.length > 2000 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Selection Exceeds Limit</AlertTitle>
                  <AlertDescription>
                    You have selected {selectedChapterIds.length} chapters, but the maximum allowed is 2000. Please deselect some chapters to continue.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-card-border bg-card">
                <div>
                  <p className="font-medium">
                    {selectedChapterIds.length} of {currentJob.chapters.length} chapters selected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Output format: {outputFormat.toUpperCase()}
                  </p>
                </div>
                <Button
                  onClick={handleStartDownload}
                  disabled={selectedChapterIds.length === 0 || downloadMutation.isPending || (!imageLoaded && !!currentJob?.metadata?.coverUrl)}
                  className="gap-2"
                  data-testid="button-start-download"
                  title={!imageLoaded && currentJob?.metadata?.coverUrl ? "Waiting for cover image to load..." : ""}
                >
                  {downloadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Start Download
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {currentJob.metadata && (
                <MetadataDisplay
                  metadata={{
                    ...currentJob.metadata,
                    ...editableMetadata,
                  }}
                  onImageLoaded={setImageLoaded}
                  onMetadataChange={handleMetadataChange}
                  editable
                />
              )}

              <FormatSelector
                selectedFormat={outputFormat}
                onFormatChange={setOutputFormat}
                recommendedFormat={currentJob.metadata?.recommendedFormat}
                contentType={currentJob.metadata?.detectedContentType}
              />

              <SettingsPanel
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />
            </div>
          </div>
        ) : (
          !analyzeMutation.isPending && <EmptyState type="initial" />
        )}

        {downloadJobs.filter(j => 
          j.status !== "pending" && j.id !== currentJob?.id
        ).length > 0 && (
          <DownloadQueue
            jobs={downloadJobs.filter(j => 
              j.status !== "pending" && j.id !== currentJob?.id
            )}
            onCancel={handleCancelJob}
            onClearCompleted={handleClearCompleted}
            onDownloadFile={handleDownloadFile}
          />
        )}
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>WebToBook - Convert web content to portable book formats</p>
          <p className="mt-1">Supports 500+ reading sites worldwide</p>
        </div>
      </footer>

      {/* Floating AI Chat Button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center text-xl z-40 transition-colors"
        aria-label="Open AI chat"
        data-testid="button-open-chat"
      >
        🤖
      </button>

      {/* Chat Modal */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black/35 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-background rounded-lg sm:rounded-xl border border-border shadow-lg w-full sm:w-96 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">AI Assistant</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xl"
                data-testid="button-close-chat"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <p className="text-center text-muted-foreground text-sm">
                  Ask me anything about your books or the app!
                </p>
              )}
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">
                    <span className="inline-block animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground"
                disabled={chatLoading}
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSendChat}
                disabled={chatLoading || !chatInput.trim()}
                size="sm"
                data-testid="button-send-chat"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
