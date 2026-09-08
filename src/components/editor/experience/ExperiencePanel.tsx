import { cn } from "@/lib/utils";
import { Reorder } from "framer-motion";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/compat/client";
import ExperienceItem from "./ExperienceItem";
import { Experience } from "@/types/resume";
import { useResumeStore } from "@/store/useResumeStore";
import { generateUUID } from "@/utils/uuid";

const ExperiencePanel = () => {
  const t = useTranslations("workbench.experiencePanel");
  const { activeResume, updateExperience, updateExperienceBatch, updateGlobalSettings } =
    useResumeStore();
  const { experience = [] } = activeResume || {};
  const handleCreateProject = () => {
    const newProject: Experience = {
      id: generateUUID(),
      company: t("defaultProject.company"),
      position: t("defaultProject.position"),
      date: t("defaultProject.date"),
      details: t("defaultProject.details"),
      visible: true,
    };
    updateExperience(newProject);
  };

  return (
    <div
      className={cn(
        "space-y-4 px-4 py-4 rounded-lg",
        "bg-card border-border"
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
              variant={(activeResume?.globalSettings?.experienceLayout || "standard") === layout ? "default" : "outline"}
              onClick={() => updateGlobalSettings({ experienceLayout: layout })}
            >
              {t(`layout.options.${layout}`)}
            </Button>
          ))}
        </div>
      </div>

      <Reorder.Group
        axis="y"
        values={experience}
        onReorder={(newOrder) => {
          updateExperienceBatch(newOrder);
        }}
        className="space-y-3"
      >
        {experience.map((item) => (
          <ExperienceItem key={item.id} experience={item}></ExperienceItem>
        ))}

        <Button onClick={handleCreateProject} className="w-full">
          <PlusCircle className="w-4 h-4 mr-2" />
          {t("addButton")}
        </Button>
      </Reorder.Group>
    </div>
  );
};

export default ExperiencePanel;
