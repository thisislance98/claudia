import { useState, useEffect, useRef, useCallback } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

interface VoiceRecognitionOptions {
    continuous?: boolean;
    interimResults?: boolean;
    language?: string;
    onResult?: (transcript: string, isFinal: boolean) => void;
    onError?: (error: string) => void;
    onListeningChange?: (isListening: boolean) => void;
}

export function useVoiceRecognition(options: VoiceRecognitionOptions = {}) {
    const {
        continuous = false,
        interimResults = true,
        language = 'en-US',
        onResult,
        onError,
        onListeningChange
    } = options;

    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const shouldBeListeningRef = useRef(false);
    // Accumulate final transcript across recognition restarts in continuous mode
    const accumulatedTranscriptRef = useRef('');

    // Check for browser support and initialize
    useEffect(() => {
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            setIsSupported(false);
            return;
        }

        setIsSupported(true);
        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;

        // Configure recognition - MDN recommended settings
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = language;
        recognition.maxAlternatives = 1;

        // Handle results - based on MDN example
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalText = '';
            let interimText = '';

            // Process results starting from resultIndex (new results since last event)
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0].transcript;

                if (result.isFinal) {
                    finalText += text;
                } else {
                    interimText += text;
                }
            }

            if (finalText) {
                // In continuous mode, accumulate the transcript
                if (continuous) {
                    accumulatedTranscriptRef.current += finalText;
                    setTranscript(accumulatedTranscriptRef.current);
                } else {
                    setTranscript(finalText);
                }
                setInterimTranscript('');
                onResult?.(finalText, true);
            }

            if (interimText) {
                setInterimTranscript(interimText);
                onResult?.(interimText, false);
            }
        };

        // Handle errors
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.log('Speech recognition error:', event.error);

            // 'no-speech' is normal in continuous mode - just means silence
            if (event.error === 'no-speech') {
                // Don't report as error, let onend handle restart
                return;
            }

            // 'aborted' is expected when we stop manually
            if (event.error === 'aborted') {
                return;
            }

            const errorMessage = getErrorMessage(event.error);
            onError?.(errorMessage);

            // Fatal errors - stop completely
            if (event.error === 'not-allowed' || event.error === 'audio-capture') {
                setIsListening(false);
                shouldBeListeningRef.current = false;
                onListeningChange?.(false);
            }
        };

        // Handle end - this is key for continuous mode
        // The Web Speech API stops after detecting silence, even with continuous=true
        // We need to restart it to keep listening
        recognition.onend = () => {
            setInterimTranscript('');

            if (shouldBeListeningRef.current && continuous) {
                // Immediately restart for seamless continuous listening
                try {
                    recognition.start();
                } catch (e) {
                    // Already started or other error - try again shortly
                    setTimeout(() => {
                        if (shouldBeListeningRef.current && recognitionRef.current) {
                            try {
                                recognitionRef.current.start();
                            } catch {
                                // Give up and notify user
                                setIsListening(false);
                                shouldBeListeningRef.current = false;
                                onListeningChange?.(false);
                            }
                        }
                    }, 100);
                }
            } else {
                setIsListening(false);
                onListeningChange?.(false);
            }
        };

        // Cleanup
        return () => {
            if (recognitionRef.current) {
                shouldBeListeningRef.current = false;
                try {
                    recognitionRef.current.stop();
                } catch {
                    // Ignore cleanup errors
                }
            }
        };
    }, [continuous, interimResults, language, onResult, onError, onListeningChange]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current || isListening) return;

        // Reset state
        setTranscript('');
        setInterimTranscript('');
        accumulatedTranscriptRef.current = '';
        shouldBeListeningRef.current = true;

        try {
            recognitionRef.current.start();
            setIsListening(true);
            onListeningChange?.(true);
        } catch (error) {
            console.error('Failed to start recognition:', error);
            shouldBeListeningRef.current = false;
            onError?.('Failed to start voice recognition');
        }
    }, [isListening, onError, onListeningChange]);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;

        shouldBeListeningRef.current = false;
        try {
            recognitionRef.current.stop();
        } catch {
            // Ignore stop errors
        }
        setIsListening(false);
        onListeningChange?.(false);
    }, [onListeningChange]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
        accumulatedTranscriptRef.current = '';
    }, []);

    return {
        isSupported,
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript
    };
}

function getErrorMessage(error: string): string {
    switch (error) {
        case 'no-speech':
            return 'No speech detected. Please try again.';
        case 'audio-capture':
            return 'Microphone not found or not accessible.';
        case 'not-allowed':
            return 'Microphone access denied. Please allow microphone access.';
        case 'network':
            return 'Network error occurred.';
        case 'aborted':
            return 'Speech recognition aborted.';
        default:
            return `Speech recognition error: ${error}`;
    }
}
