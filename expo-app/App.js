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
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#007AFF', padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#e0e0e0' },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 },
  button: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  chapterItem: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  chapterTitle: { fontSize: 13, fontWeight: '500', color: '#000' },
  chapterUrl: { fontSize: 11, color: '#999', marginTop: 4 },
  progressContainer: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 },
  progressBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, marginBottom: 8 },
  progressFill: { height: 6, backgroundColor: '#007AFF', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#666', textAlign: 'center' },
  downloadedFile: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 6, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  downloadedFileName: { fontSize: 12, color: '#000', flex: 1 },
  shareButton: { backgroundColor: '#34C759', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  shareButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  selectAllButton: { color: '#007AFF', fontSize: 12, fontWeight: '600' },
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
            chapters.push({ id: chapters.length, title, url: absoluteUrl });
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

  const generateTxt = async () => {
    if (selectedChapters.size === 0) {
      Alert.alert('Error', 'Please select at least one chapter');
      return;
    }
    setGenerating(true);
    setProgress(0);
    try {
      const selectedChaptersList = chapters.filter(ch => selectedChapters.has(ch.id));
      let content = `${bookTitle}\n${'='.repeat(bookTitle.length)}\n\n`;
      
      for (let i = 0; i < selectedChaptersList.length; i++) {
        const chapter = selectedChaptersList[i];
        const chapterContent = await fetchChapterContent(chapter.url);
        content += `\n\n${chapter.title}\n${'-'.repeat(chapter.title.length)}\n\n${chapterContent}`;
        setProgress(Math.round(((i + 1) / selectedChaptersList.length) * 100));
      }

      const fileName = `${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      const filePath = FileSystem.DocumentDirectory + fileName;
      await FileSystem.writeAsStringAsync(filePath, content);
      setDownloadedFiles([...downloadedFiles, { name: fileName, path: filePath }]);
      Alert.alert('Success', 'Text file generated!');
      setProgress(0);
    } catch (error) {
      Alert.alert('Error', 'Failed: ' + error.message);
    } finally {
      setGenerating(false);
    }
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

  const shareFile = async (filePath) => {
    try {
      await Sharing.shareAsync(filePath);
    } catch (error) {
      Alert.alert('Error', 'Failed to share: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WebToBook</Text>
        <Text style={styles.headerSubtitle}>Offline Novel Converter</Text>
      </View>
      <ScrollView style={styles.content}>
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
                <TouchableOpacity
                  style={[styles.chapterItem, selectedChapters.has(item.id) && { backgroundColor: '#e3f2fd', borderColor: '#007AFF' }]}
                  onPress={() => toggleChapter(item.id)}
                >
                  <Text style={styles.chapterTitle}>{item.title}</Text>
                  <Text style={styles.chapterUrl}>{item.url.substring(0, 50)}...</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {chapters.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 3: Generate</Text>
            <TouchableOpacity
              style={[styles.button, (generating || selectedChapters.size === 0) && styles.buttonDisabled]}
              onPress={generateTxt}
              disabled={generating || selectedChapters.size === 0}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Generate Text File</Text>
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
              Paste any novel URL and convert to text files. Works 100% offline on your phone.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
