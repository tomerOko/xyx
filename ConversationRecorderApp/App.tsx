import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, Text, SafeAreaView, ScrollView } from "react-native";
import VoiceRecorder from "./components/VoiceRecorder";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.appTitle}>Conversation Recorder</Text>
        <Text style={styles.instructions}>
          Use the buttons below to record your voice and send it to the server.
          {"\n\n"}
          1. Press "Record" to start recording
          {"\n"}
          2. Press "Stop Recording" to finish and upload
        </Text>
        <VoiceRecorder />
        <StatusBar style="auto" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  instructions: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
    lineHeight: 24,
  },
});
