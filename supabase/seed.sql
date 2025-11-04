-- Seed data for competencies (Lehrplan-Kompetenzen)
-- This file contains example competencies for Mathematics, German, and English
-- for grades 5-10 across all 16 German federal states

-- ============================================================================
-- MATHEMATIK (Mathematics) - Grade 5
-- ============================================================================

-- Nordrhein-Westfalen (NRW)
INSERT INTO public.competencies (title, description, competency_domain, subject, grade_level, federal_state, requirement_level, is_mandatory)
VALUES
  ('Flächeninhalte von Rechtecken berechnen', 
   'Schüler können die Formel A = l × b anwenden, um Flächeninhalte von Rechtecken zu berechnen.',
   'Geometrie',
   'Mathematik',
   5,
   'Nordrhein-Westfalen',
   'Grundlegend',
   true),
  
  ('Brüche verstehen und vergleichen',
   'Schüler können Brüche als Teile eines Ganzen verstehen und verschiedene Brüche miteinander vergleichen.',
   'Zahlen und Operationen',
   'Mathematik',
   5,
   'Nordrhein-Westfalen',
   'Grundlegend',
   true),
  
  ('Dezimalzahlen addieren und subtrahieren',
   'Schüler können Dezimalzahlen bis zu zwei Nachkommastellen addieren und subtrahieren.',
   'Zahlen und Operationen',
   'Mathematik',
   5,
   'Nordrhein-Westfalen',
   'Grundlegend',
   true),
  
  ('Umfang von geometrischen Figuren berechnen',
   'Schüler können den Umfang von Rechtecken, Quadraten und zusammengesetzten Figuren berechnen.',
   'Geometrie',
   'Mathematik',
   5,
   'Nordrhein-Westfalen',
   'Grundlegend',
   true);

-- Bayern
INSERT INTO public.competencies (title, description, competency_domain, subject, grade_level, federal_state, requirement_level, is_mandatory)
VALUES
  ('Natürliche Zahlen bis 1.000.000 darstellen',
   'Schüler können natürliche Zahlen bis 1.000.000 lesen, schreiben und in verschiedenen Darstellungsformen angeben.',
   'Zahlen und Operationen',
   'Mathematik',
   5,
   'Bayern',
   'Grundlegend',
   true),
  
  ('Grundrechenarten sicher anwenden',
   'Schüler beherrschen die vier Grundrechenarten und können sie in Alltagssituationen anwenden.',
   'Zahlen und Operationen',
   'Mathematik',
   5,
   'Bayern',
   'Grundlegend',
   true);

-- Baden-Württemberg
INSERT INTO public.competencies (title, description, competency_domain, subject, grade_level, federal_state, requirement_level, is_mandatory)
VALUES
  ('Symmetrie erkennen und zeichnen',
   'Schüler können achsensymmetrische Figuren erkennen und selbst zeichnen.',
   'Geometrie',
   'Mathematik',
   5,
   'Baden-Württemberg',
   'Grundlegend',
   true),
  
  ('Größen umrechnen (Länge, Gewicht, Zeit)',
   'Schüler können zwischen verschiedenen Maßeinheiten umrechnen (z.B. km ↔ m, kg ↔ g).',
   'Größen und Messen',
   'Mathematik',
   5,
   'Baden-Württemberg',
   'Grundlegend',
   true);

-- ============================================================================
-- MATHEMATIK - Grade 6
-- ============================================================================

INSERT INTO public.competencies (title, description, competency_domain, subject, grade_level, federal_state, requirement_level, is_mandatory)
VALUES
  ('Brüche multiplizieren und dividieren',
   'Schüler können Brüche miteinander multiplizieren und durch Brüche dividieren.',
   'Zahlen und Operationen',
   'Mathematik',
   6,
   NULL, -- Gilt für alle Bundesländer
   'Grundlegend',
   true),
  
  ('Prozentrechnung verstehen',
   'Schüler verstehen den Zusammenhang zwischen Brüchen, Dezimalzahlen und Prozenten.',
   'Zahlen und Operationen',
   'Mathematik',
   6,
   NULL,
   'Grundlegend',
   true),
  
  ('Volumen von Quadern berechnen',
   'Schüler können das Volumen von Quadern mit der Formel V = l × b × h berechnen.',
   'Geometrie',
   'Mathematik',
   6,
   NULL,
   'Grundlegend',
   true);

