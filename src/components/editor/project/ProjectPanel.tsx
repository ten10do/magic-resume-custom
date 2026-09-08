import { cn } from "@/lib/utils";
import { useResumeStore } from "@/store/useResumeStore";
import { Reorder } from "framer-motion";
import { PlusCircle } from "lucide-react";
import { useTranslations } from "@/i18n/compat/client";
import { Button } from "@/components/ui/button";
import ProjectItem from "./ProjectItem";
import { Project } from "@/types/resume";
import { generateUUID } from "@/utils/uuid";

const ProjectPanel = () => {
  const t = useTranslations("workbench.projectPanel");
  const { activeResume, updateProjects, updateProjectsBatch, updateGlobalSettings } =
    useResumeStore();
  const { projects = [] } = activeResume || {};
  const handleCreateProject = () => {
    const newProject: Project = {
      id: generateUUID(),
      name: t("defaultProject.name"),
      role: t("defaultProject.role"),
      date: t("defaultProject.date"),
      description: t("defaultProject.description"),
      visible: true,
    };
    updateProjects(newProject);
  };

  return (
    <div
      className={cn(
        "space-y-4 px-4 py-4 rounded-lg",
        "bg-card border-border",
      )}
    >
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <div>
          <div className="text-sm font-medium">{t("layout.title")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("layout.description")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["standard", "dateRole"] as const).map((layout) => (
            <Button
              key={layout}
              type="button"
              size="sm"
              variant={(activeResume?.globalSettings?.projectLayout || "standard") === layout ? "default" : "outline"}
              onClick={() => updateGlobalSettings({ projectLayout: layout })}
            >
              {t(`layout.options.${layout}`)}
            </Button>
          ))}
        </div>
      </div>

      <Reorder.Group
        axis="y"
        values={projects}
        onReorder={(newOrder) => {
          updateProjectsBatch(newOrder);
        }}
        className="space-y-3"
      >
        {projects.map((project) => (
          <ProjectItem key={project.id} project={project}></ProjectItem>
        ))}

        <Button onClick={handleCreateProject} className="w-full">
          <PlusCircle className="w-4 h-4 mr-2" />
          {t("addButton")}
        </Button>
      </Reorder.Group>
    </div>
  );
};

export default ProjectPanel;
