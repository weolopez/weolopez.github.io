/**
 * JavaScript implementation of a simple melody-to-chord suggestion model
 * This replaces the TFLite model that had loading issues
 */

// Chord mapping object from model_metadata.json
const CHORD_MAPPING = {
  "0": "C",
  "1": "C#",
  "2": "D",
  "3": "D#",
  "4": "E",
  "5": "F",
  "6": "F#",
  "7": "G",
  "8": "G#",
  "9": "A",
  "10": "A#",
  "11": "B",
  "12": "Cm",
  "13": "C#m",
  "14": "Dm",
  "15": "D#m",
  "16": "Em",
  "17": "Fm",
  "18": "F#m",
  "19": "Gm",
  "20": "G#m",
  "21": "Am",
  "22": "A#m",
  "23": "Bm",
  "24": "C7",
  "25": "C#7",
  "26": "D7",
  "27": "D#7",
  "28": "E7",
  "29": "F7",
  "30": "F#7",
  "31": "G7",
  "32": "G#7",
  "33": "A7",
  "34": "A#7",
  "35": "B7",
  "36": "Cmaj7",
  "37": "C#maj7",
  "38": "Dmaj7",
  "39": "D#maj7",
  "40": "Emaj7",
  "41": "Fmaj7",
  "42": "F#maj7",
  "43": "Gmaj7",
  "44": "G#maj7",
  "45": "Amaj7",
  "46": "A#maj7",
  "47": "Bmaj7"
};

/**
 * MelodyChordModel class provides a simple JavaScript implementation
 * of chord suggestions based on melody notes
 */
class MelodyChordModel {
  constructor() {
    // Initialize model metadata
    this.metadata = {
      name: "Melody to Chord Progression Model",
      version: "1.0.0",
      description: "A JavaScript implementation that suggests chord progressions for melodies"
    };
    
    // Load relationship matrices
    this.initializeRelationships();
  }

  /**
   * Initialize the relationship matrices between melody notes and chords
   */
  initializeRelationships() {
    // This defines how strongly each melody note suggests each chord
    // Values are designed to prefer chords that contain the melody note
    // and have musically pleasing relationships
    
    // Create a 12x48 matrix (12 possible note classes, 48 possible chords)
    this.noteToChordMatrix = [];
    
    // For each pitch class (C, C#, D, etc.)
    for (let note = 0; note < 12; note++) {
      const chordWeights = new Array(48).fill(0.1);  // Base weight
      
      // A note strongly suggests major, minor, and dominant chords that contain it
      const rootChord = note;                   // Major chord (e.g., C for note C)
      const minorChord = note + 12;             // Minor chord (e.g., Cm for note C)
      const dominantChord = note + 24;          // Dominant 7th (e.g., C7 for note C)
      const majorSeventhChord = note + 36;      // Major 7th (e.g., Cmaj7 for note C)
      
      // Set higher weights for chords that contain the melody note
      chordWeights[rootChord] = 0.8;            // Highest for major chord with note as root
      chordWeights[minorChord] = 0.7;           // High for minor chord with note as root
      chordWeights[dominantChord] = 0.65;       // For dominant 7th
      chordWeights[majorSeventhChord] = 0.6;    // For major 7th
      
      // Also boost related chords (e.g., relative major/minor relationships)
      // For relative minor (e.g., Am for C)
      const relativeMajor = (note + 3) % 12;
      const relativeMinor = (note + 9) % 12 + 12;
      chordWeights[relativeMajor] = 0.5;        // Relative major
      chordWeights[relativeMinor] = 0.5;        // Relative minor
      
      // Fifth relationships (e.g., G for C)
      const fifth = (note + 7) % 12;
      chordWeights[fifth] = 0.4;                // Fifth relation
      
      // Fourth relationships (e.g., F for C)
      const fourth = (note + 5) % 12;
      chordWeights[fourth] = 0.35;              // Fourth relation
      
      this.noteToChordMatrix.push(chordWeights);
    }
  }

  /**
   * Predict chord progressions based on a melody
   * @param {Array} melodyNotes - Array of MIDI note numbers
   * @param {Number} numSuggestions - Number of chord suggestions to return
   * @returns {Array} Array of chord suggestions with probabilities
   */
  predict(melodyNotes, numSuggestions = 5) {
    if (!melodyNotes || melodyNotes.length === 0) {
      return [];
    }
    
    // Initialize chord probabilities with zeros
    const chordProbs = new Array(48).fill(0);
    
    // For each melody note, add its weight to each chord
    melodyNotes.forEach(midiNote => {
      // Convert MIDI note to pitch class (0-11, where 0 is C, 1 is C#, etc.)
      const pitchClass = midiNote % 12;
      
      // Get weights for this pitch class
      const weights = this.noteToChordMatrix[pitchClass];
      
      // Add weights to overall chord probabilities
      weights.forEach((weight, idx) => {
        chordProbs[idx] += weight;
      });
    });
    
    // Normalize probabilities
    const sum = chordProbs.reduce((acc, val) => acc + val, 0);
    chordProbs.forEach((prob, idx) => {
      chordProbs[idx] = prob / sum;
    });
    
    // Create array of [index, probability] pairs
    const indexedProbs = chordProbs.map((prob, index) => [index, prob]);
    
    // Sort by probability (descending)
    indexedProbs.sort((a, b) => b[1] - a[1]);
    
    // Take top N results
    return indexedProbs.slice(0, numSuggestions).map(([index, prob]) => {
      return {
        index,
        probability: prob,
        name: CHORD_MAPPING[index] || `Chord ${index}`
      };
    });
  }

  /**
   * Get model metadata
   * @returns {Object} Model metadata
   */
  getMetadata() {
    return {
      ...this.metadata,
      chord_mapping: CHORD_MAPPING,
      num_chords: Object.keys(CHORD_MAPPING).length
    };
  }
}

// Export the model for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MelodyChordModel;
}