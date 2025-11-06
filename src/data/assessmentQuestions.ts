export interface AssessmentQuestion {
  id: string;
  subject: string;
  level: number;
  question: string;
  type: "multiple_choice" | "open" | "true_false";
  options?: string[];
  correctAnswer?: string | number;
  difficulty: "easy" | "medium" | "hard";
}

export const assessmentQuestions: AssessmentQuestion[] = [
  // Mathematik
  {
    id: "math_5_1",
    subject: "Mathematik",
    level: 5,
    question: "Was ist 15 × 8?",
    type: "multiple_choice",
    options: ["110", "120", "130", "140"],
    correctAnswer: "120",
    difficulty: "easy"
  },
  {
    id: "math_5_2",
    subject: "Mathematik",
    level: 5,
    question: "Ein Rechteck ist 12 cm lang und 8 cm breit. Wie groß ist die Fläche?",
    type: "multiple_choice",
    options: ["20 cm²", "40 cm²", "96 cm²", "104 cm²"],
    correctAnswer: "96 cm²",
    difficulty: "medium"
  },
  {
    id: "math_7_1",
    subject: "Mathematik",
    level: 7,
    question: "Löse die Gleichung: 3x + 5 = 20",
    type: "multiple_choice",
    options: ["x = 3", "x = 5", "x = 7", "x = 10"],
    correctAnswer: "x = 5",
    difficulty: "medium"
  },
  {
    id: "math_9_1",
    subject: "Mathematik",
    level: 9,
    question: "Berechne: 2³ + 4²",
    type: "multiple_choice",
    options: ["20", "24", "28", "32"],
    correctAnswer: "24",
    difficulty: "hard"
  },

  // Deutsch
  {
    id: "german_5_1",
    subject: "Deutsch",
    level: 5,
    question: "Welche Wortart ist 'schnell'?",
    type: "multiple_choice",
    options: ["Nomen", "Verb", "Adjektiv", "Pronomen"],
    correctAnswer: "Adjektiv",
    difficulty: "easy"
  },
  {
    id: "german_7_1",
    subject: "Deutsch",
    level: 7,
    question: "Was ist ein Prädikat?",
    type: "multiple_choice",
    options: [
      "Das Subjekt des Satzes",
      "Das Verb des Satzes",
      "Das Objekt des Satzes",
      "Das Adjektiv des Satzes"
    ],
    correctAnswer: "Das Verb des Satzes",
    difficulty: "medium"
  },
  {
    id: "german_9_1",
    subject: "Deutsch",
    level: 9,
    question: "Was ist eine Metapher?",
    type: "open",
    difficulty: "hard"
  },

  // Englisch
  {
    id: "english_5_1",
    subject: "Englisch",
    level: 5,
    question: "What is the past tense of 'go'?",
    type: "multiple_choice",
    options: ["goed", "went", "gone", "going"],
    correctAnswer: "went",
    difficulty: "easy"
  },
  {
    id: "english_7_1",
    subject: "Englisch",
    level: 7,
    question: "Which sentence is correct?",
    type: "multiple_choice",
    options: [
      "She don't like pizza",
      "She doesn't likes pizza",
      "She doesn't like pizza",
      "She not like pizza"
    ],
    correctAnswer: "She doesn't like pizza",
    difficulty: "medium"
  },
  {
    id: "english_9_1",
    subject: "Englisch",
    level: 9,
    question: "Complete: 'If I ___ rich, I would travel the world.'",
    type: "multiple_choice",
    options: ["am", "was", "were", "be"],
    correctAnswer: "were",
    difficulty: "hard"
  },

  // Biologie
  {
    id: "bio_7_1",
    subject: "Biologie",
    level: 7,
    question: "Was ist Photosynthese?",
    type: "open",
    difficulty: "medium"
  },
  {
    id: "bio_9_1",
    subject: "Biologie",
    level: 9,
    question: "Was ist DNA?",
    type: "multiple_choice",
    options: [
      "Ein Protein",
      "Eine Erbinformation",
      "Ein Vitamin",
      "Ein Hormon"
    ],
    correctAnswer: "Eine Erbinformation",
    difficulty: "medium"
  },

  // Physik
  {
    id: "physics_7_1",
    subject: "Physik",
    level: 7,
    question: "Was ist Masse?",
    type: "multiple_choice",
    options: [
      "Die Menge an Materie in einem Objekt",
      "Die Geschwindigkeit eines Objekts",
      "Die Kraft auf ein Objekt",
      "Die Temperatur eines Objekts"
    ],
    correctAnswer: "Die Menge an Materie in einem Objekt",
    difficulty: "medium"
  },
  {
    id: "physics_9_1",
    subject: "Physik",
    level: 9,
    question: "Was ist die Formel für Energie?",
    type: "multiple_choice",
    options: ["E = mc", "E = mc²", "E = m/c²", "E = c²/m"],
    correctAnswer: "E = mc²",
    difficulty: "hard"
  },

  // Chemie
  {
    id: "chemistry_7_1",
    subject: "Chemie",
    level: 7,
    question: "Was ist das chemische Symbol für Wasser?",
    type: "multiple_choice",
    options: ["H₂O", "HO", "H₂O₂", "O₂"],
    correctAnswer: "H₂O",
    difficulty: "easy"
  },
  {
    id: "chemistry_9_1",
    subject: "Chemie",
    level: 9,
    question: "Was ist eine chemische Reaktion?",
    type: "open",
    difficulty: "medium"
  },

  // Geschichte
  {
    id: "history_7_1",
    subject: "Geschichte",
    level: 7,
    question: "Wann begann der Zweite Weltkrieg?",
    type: "multiple_choice",
    options: ["1937", "1939", "1941", "1945"],
    correctAnswer: "1939",
    difficulty: "medium"
  },
  {
    id: "history_9_1",
    subject: "Geschichte",
    level: 9,
    question: "Was war die Französische Revolution?",
    type: "open",
    difficulty: "hard"
  },

  // Erdkunde
  {
    id: "geography_7_1",
    subject: "Erdkunde",
    level: 7,
    question: "Was ist die Hauptstadt von Deutschland?",
    type: "multiple_choice",
    options: ["Hamburg", "München", "Berlin", "Frankfurt"],
    correctAnswer: "Berlin",
    difficulty: "easy"
  },
  {
    id: "geography_9_1",
    subject: "Erdkunde",
    level: 9,
    question: "Was sind Plattentektonik?",
    type: "open",
    difficulty: "medium"
  }
];

export const getQuestionsForSubject = (subject: string, startLevel: number) => {
  return assessmentQuestions
    .filter(q => q.subject === subject)
    .filter(q => q.level >= startLevel - 2 && q.level <= startLevel + 2)
    .sort((a, b) => a.level - b.level);
};
