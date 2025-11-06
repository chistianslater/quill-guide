import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProgressReportProps {
  userId: string;
  displayName: string;
  gradeLevel: number;
}

export const ProgressReport = ({ userId, displayName, gradeLevel }: ProgressReportProps) => {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [competencyProgress, setCompetencyProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch subject assessments
    const { data: assessmentData } = await supabase
      .from("subject_assessments")
      .select("*")
      .eq("user_id", userId)
      .order("assessment_date", { ascending: true });

    // Fetch competency progress with competencies
    const { data: progressData } = await supabase
      .from("competency_progress")
      .select("*, competencies(*)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    setAssessments(assessmentData || []);
    setCompetencyProgress(progressData || []);
    setLoading(false);
  };

  const getLatestAssessments = () => {
    const latestBySubject = new Map();
    assessments.forEach(a => {
      if (!latestBySubject.has(a.subject) || 
          new Date(a.assessment_date) > new Date(latestBySubject.get(a.subject).assessment_date)) {
        latestBySubject.set(a.subject, a);
      }
    });
    return Array.from(latestBySubject.values());
  };

  const getSubjectTrend = (subject: string) => {
    const subjectAssessments = assessments
      .filter(a => a.subject === subject)
      .sort((a, b) => new Date(a.assessment_date).getTime() - new Date(b.assessment_date).getTime());

    if (subjectAssessments.length < 2) return "stable";

    const latest = subjectAssessments[subjectAssessments.length - 1];
    const previous = subjectAssessments[subjectAssessments.length - 2];

    if (latest.estimated_level > previous.estimated_level) return "up";
    if (latest.estimated_level < previous.estimated_level) return "down";
    return "stable";
  };

  const getCompetencyBySubject = () => {
    const bySubject = new Map();
    competencyProgress.forEach(p => {
      if (p.competencies) {
        const subject = p.competencies.subject;
        if (!bySubject.has(subject)) {
          bySubject.set(subject, []);
        }
        bySubject.get(subject).push(p);
      }
    });
    return bySubject;
  };

  const getSubjectStats = (subject: string) => {
    const competencies = getCompetencyBySubject().get(subject) || [];
    const mastered = competencies.filter(c => c.status === "mastered").length;
    const inProgress = competencies.filter(c => c.status === "in_progress").length;
    const avgConfidence = competencies.length > 0 
      ? Math.round(competencies.reduce((sum, c) => sum + c.confidence_level, 0) / competencies.length)
      : 0;

    return { mastered, inProgress, total: competencies.length, avgConfidence };
  };

  const exportReport = () => {
    toast({
      title: "Bericht wird vorbereitet...",
      description: "Der Export startet in Kürze."
    });
    
    // Generate PDF-like text report
    let report = `FORTSCHRITTSBERICHT für ${displayName}\n`;
    report += `Klassenstufe: ${gradeLevel}\n`;
    report += `Erstellt am: ${new Date().toLocaleDateString("de-DE")}\n\n`;
    report += `===================================\n\n`;

    const latest = getLatestAssessments();
    latest.forEach(assessment => {
      const stats = getSubjectStats(assessment.subject);
      const trend = getSubjectTrend(assessment.subject);
      
      report += `${assessment.subject}:\n`;
      report += `  Aktuelles Niveau: Klasse ${assessment.estimated_level}\n`;
      report += `  Ziel-Niveau: Klasse ${assessment.actual_grade_level}\n`;
      report += `  Diskrepanz: ${assessment.discrepancy} Klassen\n`;
      report += `  Bearbeitete Kompetenzen: ${stats.total}\n`;
      report += `  Gemeistert: ${stats.mastered}\n`;
      report += `  In Bearbeitung: ${stats.inProgress}\n`;
      report += `  Durchschnittliches Vertrauen: ${stats.avgConfidence}%\n`;
      report += `  Trend: ${trend === "up" ? "Aufwärts ↑" : trend === "down" ? "Abwärts ↓" : "Stabil →"}\n\n`;
    });

    // Download as text file
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fortschrittsbericht-${displayName}-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Lädt Fortschrittsbericht...</p>
        </CardContent>
      </Card>
    );
  }

  const latestAssessments = getLatestAssessments();
  const chartData = latestAssessments.map(a => ({
    subject: a.subject,
    estimated: a.estimated_level,
    target: a.actual_grade_level,
    discrepancy: Math.abs(a.discrepancy)
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Fortschrittsbericht</CardTitle>
              <CardDescription>
                Übersicht über {displayName}s Lernfortschritt
              </CardDescription>
            </div>
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Bericht exportieren
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="subjects">Fächer</TabsTrigger>
          <TabsTrigger value="competencies">Kompetenzen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Niveau-Vergleich</CardTitle>
              <CardDescription>
                Aktuelles Niveau vs. Ziel-Niveau (Klassenstufe {gradeLevel})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" angle={-45} textAnchor="end" height={80} />
                  <YAxis label={{ value: "Klassenstufe", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="estimated" fill="hsl(var(--primary))" name="Aktuelles Niveau" />
                  <Bar dataKey="target" fill="hsl(var(--muted))" name="Ziel-Niveau" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Prioritäten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {latestAssessments
                    .filter(a => a.is_priority)
                    .map(assessment => (
                      <div key={assessment.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <span className="font-medium">{assessment.subject}</span>
                        <Badge variant="secondary">Priorität</Badge>
                      </div>
                    ))}
                  {latestAssessments.filter(a => a.is_priority).length === 0 && (
                    <p className="text-sm text-muted-foreground">Keine Prioritätsfächer</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gesamt-Statistik</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Eingestufte Fächer</p>
                  <p className="text-2xl font-bold">{latestAssessments.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bearbeitete Kompetenzen</p>
                  <p className="text-2xl font-bold">{competencyProgress.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Gemeisterte Kompetenzen</p>
                  <p className="text-2xl font-bold">
                    {competencyProgress.filter(p => p.status === "mastered").length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4">
          {latestAssessments.map(assessment => {
            const stats = getSubjectStats(assessment.subject);
            const trend = getSubjectTrend(assessment.subject);
            const progress = ((assessment.estimated_level / assessment.actual_grade_level) * 100);

            return (
              <Card key={assessment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>{assessment.subject}</CardTitle>
                      {assessment.is_priority && <Badge variant="secondary">Priorität</Badge>}
                      {trend === "up" && <TrendingUp className="h-5 w-5 text-green-500" />}
                      {trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
                      {trend === "stable" && <Minus className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Niveau: Klasse {assessment.estimated_level}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Fortschritt zum Ziel</span>
                      <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Gesamt</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{stats.mastered}</p>
                      <p className="text-xs text-muted-foreground">Gemeistert</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.avgConfidence}%</p>
                      <p className="text-xs text-muted-foreground">Ø Vertrauen</p>
                    </div>
                  </div>

                  {assessment.discrepancy > 2 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                      <p className="text-sm">
                        <strong>Hinweis:</strong> Dieses Fach liegt {assessment.discrepancy} Klassenstufen
                        unter dem aktuellen Jahrgang. Kontinuierliche Unterstützung empfohlen.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="competencies" className="space-y-4">
          {Array.from(getCompetencyBySubject().entries()).map(([subject, competencies]: [string, any[]]) => (
            <Card key={subject}>
              <CardHeader>
                <CardTitle>{subject}</CardTitle>
                <CardDescription>
                  {competencies.length} Kompetenz{competencies.length !== 1 ? "en" : ""} in Bearbeitung
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {competencies.slice(0, 5).map(comp => (
                    <div key={comp.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{comp.competencies?.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {comp.competencies?.competency_domain}
                          </p>
                        </div>
                        <Badge variant={
                          comp.status === "mastered" ? "default" :
                          comp.status === "in_progress" ? "secondary" : "outline"
                        }>
                          {comp.status === "mastered" ? "Gemeistert" :
                           comp.status === "in_progress" ? "In Arbeit" : "Neu"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={comp.confidence_level} className="flex-1" />
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {comp.confidence_level}%
                        </span>
                      </div>
                      {comp.struggles_count > 0 && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                          {comp.struggles_count} Schwierigkeit{comp.struggles_count !== 1 ? "en" : ""} erkannt
                        </p>
                      )}
                    </div>
                  ))}
                  {competencies.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      ... und {competencies.length - 5} weitere
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