-- ============================================================================
-- DEUTSCH (German) - Grade 5
-- ============================================================================

INSERT INTO public.competencies (title, description, competency_domain, subject, grade_level, federal_state, requirement_level, is_mandatory)
VALUES
  ('Texte sinnerfassend lesen',
   'Schüler können altersgemäße Texte lesen und die Hauptaussagen verstehen.',
   'Lesen',
   'Deutsch',
   5,
   NULL,
   'Grundlegend',
   true),
  
  ('Wortarten erkennen und benennen',
   'Schüler können Nomen, Verben, Adjektive und Artikel in Sätzen erkennen und benennen.',
   'Grammatik',
   'Deutsch',
   5,
   NULL,
   'Grundlegend',
   true),
  
  ('Einfache Texte verfassen',
   'Schüler können einfache Erzählungen, Berichte oder Beschreibungen verfassen.',
   'Schreiben',
   'Deutsch',
   5,
   NULL,
   'Grundlegend',
   true),
  
  ('Rechtschreibung: Groß- und Kleinschreibung',
   'Schüler beherrschen die Regeln der Groß- und Kleinschreibung.',
   'Rechtschreibung',
   'Deutsch',
   5,
   NULL,
   'Grundlegend',
   true);

-- ============================================================================
-- DEUTSCH - Grade 6
-- ============================================================================

INSERT INTO public.competencies (title, description, competency_domain, subject, grade_level, federal_state, requirement_level, is_mandatory)
VALUES
  ('Satzglieder bestimmen',
   'Schüler können Subjekt, Prädikat und Objekt in Sätzen bestimmen.',
   'Grammatik',
   'Deutsch',
   6,
   NULL,
   'Grundlegend',
   true),
  
  ('Texte interpretieren',
   'Schüler können einfache literarische Texte interpretieren und eigene Meinungen begründen.',
   'Lesen',
   'Deutsch',
   6,
   NULL,
   'Erweitert',
   true),
  
  ('Zeichensetzung bei Aufzählungen',
   'Schüler beherrschen die Kommasetzung bei Aufzählungen.',
   'Rechtschreibung',
   'Deutsch',
   6,
   NULL,
   'Grundlegend',
   true);

-- ============================================================================
-- ENGLISCH (English) - Grade 5
-- ============================================================================

INSERT INTO public.competencies (title, description, competency_domain, subject, grade_level, federal_state, requirement_level, is_mandatory)
VALUES
  ('Sich selbst vorstellen',
   'Schüler können sich auf Englisch vorstellen (Name, Alter, Hobbys).',
   'Sprechen',
   'Englisch',
   5,
   NULL,
   'Grundlegend',
   true),
  
  ('Einfache Fragen stellen und beantworten',
   'Schüler können einfache Fragen zu Alltagsthemen stellen und beantworten.',
   'Sprechen',
   'Englisch',
   5,
   NULL,
   'Grundlegend',
   true),
  
  ('Gegenwart (Simple Present) verwenden',
   'Schüler können das Simple Present korrekt anwenden.',
   'Grammatik',
   'Englisch',
   5,
   NULL,
   'Grundlegend',
   true),
  
  ('Kurze Texte verstehen',
   'Schüler können einfache englische Texte lesen und verstehen.',
   'Lesen',
   'Englisch',
   5,
   NULL,
   'Grundlegend',
   true);

-- ============================================================================
-- ENGLISCH - Grade 6
-- ============================================================================

INSERT INTO public.competencies (title, description, competency_domain, subject, grade_level, federal_state, requirement_level, is_mandatory)
VALUES
  ('Vergangenheit (Simple Past) verwenden',
   'Schüler können das Simple Past korrekt anwenden und über vergangene Ereignisse sprechen.',
   'Grammatik',
   'Englisch',
   6,
   NULL,
   'Grundlegend',
   true),
  
  ('Über Hobbys und Freizeit sprechen',
   'Schüler können über ihre Hobbys und Freizeitaktivitäten auf Englisch sprechen.',
   'Sprechen',
   'Englisch',
   6,
   NULL,
   'Grundlegend',
   true),
  
  ('Einfache E-Mails schreiben',
   'Schüler können einfache E-Mails oder Nachrichten auf Englisch verfassen.',
   'Schreiben',
   'Englisch',
   6,
   NULL,
   'Grundlegend',
   true);

