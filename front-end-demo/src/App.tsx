import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AtomsClient } from "atoms-client-sdk";

interface AtomsVoiceChatProps {
  agentId?: string;
  baseApiEndpoint?: string;
  onError?: (error: string) => void;
  onTranscript?: (text: string, data: any) => void;
  className?: string;
}

const App = ({
  agentId: agentIdProp = "68a40d0d6989a10b1631501f",
  onError,
  onTranscript,
}: AtomsVoiceChatProps) => {
  const client = useMemo(() => new AtomsClient(), []);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [mode, setMode] = useState<"webcall" | "chat">("webcall");
  const [status, setStatus] = useState("Ready to connect");
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ id: number; sender: string; text: string; timestamp: number }>
  >([]);
  const [textInput, setTextInput] = useState("");
  const [agentId, setAgentId] = useState(agentIdProp);
  const [apiKey, setApiKey] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const resetAllStates = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    setIsAgentConnected(false);
    setIsAgentSpeaking(false);
    setIsMuted(false);
    setTextInput("");
    setStatus("Ready to connect");
  }, []);

  const forceReset = useCallback(() => {
    try {
      client.stopSession();
    } catch (error) {
      console.log("Error stopping session (this is expected):", error);
    }
    resetAllStates();
  }, [client, resetAllStates]);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const addMessage = useCallback((sender: string, text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender,
        text,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const setupEventListeners = useCallback(() => {
    client.removeAllListeners();

    const handleSessionStarted = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setStatus("Waiting for agent...");
    };

    const handleSessionEnded = () => {
      resetAllStates();
    };

    const handleAgentConnected = () => {
      setIsAgentConnected(true);
      setIsConnecting(false);
      setStatus("Agent connected! Ready to chat.");
    };

    const handleAgentSpeakingStarted = () => {
      setIsAgentSpeaking(true);
      setStatus("Agent speaking...");
    };

    const handleAgentSpeakingStopped = () => {
      setIsAgentSpeaking(false);
      setStatus("Agent connected! Ready to chat.");
    };

    const handleTranscript = (data: { text: string }) => {
      addMessage("agent", data.text);
      onTranscriptRef.current?.(data.text, data);
    };

    const handleMicrophonePermissionGranted = () => {
      console.log("Microphone access granted");
    };

    const handleMicrophonePermissionError = (data: {
      error: string;
      canRetry: boolean;
    }) => {
      setStatus(`Microphone error: ${data.error}`);
      setIsConnecting(false);
      setTimeout(() => setStatus("Ready to connect"), 3000);
    };

    const handleMicrophoneAccessFailed = (data: { error: string }) => {
      setStatus(`Microphone access failed: ${data.error}`);
      setIsConnecting(false);
      setTimeout(() => setStatus("Ready to connect"), 3000);
    };

    const handleError = (error: string) => {
      setStatus(`Error: ${error}`);
      setIsConnecting(false);
      setIsConnected(false);
      setIsAgentConnected(false);
      setIsAgentSpeaking(false);
      setIsMuted(false);
      setTextInput("");
      onErrorRef.current?.(error);
      setTimeout(() => resetAllStates(), 3000);
    };

    // Attach listeners
    client.on("session_started", handleSessionStarted);
    client.on("session_ended", handleSessionEnded);
    client.on("agent_connected", handleAgentConnected);
    client.on("agent_speaking_started", handleAgentSpeakingStarted);
    client.on("agent_speaking_stopped", handleAgentSpeakingStopped);
    client.on("transcript", handleTranscript);
    client.on(
      "microphone_permission_granted",
      handleMicrophonePermissionGranted
    );
    client.on("microphone_permission_error", handleMicrophonePermissionError);
    client.on("microphone_access_failed", handleMicrophoneAccessFailed);
    client.on("error", handleError);
  }, [client, addMessage, resetAllStates, onTranscriptRef]);

  // Setup initial listeners on mount and cleanup on unmount
  useEffect(() => {
    setupEventListeners();

    // Cleanup function to remove listeners when component unmounts
    return () => {
      client.removeAllListeners();
    };
  }, [setupEventListeners, client]);

  const getAccessToken = async () => {
    const endpoint = `http://localhost:8089/create-web-call?mode=${mode}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agentId, apiKey }),
    });
    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      token: data.data.token,
      host: data.data.host,
    };
  };

  const connect = async () => {
    try {
      setIsConnecting(true);
      setStatus("Getting access token...");
      // Clear previous chat only when starting a new session
      setMessages([]);

      const { token, host } = await getAccessToken();

      setStatus(`Connecting to ${mode} session...`);
      setupEventListeners();

      await client.startSession({
        accessToken: token,
        mode: mode,
        host: host,
      });

      if (mode === "webcall") {
        await client.startAudioPlayback();
      }
    } catch (error) {
      console.error("Connection failed:", error);
      setStatus(`Connection failed: ${error}`);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    forceReset();
  };

  const toggleMute = () => {
    if (isMuted) {
      client.unmute();
      setIsMuted(false);
    } else {
      client.mute();
      setIsMuted(true);
    }
  };

  const sendTextMessage = () => {
    if (!textInput.trim() || !isConnected || !isAgentConnected) return;

    addMessage("user", textInput);
    client.sendTextMessage(textInput);
    setTextInput("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Main Control Panel */}
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
          <h2 className="mb-6 text-center text-2xl font-bold text-white">
            {mode === "webcall" ? "🎙️" : "💬"} Atoms{" "}
            {mode === "webcall" ? "Voice" : "Text"} Chat
          </h2>

          {/* Agent ID Input */}
          <div className="mb-4 flex items-center gap-2">
            <label htmlFor="agentIdInput" className="text-gray-400 text-sm">Agent ID:</label>
            <input
              id="agentIdInput"
              type="text"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              disabled={isConnected}
              className="flex-1 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter Agent ID"
            />
          </div>
          {/* API Key Input */}
          <div className="mb-4 flex items-center gap-2">
            <label htmlFor="apiKeyInput" className="text-gray-400 text-sm">API Key:</label>
            <input
              id="apiKeyInput"
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              disabled={isConnected}
              className="flex-1 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter API Key"
            />
          </div>

          {/* Mode Toggle */}
          <div className="mb-4 flex rounded-lg bg-gray-800 p-1">
            <button
              onClick={() => setMode("webcall")}
              disabled={isConnected}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "webcall"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white disabled:opacity-50"
              }`}
            >
              Voice
            </button>
            <button
              onClick={() => setMode("chat")}
              disabled={isConnected}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "chat"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white disabled:opacity-50"
              }`}
            >
              Text
            </button>
          </div>

          {/* Status */}
          <div className="mb-6 rounded-lg border border-gray-600 bg-gray-800 p-4 text-center text-gray-300">
            <div>{isHydrated ? status : "Loading..."}</div>
            {isConnected && isAgentConnected && (
              <div className="mt-1 text-xs opacity-75">
                {isAgentSpeaking
                  ? "🗣️ Agent is speaking..."
                  : mode === "webcall"
                  ? "🎤 You can speak now"
                  : "💬 You can type now"}
              </div>
            )}
            {/* Debug info */}
            <div className="mt-2 text-xs opacity-50">
              Connected: {isConnected ? "✅" : "❌"} | Agent: {" "}
              {isAgentConnected ? "✅" : "❌"} | status: {" "}
              {isConnecting ? "connected" : "disconnected"}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {!isConnected ? (
              <>
                <button
                  onClick={connect}
                  disabled={isConnecting}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50"
                >
                  {isConnecting ? "Connecting..." : "Start"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={disconnect}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-medium text-white transition-colors hover:bg-red-700"
                >
                  Stop
                </button>
                {mode === "webcall" && (
                  <button
                    onClick={toggleMute}
                    className={`flex-1 rounded-lg px-4 py-3 font-medium transition-colors ${
                      isMuted
                        ? "bg-yellow-600 text-yellow-100 hover:bg-yellow-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {isMuted ? "Unmute" : "Mute"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Text Chat Area - Only show in text mode */}
        {mode === "chat" && (
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-2xl">
            <h3 className="mb-3 text-sm font-medium text-gray-400">Messages</h3>

            {/* Messages */}
            <div className="mb-4 h-64 overflow-y-auto rounded-lg bg-gray-800 p-3">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-500">
                  No messages yet
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 text-sm ${
                          message.sender === "agent"
                            ? "bg-gray-700 text-white"
                            : message.sender === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-600 text-gray-200"
                        }`}
                      >
                        <div className="mb-1 text-xs opacity-75">
                          {isHydrated
                            ? new Date(message.timestamp).toLocaleTimeString()
                            : ""}
                        </div>
                        <div>{message.text}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Text Input - Only show in text mode */}
            {mode === "chat" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendTextMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  disabled={!isConnected || !isAgentConnected}
                  className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={sendTextMessage}
                  disabled={
                    !textInput.trim() || !isConnected || !isAgentConnected
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
