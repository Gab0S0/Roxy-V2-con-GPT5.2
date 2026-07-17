import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleCalendarCallbackScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Completando conexión con Google...</Text>
        <Text style={styles.text}>Puedes volver a Roxy en un momento.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090714',
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  text: {
    color: '#C4B5FD',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
});