-- ============================================================================
-- MATHEMATIK - Grade 7-10 (Erweiterte Kompetenzen)
-- ============================================================================

INSERT INTO public.competencies (title, description, competency_domain, subject, grade_level, federal_state, requirement_level, is_mandatory)
VALUES
  ('Lineare Gleichungen lösen',
   'Schüler können lineare Gleichungen mit einer Unbekannten lösen.',
   'Algebra',
   'Mathematik',
   7,
   NULL,
   'Grundlegend',
   true),
  
  ('Prozentrechnung anwenden',
   'Schüler können Prozentrechnung in Alltagssituationen anwenden (Rabatt, Zinsen).',
   'Zahlen und Operationen',
   'Mathematik',
   7,
   NULL,
   'Grundlegend',
   true),
  
  ('Satz des Pythagoras anwenden',
   'Schüler können den Satz des Pythagoras zur Berechnung von Seitenlängen in rechtwinkligen Dreiecken anwenden.',
   'Geometrie',
   'Mathematik',
   8,
   NULL,
   'Grundlegend',
   true),
  
  ('Quadratische Gleichungen lösen',
   'Schüler können quadratische Gleichungen mit verschiedenen Verfahren lösen.',
   'Algebra',
   'Mathematik',
   9,
   NULL,
   'Erweitert',
   true),
  
  ('Funktionen verstehen und darstellen',
   'Schüler können lineare und quadratische Funktionen verstehen und grafisch darstellen.',
   'Funktionen',
   'Mathematik',
   9,
   NULL,
   'Grundlegend',
   true),
  
  ('Wahrscheinlichkeitsrechnung',
   'Schüler können einfache Wahrscheinlichkeiten berechnen und interpretieren.',
   'Stochastik',
   'Mathematik',
   10,
   NULL,
   'Grundlegend',
   true);

-- ============================================================================
-- DEUTSCH - Grade 7-10 (Erweiterte Kompetenzen)
-- ============================================================================

INSERT INTO public.competencies (title, description, competency_domain, subject, grade_level, federal_state, requirement_level, is_mandatory)
VALUES
  ('Argumentative Texte verfassen',
   'Schüler können argumentative Texte (z.B. Erörterungen) strukturiert verfassen.',
   'Schreiben',
   'Deutsch',
   8,
   NULL,
   'Erweitert',
   true),
  
  ('Literarische Epochen kennen',
   'Schüler kennen wichtige literarische Epochen und können Texte einordnen.',
   'Literatur',
   'Deutsch',
   9,
   NULL,
   'Erweitert',
   true),
  
  ('Sachtexte analysieren',
   'Schüler können Sachtexte analysieren und die Argumentationsstruktur erkennen.',
   'Lesen',
   'Deutsch',
   10,
   NULL,
   'Erweitert',
   true);

-- ============================================================================
-- ENGLISCH - Grade 7-10 (Erweiterte Kompetenzen)
-- ============================================================================

INSERT INTO public.competencies (title, description, competency_domain, subject, grade_level, federal_state, requirement_level, is_mandatory)
VALUES
  ('Über Zukunftspläne sprechen (will/going to)',
   'Schüler können über Zukunftspläne sprechen und will/going to korrekt verwenden.',
   'Grammatik',
   'Englisch',
   7,
   NULL,
   'Grundlegend',
   true),
  
  ('Konditionalsätze (if-clauses) verwenden',
   'Schüler können Konditionalsätze Typ 1 und 2 korrekt bilden.',
   'Grammatik',
   'Englisch',
   8,
   NULL,
   'Erweitert',
   true),
  
  ('Präsentationen auf Englisch halten',
   'Schüler können kurze Präsentationen zu vertrauten Themen auf Englisch halten.',
   'Sprechen',
   'Englisch',
   9,
   NULL,
   'Erweitert',
   true),
  
  ('Texte zusammenfassen und kommentieren',
   'Schüler können englische Texte zusammenfassen und eigene Meinungen dazu äußern.',
   'Schreiben',
   'Englisch',
   10,
   NULL,
   'Erweitert',
   true);
