import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';

type RoxyDialogueProps = {
  text: string;
  typingSpeed?: number;
  initialDelay?: number;
  onComplete?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const DEFAULT_TYPING_SPEED = 45;
const DEFAULT_INITIAL_DELAY = 500;

function getCharacterDelay(character: string, typingSpeed: number) {
  if (/[.!?]/.test(character)) {
    return typingSpeed + 150;
  }

  if (/[,;:]/.test(character)) {
    return typingSpeed + 90;
  }

  if (character === '\n') {
    return typingSpeed + 180;
  }

  return typingSpeed;
}

export default function RoxyDialogue({
  text,
  typingSpeed = DEFAULT_TYPING_SPEED,
  initialDelay = DEFAULT_INITIAL_DELAY,
  onComplete,
  style,
  textStyle,
}: RoxyDialogueProps) {
  const [displayedText, setDisplayedText] = useState(text);
  const [isComplete, setIsComplete] = useState(true);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const cursorOpacity = useRef(new Animated.Value(0.35)).current;
  const completeIndicatorOpacity = useRef(new Animated.Value(0.45)).current;
  const completeIndicatorTranslate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotionEnabled(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isComplete) {
      cursorOpacity.stopAnimation();
      cursorOpacity.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          duration: 520,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          duration: 520,
          toValue: 0.25,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [cursorOpacity, isComplete]);

  useEffect(() => {
    if (!isComplete || displayedText.length === 0) {
      completeIndicatorOpacity.stopAnimation();
      completeIndicatorTranslate.stopAnimation();
      completeIndicatorOpacity.setValue(0);
      completeIndicatorTranslate.setValue(0);
      return;
    }

    if (reduceMotionEnabled) {
      completeIndicatorOpacity.setValue(0.72);
      completeIndicatorTranslate.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(completeIndicatorOpacity, {
            duration: 720,
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(completeIndicatorOpacity, {
            duration: 720,
            toValue: 0.45,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(completeIndicatorTranslate, {
            duration: 720,
            toValue: 3,
            useNativeDriver: true,
          }),
          Animated.timing(completeIndicatorTranslate, {
            duration: 720,
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [
    completeIndicatorOpacity,
    completeIndicatorTranslate,
    displayedText.length,
    isComplete,
    reduceMotionEnabled,
  ]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    completedRef.current = false;

    const complete = () => {
      if (completedRef.current) {
        return;
      }

      completedRef.current = true;
      setDisplayedText(text);
      setIsComplete(true);
      onCompleteRef.current?.();
    };

    if (reduceMotionEnabled || text.length === 0) {
      complete();
      return;
    }

    setDisplayedText('');
    setIsComplete(false);

    let index = 0;

    const typeNextCharacter = () => {
      index += 1;
      setDisplayedText(text.slice(0, index));

      if (index >= text.length) {
        complete();
        return;
      }

      timeoutRef.current = setTimeout(
        typeNextCharacter,
        getCharacterDelay(text[index - 1], typingSpeed)
      );
    };

    timeoutRef.current = setTimeout(typeNextCharacter, initialDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [initialDelay, reduceMotionEnabled, text, typingSpeed]);

  const showFullText = () => {
    if (isComplete) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    completedRef.current = true;
    setDisplayedText(text);
    setIsComplete(true);
    onCompleteRef.current?.();
  };

  return (
    <Pressable
      accessibilityRole="text"
      onPress={showFullText}
      style={[styles.container, style]}
    >
      <Text style={styles.label}>ROXY</Text>

      <Text style={[styles.text, textStyle]}>
        {displayedText}
        {!isComplete ? (
          <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
            {' '}
            •
          </Animated.Text>
        ) : null}
      </Text>

      {isComplete && displayedText.length > 0 ? (
        <Animated.Text
          style={[
            styles.completeIndicator,
            {
              opacity: completeIndicatorOpacity,
              transform: [{ translateY: completeIndicatorTranslate }],
            },
          ]}
        >
          ▾
        </Animated.Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    backgroundColor: 'rgba(12, 8, 24, 0.72)',
    borderColor: 'rgba(240, 171, 252, 0.26)',
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 390,
    minHeight: 118,
    overflow: 'hidden',
    paddingBottom: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    shadowColor: '#090714',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    width: '100%',
  },
  cursor: {
    color: '#F0ABFC',
    fontSize: 13,
  },
  completeIndicator: {
    bottom: 7,
    color: '#F0ABFC',
    fontSize: 18,
    fontWeight: '900',
    position: 'absolute',
    right: 18,
  },
  label: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(192, 38, 211, 0.22)',
    borderColor: 'rgba(240, 171, 252, 0.26)',
    borderRadius: 999,
    borderWidth: 1,
    color: '#F0ABFC',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    color: '#F8E7FF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'left',
  },
});
