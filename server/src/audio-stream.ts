/**
 * Audio Streaming Handler
 * Handles WebSocket connections for real-time audio streaming
 * Saves received audio chunks to organized files in ./audio-recordings/
 */

export class AudioStreamHandler {
  private audioFilePath: string;
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || this.generateSessionId();
    this.audioFilePath = this.createAudioFilePath();
  }

  /**
   * Handles a WebSocket connection for audio streaming
   * @param socket The WebSocket instance
   * @returns Promise<void>
   */
  public async handleWebSocketConnection(socket: WebSocket): Promise<void> {
    console.log(`Audio streaming session started: ${this.sessionId}`);

    // Ensure the audio-recordings directory exists
    await this.ensureDirectoryExists();

    // Clear/create the audio file for this session
    try {
      await Deno.writeFile(this.audioFilePath, new Uint8Array());
      console.log(`Audio file initialized: ${this.audioFilePath}`);
    } catch (error) {
      console.error(`Failed to initialize audio file: ${this.audioFilePath}`, error);
      socket.close(1011, "Server error initializing audio file");
      return;
    }

    // Set up WebSocket event handlers
    socket.onopen = () => {
      console.log(`Audio streaming WebSocket opened for session: ${this.sessionId}`);
      // Send confirmation to client
      socket.send(JSON.stringify({
        type: 'session_started',
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      }));
    };

    socket.onmessage = async (event) => {
      try {
        // Check if the data is binary (audio data)
        if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
          // Handle binary audio data
          await this.handleAudioChunk(event.data);
        } else if (typeof event.data === 'string') {
          // Handle text messages (control messages)
          await this.handleControlMessage(event.data, socket);
        } else {
          console.warn(`Unknown message type received for session ${this.sessionId}:`, typeof event.data);
        }
      } catch (error) {
        console.error(`Error processing message for session ${this.sessionId}:`, error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
          timestamp: new Date().toISOString()
        }));
      }
    };

    socket.onclose = (event) => {
      console.log(`Audio streaming WebSocket closed for session: ${this.sessionId}`, {
        code: event.code,
        reason: event.reason
      });
      // Optionally, perform cleanup or finalization here
      this.finalizeAudioFile();
    };

    socket.onerror = (error) => {
      console.error(`Audio streaming WebSocket error for session: ${this.sessionId}`, error);
    };
  }

  /**
   * Handles incoming audio chunks (binary data)
   * @param audioData The audio data as a Blob or ArrayBuffer
   */
  private async handleAudioChunk(audioData: Blob | ArrayBuffer): Promise<void> {
    try {
      let uint8Array: Uint8Array;
      
      if (audioData instanceof Blob) {
        // Convert Blob to ArrayBuffer then to Uint8Array
        const arrayBuffer = await audioData.arrayBuffer();
        uint8Array = new Uint8Array(arrayBuffer);
      } else if (audioData instanceof ArrayBuffer) {
        // Convert ArrayBuffer directly to Uint8Array
        uint8Array = new Uint8Array(audioData);
      } else {
        throw new Error(`Unsupported audio data type: ${typeof audioData}`);
      }

      // Append to the audio file
      await Deno.writeFile(this.audioFilePath, uint8Array, { append: true });
      
      console.log(`Received and saved audio chunk: ${uint8Array.length} bytes for session ${this.sessionId}`);
    } catch (error) {
      console.error(`Failed to save audio chunk for session ${this.sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Handles control messages (text data)
   * @param data The message data
   * @param socket The WebSocket instance to respond on
   */
  private async handleControlMessage(data: string, socket: WebSocket): Promise<void> {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'ping':
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'session_info':
          socket.send(JSON.stringify({
            type: 'session_info_response',
            sessionId: this.sessionId,
            audioFilePath: this.audioFilePath,
            timestamp: new Date().toISOString()
          }));
          break;
          
        default:
          console.warn(`Unknown control message type: ${message.type} for session ${this.sessionId}`);
          socket.send(JSON.stringify({
            type: 'unknown_message_type',
            receivedType: message.type,
            timestamp: new Date().toISOString()
          }));
      }
    } catch (error) {
      console.error(`Failed to parse control message for session ${this.sessionId}:`, error);
      socket.send(JSON.stringify({
        type: 'parse_error',
        message: 'Invalid JSON message format',
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * Generates a unique session ID
   * @returns A unique session identifier
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `audio_${timestamp}_${random}`;
  }

  /**
   * Creates the audio file path for this session
   * @returns The file path for the audio recording
   */
  private createAudioFilePath(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const filename = `${dateStr}_${timeStr}_${this.sessionId}.webm`;
    return `./audio-recordings/${filename}`;
  }

  /**
   * Ensures the audio-recordings directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await Deno.mkdir('./audio-recordings', { recursive: true });
    } catch (error) {
      // Directory might already exist, check if it's actually an error
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        console.error('Failed to create audio-recordings directory:', error);
        throw error;
      }
    }
  }

  /**
   * Finalizes the audio file (could add metadata, compression, etc.)
   */
  private finalizeAudioFile(): void {
    console.log(`Audio recording finalized: ${this.audioFilePath} for session ${this.sessionId}`);
    // Future: Add file metadata, compression, or other post-processing
  }

  /**
   * Gets the session ID for this handler
   * @returns The session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Gets the audio file path for this session
   * @returns The audio file path
   */
  public getAudioFilePath(): string {
    return this.audioFilePath;
  }
}

/**
 * Factory function to create and handle audio streaming WebSocket connections
 * @param socket The WebSocket instance
 * @param sessionId Optional session ID
 * @returns Promise<AudioStreamHandler>
 */
export async function handleAudioStreamWebSocket(
  socket: WebSocket, 
  sessionId?: string
): Promise<AudioStreamHandler> {
  const handler = new AudioStreamHandler(sessionId);
  await handler.handleWebSocketConnection(socket);
  return handler;
}