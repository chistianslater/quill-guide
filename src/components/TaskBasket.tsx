import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Package, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskPackageView } from "./TaskPackageView";

interface TaskPackage {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  created_at: string;
  task_count?: number;
  completed_count?: number;
}

export const TaskBasket = ({ userId }: { userId: string }) => {
  const [packages, setPackages] = useState<TaskPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPackageTitle, setNewPackageTitle] = useState("");
  const [newPackageSubject, setNewPackageSubject] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPackages();
  }, [userId]);

  const loadPackages = async () => {
    const { data: packagesData, error } = await supabase
      .from("task_packages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading packages:", error);
      return;
    }

    // Load task counts for each package
    const packagesWithCounts = await Promise.all(
      (packagesData || []).map(async (pkg) => {
        const { count: totalCount } = await supabase
          .from("task_items")
          .select("*", { count: "exact", head: true })
          .eq("package_id", pkg.id);

        const { count: completedCount } = await supabase
          .from("task_items")
          .select("*", { count: "exact", head: true })
          .eq("package_id", pkg.id)
          .eq("is_completed", true);

        return {
          ...pkg,
          task_count: totalCount || 0,
          completed_count: completedCount || 0,
        };
      })
    );

    setPackages(packagesWithCounts);
  };

  const createPackage = async () => {
    if (!newPackageTitle.trim()) {
      toast({
        title: "Titel erforderlich",
        description: "Bitte gib einen Titel für das Aufgabenpaket ein.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("task_packages")
      .insert({
        user_id: userId,
        title: newPackageTitle,
        subject: newPackageSubject || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating package:", error);
      toast({
        title: "Fehler",
        description: "Aufgabenpaket konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Erfolg",
        description: "Aufgabenpaket wurde erstellt.",
      });
      setNewPackageTitle("");
      setNewPackageSubject("");
      setIsCreateDialogOpen(false);
      loadPackages();
      setSelectedPackage(data.id);
    }
    setIsLoading(false);
  };

  if (selectedPackage) {
    return (
      <TaskPackageView
        packageId={selectedPackage}
        userId={userId}
        onBack={() => {
          setSelectedPackage(null);
          loadPackages();
        }}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Lernkorb</h1>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neues Paket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Aufgabenpaket erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={newPackageTitle}
                  onChange={(e) => setNewPackageTitle(e.target.value)}
                  placeholder="z.B. Mathe Kapitel 5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Fach (optional)</Label>
                <Input
                  id="subject"
                  value={newPackageSubject}
                  onChange={(e) => setNewPackageSubject(e.target.value)}
                  placeholder="z.B. Mathematik"
                />
              </div>
              <Button
                onClick={createPackage}
                disabled={isLoading}
                className="w-full"
              >
                Erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {packages.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Noch keine Aufgabenpakete</h3>
          <p className="text-muted-foreground mb-4">
            Erstelle dein erstes Aufgabenpaket und lade Fotos von Aufgaben hoch.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Erstes Paket erstellen
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedPackage(pkg.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">{pkg.title}</h3>
                  {pkg.subject && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {pkg.subject}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {pkg.completed_count} / {pkg.task_count} erledigt
                    </span>
                    {pkg.task_count > 0 && (
                      <div className="flex-1 max-w-xs">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{
                              width: `${
                                (pkg.completed_count! / pkg.task_count!) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};