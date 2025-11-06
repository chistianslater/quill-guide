import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Upload, Check, X, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskItem {
  id: string;
  original_image_url: string;
  simplified_content: string | null;
  position: number;
  is_completed: boolean;
  created_at: string;
}

interface TaskPackageViewProps {
  packageId: string;
  userId: string;
  onBack: () => void;
  onStartTask?: (taskId: string, taskData: TaskItem) => void;
}

export const TaskPackageView = ({ packageId, userId, onBack, onStartTask }: TaskPackageViewProps) => {
  const [packageInfo, setPackageInfo] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPackageData();
    loadProfile();
  }, [packageId]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("grade_level")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const loadPackageData = async () => {
    const { data: pkg } = await supabase
      .from("task_packages")
      .select("*")
      .eq("id", packageId)
      .single();

    const { data: taskItems } = await supabase
      .from("task_items")
      .select("*")
      .eq("package_id", packageId)
      .order("position", { ascending: true });

    setPackageInfo(pkg);
    setTasks(taskItems || []);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setUploadDialogOpen(true);
    }
  };

  const uploadAndProcessImages = async () => {
    setIsUploading(true);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${i}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("task-images")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          title: "Upload-Fehler",
          description: `Bild ${i + 1} konnte nicht hochgeladen werden.`,
          variant: "destructive",
        });
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("task-images")
        .getPublicUrl(fileName);

      // Create task item first
      const { data: taskItem, error: insertError } = await supabase
        .from("task_items")
        .insert({
          package_id: packageId,
          user_id: userId,
          original_image_url: publicUrl,
          position: tasks.length + i,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        continue;
      }

      // Call AI to simplify
      try {
        const { data: simplifyData, error: simplifyError } = await supabase.functions.invoke(
          "simplify-task",
          {
            body: {
              imageUrl: publicUrl,
              gradeLevel: profile?.grade_level || 5,
            },
          }
        );

        if (simplifyError) throw simplifyError;

        // Update task with simplified content
        await supabase
          .from("task_items")
          .update({ simplified_content: simplifyData.simplifiedContent })
          .eq("id", taskItem.id);
      } catch (error) {
        console.error("Simplification error:", error);
        toast({
          title: "Vereinfachung fehlgeschlagen",
          description: "Die Aufgabe wurde gespeichert, aber nicht vereinfacht.",
          variant: "destructive",
        });
      }
    }

    toast({
      title: "Erfolg",
      description: `${selectedFiles.length} Aufgabe(n) hochgeladen und verarbeitet.`,
    });

    setIsUploading(false);
    setUploadDialogOpen(false);
    setSelectedFiles([]);
    loadPackageData();
  };

  const handleStartTask = (taskId: string, taskData: any) => {
    // Add package title to task data
    const enrichedTaskData = {
      ...taskData,
      package_title: packageInfo?.title
    };
    if (onStartTask) {
      onStartTask(taskId, enrichedTaskData);
    }
  };

  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("task_items")
      .update({ is_completed: !currentStatus })
      .eq("id", taskId);

    if (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    } else {
      loadPackageData();
    }
  };

  if (!packageInfo) {
    return <div className="flex items-center justify-center p-12">Lädt...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{packageInfo.title}</h1>
          {packageInfo.subject && (
            <p className="text-muted-foreground">{packageInfo.subject}</p>
          )}
        </div>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Fotos hochladen
          </Button>
        </div>
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aufgaben werden verarbeitet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {selectedFiles.length} Bild(er) ausgewählt. Die Aufgaben werden hochgeladen
              und automatisch vereinfacht.
            </p>
            {isUploading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={uploadAndProcessImages}
                  className="flex-1"
                  disabled={isUploading}
                >
                  Hochladen & Verarbeiten
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    setSelectedFiles([]);
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {tasks.length === 0 ? (
        <Card className="p-12 text-center">
          <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Noch keine Aufgaben</h3>
          <p className="text-muted-foreground">
            Lade Fotos von Aufgaben hoch, um zu beginnen.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="p-6">
              <div className="flex gap-4">
                <div className="flex items-start pt-1">
                  <Checkbox
                    checked={task.is_completed}
                    onCheckedChange={() =>
                      toggleTaskCompletion(task.id, task.is_completed)
                    }
                  />
                </div>
                <div className="flex-1">
                  <div className="mb-4">
                    <img
                      src={task.original_image_url}
                      alt="Aufgabe"
                      className="w-full max-w-md rounded-lg border"
                    />
                  </div>
                  {task.simplified_content ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Aufgabe vorbereitet und bereit zum Durchgehen
                      </p>
                      {!task.is_completed && onStartTask && (
                        <Button
                          onClick={() => handleStartTask(task.id, task)}
                          className="w-full"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Mit Buddy durchgehen
                        </Button>
                      )}
                      {task.is_completed && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Check className="h-4 w-4" />
                          <span>Erfolgreich bearbeitet!</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Wird vereinfacht...</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};