'use client';

import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

// ==============================|| VOICE INPUT BUTTON ||============================== //

export default function VoiceInputButton({ onResult, disabled }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onResult]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('お使いのブラウザは音声認識に対応していません');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setIsListening(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`btn btn-sm ${isListening ? 'btn-danger' : 'btn-outline-primary'}`}
      title={isListening ? '音声認識を停止' : '音声入力'}
    >
      <i className={`ph ${isListening ? 'ph-microphone-slash' : 'ph-microphone'}`}></i>
    </button>
  );
}

VoiceInputButton.propTypes = {
  onResult: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};


