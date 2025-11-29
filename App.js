import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE = 'https://webtobook-replit.replit.dev'; // Update with your Replit URL

export default function App() {
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/jobs`);
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WebToBook</Text>
        <Text style={styles.subtitle}>Web Novel Converter</Text>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => {
            const url = 'https://your-replit-url.replit.dev';
            require('react-native').Linking.openURL(url);
          }}
        >
          <Text style={styles.buttonText}>Open Web App</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recent Downloads</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : jobs.length === 0 ? (
          <Text style={styles.emptyText}>No downloads yet. Use the web app to start.</Text>
        ) : (
          jobs.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <Text style={styles.jobTitle}>{job.metadata?.title || 'Untitled'}</Text>
              <Text style={styles.jobStatus}>{job.status}</Text>
              <Text style={styles.jobProgress}>{job.progress}%</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginVertical: 20,
  },
  jobCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  jobStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  jobProgress: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
});
