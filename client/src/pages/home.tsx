import { useState, useCallback } from "react";
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
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: downloadJobs = [] } = useQuery<DownloadJob[]>({
    queryKey: ["/api/jobs"],
    refetchInterval: 2000,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/analyze", { url });
      return await response.json() as AnalyzeResponse;
    },
    onSuccess: (data) => {
      if (data.success && data.job) {
        setCurrentJob(data.job);
        setSelectedChapterIds(data.job.chapters.map((ch) => ch.id));
        if (data.job.metadata) {
          setOutputFormat(data.job.metadata.recommendedFormat);
          setEditableMetadata({
            title: data.job.metadata.title,
            author: data.job.metadata.author,
            description: data.job.metadata.description,
          });
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
    select: (jobs) => {
      const analyzing = (jobs || []).find((j) => j.status === "analyzing");
      if (analyzing) {
        setAnalysisProgress(analyzing.progress);
      }
      return analyzing || null;
    },
    enabled: analyzeMutation.isPending,
  });

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
  }, [currentJob, selectedChapterIds, outputFormat, editableMetadata, settings, downloadMutation]);

  const handleDownloadFile = useCallback((job: DownloadJob) => {
    if (job.outputPath) {
      window.open(`/api/download-file/${job.id}`, "_blank");
    }
  }, []);

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
                  disabled={selectedChapterIds.length === 0 || downloadMutation.isPending}
                  className="gap-2"
                  data-testid="button-start-download"
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
    </div>
  );
}
