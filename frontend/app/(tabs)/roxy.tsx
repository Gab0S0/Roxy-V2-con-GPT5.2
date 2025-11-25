import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import useRoxyStore from '../../store/roxyStore';
import useAlarmasStore from '../../store/alarmasStore';

export default function RoxyScreen() {
  const { messages, sendMessage, isLoading } = useRoxyStore();
  const { loadAlarmas } = useAlarmasStore();
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const message = input.trim();
    setInput('');

    await sendMessage(message);
    // Reload alarms to show any changes made by Roxy
    await loadAlarmas();
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.roxyBubble,
        ]}
      >
        {!isUser && (
          <View style={styles.roxyHeader}>
            <Ionicons name="sparkles" size={16} color="#4A90E2" />
            <Text style={styles.roxyName}>Roxy</Text>
          </View>
        )}
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : styles.roxyText,
          ]}
        >
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.content}>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="sparkles" size={80} color="#4A90E2" />
              <Text style={styles.emptyTitle}>¡Hola! Soy Roxy</Text>
              <Text style={styles.emptyText}>
                Tu asistente personal para alarmas
              </Text>
              <Text style={styles.emptySubtext}>
                Puedes decirme cosas como:
              </Text>
              <View style={styles.examplesContainer}>
                <Text style={styles.exampleText}>
                  • "Crea una alarma para mañana a las 8"
                </Text>
                <Text style={styles.exampleText}>
                  • "¿Qué alarmas tengo hoy?"
                </Text>
                <Text style={styles.exampleText}>
                  • "Recuérdame entrenar cada martes y jueves a las 21:00"
                </Text>
              </View>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            />
          )}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Habla con Roxy..."
            placeholderTextColor="#3A3A3C"
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (input.trim() === '' || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={input.trim() === '' || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 24,
    textAlign: 'center',
  },
  examplesContainer: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  exampleText: {
    fontSize: 14,
    color: '#4A90E2',
    marginTop: 8,
    textAlign: 'left',
  },
  messagesList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4A90E2',
  },
  roxyBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  roxyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  roxyName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  roxyText: {
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
