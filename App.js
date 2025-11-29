import React from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';

// IMPORTANT: Replace with your actual Replit app URL
const WEB_APP_URL = 'https://your-app.replit.dev';

export default function App() {
  const [loading, setLoading] = React.useState(false);

  const openWebApp = async () => {
    setLoading(true);
    try {
      const supported = await Linking.canOpenURL(WEB_APP_URL);
      if (supported) {
        await Linking.openURL(WEB_APP_URL);
      } else {
        Text.alert('Cannot open the app URL');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>WebToBook</Text>
        <Text style={styles.subtitle}>Web Novel to EPUB/PDF Converter</Text>
        
        <View style={styles.spacing} />
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={openWebApp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Open WebToBook App</Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>About This App</Text>
          <Text style={styles.infoText}>
            This app provides access to WebToBook - your web novel converter.{'\n\n'}
            Download books from web reading sites and convert them to EPUB, PDF, or HTML format.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  spacing: {
    height: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});
