import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  FlatList,
  Modal,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const GEMINI_API_KEY = 'AIzaSyB4ilhZI-C6_J6-AADS0VONispc8IhTXls';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const BACKEND_URL = 'http://localhost:5000';

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative', backgroundColor: '#fff' },
  screenInner: { flex: 1 },
  header: { backgroundColor: '#007AFF', padding: 20, paddingTop: 10, height: 64, justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#e0e0e0' },
  content: { flex: 1, padding: 16, paddingBottom: 120 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 },
  button: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  formatButtonsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, gap: 8 },
  formatButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#f9f9f9' },
  formatButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  formatButtonText: { fontSize: 12, fontWeight: '600', color: '#666' },
  formatButtonTextActive: { color: '#fff' },
  chapterItem: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  chapterTitle: { fontSize: 13, fontWeight: '500', color: '#000' },
  chapterUrl: { fontSize: 11, color: '#999', marginTop: 4 },
  summarizeBtn: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#10B981', borderRadius: 6 },
  summarizeBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  progressContainer: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 },
  progressBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, marginBottom: 8 },
  progressFill: { height: 6, backgroundColor: '#007AFF', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#666', textAlign: 'center' },
  downloadedFile: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 6, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  downloadedFileName: { fontSize: 12, color: '#000', flex: 1 },
  shareButton: { backgroundColor: '#34C759', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  shareButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  selectAllButton: { color: '#007AFF', fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '80%', width: '100%' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 12 },
  modalText: { fontSize: 13, color: '#333', lineHeight: 20, marginBottom: 16 },
  modalCloseBtn: { backgroundColor: '#007AFF', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  floatingButton: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', elevation: 12, zIndex: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 8 },
  floatingButtonText: { fontSize: 24, lineHeight: 24, textAlign: 'center' },
  chatContainer: { maxHeight: '85%', width: '100%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 12, paddingBottom: 20, paddingHorizontal: 12 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 6 },
  chatTitle: { fontSize: 16, fontWeight: '700' },
  chatClose: { color: '#ef4444', fontWeight: '600' },
  chatBody: { flex: 1, paddingHorizontal: 6, paddingVertical: 8 },
  chatInput: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, marginTop: 6 },
  chatSendBtn: { marginLeft: 8, paddingHorizontal: 12, height: 44, borderRadius: 10, backgroundColor: '#0ea5a4', justifyContent: 'center', alignItems: 'center' },
});

export default function App() {
  const [url, setUrl] = useState('');
  const [chapters, setChapters] = useState([]);
  const [selectedChapters, setSelectedChapters] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedFiles, setDownloadedFiles] = useState([]);
  const [bookTitle, setBookTitle] = useState('');
  const [summaryModal, setSummaryModal] = useState(false);
  const [currentSummary, setCurrentSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [outputFormat, setOutputFormat] = useState('txt');
  const [currentJobId, setCurrentJobId] = useState(null);

  const analyzeUrl = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }
    setLoading(true);
    try {
      const chapters = await scrapeChapters(url);
      setChapters(chapters);
      setBookTitle(extractTitleFromUrl(url));
      setSelectedChapters(new Set());
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze URL: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const scrapeChapters = async (url) => {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const html = await response.text();
    const chapters = parseChapters(html, url);
    if (chapters.length === 0) {
      throw new Error('No chapters found on this page.');
    }
    return chapters.slice(0, 2000);
  };

  const parseChapters = (html, baseUrl) => {
    const chapters = [];
    const patterns = [
      /<a\s+[^>]*href=["']([^"']*?)["'][^>]*>([^<]*?Chapter[^<]*?)<\/a>/gi,
      /<a\s+[^>]*href=["']([^"']*?)["'][^>]*>([^<]*?第\s*\d+[^<]*?)<\/a>/gi,
      /<a\s+[^>]*href=["']([^"']*?)["'][^>]*>([^<]*?\d+[^<]*?)<\/a>/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && chapters.length < 2000) {
        const href = match[1];
        const title = match[2].trim();
        if (href && title && title.length < 200) {
          const absoluteUrl = resolveUrl(href, baseUrl);
          if (!chapters.some(ch => ch.url === absoluteUrl)) {
            chapters.push({ id: chapters.length, title, url: absoluteUrl, summary: null });
          }
        }
      }
      if (chapters.length > 10) break;
    }
    return chapters;
  };

  const resolveUrl = (href, baseUrl) => {
    if (href.startsWith('http')) return href;
    try {
      if (href.startsWith('/')) {
        const base = new URL(baseUrl);
        return base.protocol + '//' + base.host + href;
      }
      return new URL(href, baseUrl).toString();
    } catch {
      return baseUrl + (href.startsWith('/') ? '' : '/') + href;
    }
  };

  const extractTitleFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      return pathParts[pathParts.length - 1] || urlObj.hostname || 'Book';
    } catch {
      return 'Book';
    }
  };

  const toggleChapter = (id) => {
    const newSelected = new Set(selectedChapters);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedChapters(newSelected);
  };

  const fetchChapterContent = async (url) => {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      const html = await response.text();
      let content = '';
      const patterns = [
        /<div[^>]*class=['"](content|chapter-content|article-content|chapter-body)['""][^>]*>([\s\S]*?)<\/div>/i,
        /<article[^>]*>([\s\S]*?)<\/article>/i,
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          content = match[1] || match[2];
          break;
        }
      }
      if (!content) {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        content = bodyMatch ? bodyMatch[1] : html;
      }
      content = content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
      return content.substring(0, 50000);
    } catch (error) {
      return 'Failed to fetch this chapter.';
    }
  };

  const generateSummary = async (chapterId) => {
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (!chapter) return;

    setSummarizing(true);
    try {
      const content = await fetchChapterContent(chapter.url);
      const summary = await callGeminiAPI(`Summarize this chapter in 2-3 sentences:\n\n${content.substring(0, 3000)}`);
      setCurrentSummary(summary);
      setSummaryModal(true);

      // Update chapter with summary
      const updatedChapters = chapters.map(ch => ch.id === chapterId ? { ...ch, summary } : ch);
      setChapters(updatedChapters);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate summary: ' + error.message);
    } finally {
      setSummarizing(false);
    }
  };

  const callGeminiAPI = async (prompt) => {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
    });

    if (!response.ok) throw new Error('Gemini API error');
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  };

  const generateFile = async () => {
    if (selectedChapters.size === 0) {
      Alert.alert('Error', 'Please select at least one chapter');
      return;
    }

    setGenerating(true);
    setProgress(0);
    try {
      const selectedChapterIds = chapters.filter(ch => selectedChapters.has(ch.id)).map(ch => ch.id.toString());
      
      // Create job via backend API
      const analyzeRes = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!analyzeRes.ok) {
        throw new Error('Failed to create analysis job');
      }

      const { job } = await analyzeRes.json();
      setCurrentJobId(job.id);

      // Start download with selected format
      const downloadRes = await fetch(`${BACKEND_URL}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          selectedChapterIds,
          outputFormat,
          settings: { concurrentDownloads: 3, delayBetweenRequests: 500 },
        }),
      });

      if (!downloadRes.ok) {
        throw new Error('Failed to start download');
      }

      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 300; // 5 minutes with 1s polling

      while (!completed && attempts < maxAttempts) {
        const statusRes = await fetch(`${BACKEND_URL}/api/jobs/${job.id}`);
        if (!statusRes.ok) throw new Error('Failed to get job status');

        const jobData = await statusRes.json();
        setProgress(jobData.progress || 0);

        if (jobData.status === 'completed') {
          completed = true;
          // Download the file
          const fileRes = await fetch(`${BACKEND_URL}/api/download-file/${job.id}`);
          if (!fileRes.ok) throw new Error('Failed to download file');

          const fileBlob = await fileRes.blob();
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = reader.result.split(',')[1];
            const fileName = `${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}.${outputFormat}`;
            const filePath = FileSystem.DocumentDirectory + fileName;
            await FileSystem.writeAsStringAsync(filePath, base64, { encoding: FileSystem.EncodingType.Base64 });
            setDownloadedFiles([...downloadedFiles, { name: fileName, path: filePath }]);
            Alert.alert('Success', `${outputFormat.toUpperCase()} file generated!`);
            setProgress(0);
          };
          reader.readAsDataURL(fileBlob);
        } else if (jobData.status === 'error') {
          throw new Error(jobData.error || 'Download failed');
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!completed) {
        throw new Error('Download timed out');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const shareFile = async (filePath) => {
    try {
      await Sharing.shareAsync(filePath);
    } catch (error) {
      Alert.alert('Error', 'Failed to share: ' + error.message);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages([...chatMessages, { id: Date.now(), text: userMessage, sender: 'user' }]);
    setChatLoading(true);

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      });

      if (!response.ok) throw new Error('AI error');
      const data = await response.json();
      const aiReply = data.candidates[0].content.parts[0].text;
      setChatMessages(prev => [...prev, { id: Date.now() + 1, text: aiReply, sender: 'ai' }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { id: Date.now() + 1, text: 'Sorry, I encountered an error. Please try again.', sender: 'ai' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenInner}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>WebToBook</Text>
          <Text style={styles.headerSubtitle}>Novel Converter + AI</Text>
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 1: Enter URL</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter novel URL..."
            value={url}
            onChangeText={setUrl}
            editable={!loading && !generating}
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.button, (loading || generating) && styles.buttonDisabled]}
            onPress={analyzeUrl}
            disabled={loading || generating}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Analyze URL</Text>
            )}
          </TouchableOpacity>
        </View>

        {chapters.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.sectionTitle}>Step 2: Select Chapters ({selectedChapters.size}/{chapters.length})</Text>
              <TouchableOpacity
                onPress={() => {
                  if (selectedChapters.size === chapters.length) {
                    setSelectedChapters(new Set());
                  } else {
                    setSelectedChapters(new Set(chapters.map(c => c.id)));
                  }
                }}
              >
                <Text style={styles.selectAllButton}>
                  {selectedChapters.size === chapters.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              scrollEnabled={false}
              data={chapters}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View>
                  <TouchableOpacity
                    style={[styles.chapterItem, selectedChapters.has(item.id) && { backgroundColor: '#e3f2fd', borderColor: '#007AFF' }]}
                    onPress={() => toggleChapter(item.id)}
                  >
                    <Text style={styles.chapterTitle}>{item.title}</Text>
                    <Text style={styles.chapterUrl}>{item.url.substring(0, 50)}...</Text>
                    {item.summary && <Text style={{ fontSize: 11, color: '#10B981', marginTop: 6 }}>✓ Summary available</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.summarizeBtn} onPress={() => generateSummary(item.id)}>
                    {summarizing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.summarizeBtnText}>Summarize</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}

        {chapters.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 3: Choose Format</Text>
            <View style={styles.formatButtonsContainer}>
              {['txt', 'epub', 'pdf'].map(format => (
                <TouchableOpacity
                  key={format}
                  style={[styles.formatButton, outputFormat === format && styles.formatButtonActive]}
                  onPress={() => setOutputFormat(format)}
                  disabled={generating}
                >
                  <Text style={[styles.formatButtonText, outputFormat === format && styles.formatButtonTextActive]}>
                    {format.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.button, (generating || selectedChapters.size === 0) && styles.buttonDisabled]}
              onPress={generateFile}
              disabled={generating || selectedChapters.size === 0}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Generate {outputFormat.toUpperCase()}</Text>
              )}
            </TouchableOpacity>
            {progress > 0 && progress < 100 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{progress}% Complete</Text>
              </View>
            )}
          </View>
        )}

        {downloadedFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generated Files</Text>
            {downloadedFiles.map((file, index) => (
              <View key={index} style={styles.downloadedFile}>
                <Text style={styles.downloadedFileName} numberOfLines={1}>{file.name}</Text>
                <TouchableOpacity style={styles.shareButton} onPress={() => shareFile(file.path)}>
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {chapters.length === 0 && (
          <View style={[styles.section, { marginTop: 40 }]}>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 }}>
              Paste any novel URL. Generate books in TXT, EPUB, or PDF format. Use AI to preview chapter summaries.
            </Text>
          </View>
        )}
      </ScrollView>
      </View>

      <TouchableOpacity activeOpacity={0.85} style={styles.floatingButton} onPress={() => setChatOpen(true)} accessibilityLabel="Open AI chat">
        <Text style={styles.floatingButtonText}>🤖</Text>
      </TouchableOpacity>

      <Modal visible={summaryModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>AI Summary</Text>
            <ScrollView style={{ maxHeight: 300, marginBottom: 12 }}>
              <Text style={styles.modalText}>{currentSummary}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSummaryModal(false)}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={chatOpen} animationType="slide" transparent={true} onRequestClose={() => setChatOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>AI Chat</Text>
              <TouchableOpacity onPress={() => setChatOpen(false)}>
                <Text style={styles.chatClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chatBody}>
              {chatMessages.length === 0 && (
                <Text style={{ marginBottom: 12 }}>Ask me anything about the app or your books!</Text>
              )}
              {chatMessages.map(msg => (
                <View key={msg.id} style={{ marginBottom: 10 }}>
                  <Text style={{ color: msg.sender === 'user' ? '#007AFF' : '#6b7280', marginBottom: 4 }}>
                    {msg.sender === 'user' ? 'You' : 'AI'}
                  </Text>
                  <Text style={{ color: '#000', fontSize: 13 }}>{msg.text}</Text>
                </View>
              ))}
              {chatLoading && <ActivityIndicator size="small" color="#10B981" />}
            </View>

            <View style={styles.chatInputRow}>
              <TextInput
                placeholder="Type a message..."
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                editable={!chatLoading}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendChat} disabled={chatLoading || !chatInput.trim()}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
