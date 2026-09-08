import React, { useCallback, useEffect, useRef, useState } from "react";
import { PlusCircle, GripVertical, Trash2, Eye, EyeOff } from "lucide-react";
import { Reorder, AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "@/i18n/compat/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import PhotoUpload from "@/components/shared/PhotoSelector";
import IconSelector from "../IconSelector";
import AlignSelector from "./AlignSelector";
import Field from "../Field";
import { cn } from "@/lib/utils";
import { DEFAULT_FIELD_ORDER } from "@/config";
import { useResumeStore } from "@/store/useResumeStore";
import { BasicFieldType, CustomFieldType, DEFAULT_CONFIG } from "@/types/resume";
import { generateUUID } from "@/utils/uuid";
interface CustomFieldProps {
  field: CustomFieldType;
  onUpdate: (field: CustomFieldType) => void;
  onDelete: (id: string) => void;
  onReorderEnd: () => void;
}

const itemAnimations = {
  initial: { opacity: 0, y: 0 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 0 },
  transition: { type: "spring", stiffness: 500, damping: 50, mass: 1 },
};

interface SizeControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  presets: Array<{ label: string; value: number }>;
  onChange: (value: number) => void;
}

const SizeControl: React.FC<SizeControlProps> = ({
  label,
  value,
  min,
  max,
  presets,
  onChange,
}) => (
  <div className="space-y-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <Slider
      aria-label={label}
      value={[value]}
      min={min}
      max={max}
      step={1}
      onValueChange={([nextValue]) => onChange(nextValue)}
    />
    <div className="grid grid-cols-3 gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.label}
          type="button"
          size="sm"
          variant={value === preset.value ? "default" : "outline"}
          onClick={() => onChange(preset.value)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  </div>
);

const CustomField: React.FC<CustomFieldProps> = ({
  field,
  onUpdate,
  onDelete,
  onReorderEnd,
}) => {
  const t = useTranslations("workbench.basicPanel");

  return (
    <Reorder.Item
      value={field}
      id={field.id}
      className="group touch-none list-none"
      onDragEnd={onReorderEnd}
    >
      <motion.div
        {...itemAnimations}
        className={cn(
          "grid grid-cols-[auto,auto,1fr,1fr,auto,auto] gap-3 items-center p-3",
          "bg-card rounded-xl",
          "border border-border",
          "transition-all duration-200",
          "hover:border-primary/20",
          !field.visible && "!opacity-60"
        )}
      >
        <div className="flex items-center justify-center">
          <GripVertical
            className={cn(
              "w-4 h-4 cursor-grab active:cursor-grabbing",
              "text-muted-foreground",
              "transition-colors duration-200",
              "group-hover:text-foreground"
            )}
          />
        </div>
        <div className="flex items-center justify-center">
          <IconSelector
            value={field.icon}
            onChange={(value) => onUpdate({ ...field, icon: value })}
          />
        </div>
        <Field
          value={field.label ?? ""}
          onChange={(value) =>
            onUpdate({
              ...field,
              label: value,
            })
          }
          placeholder={t("customFields.placeholders.label")}
          className={cn(
            "bg-background/50",
            "border-border",
            "focus:border-primary",
            "placeholder-muted-foreground"
          )}
        />
        <Field
          value={field.value}
          onChange={(value) =>
            onUpdate({
              ...field,
              value: value,
            })
          }
          placeholder={t("customFields.placeholders.value")}
          className={cn(
            "bg-background/50",
            "border-border",
            "focus:border-primary",
            "placeholder-muted-foreground"
          )}
        />

        <div className="flex items-center gap-2 whitespace-nowrap">
          <Switch
            checked={field.displayLabel ?? false}
            onCheckedChange={(checked) =>
              onUpdate({
                ...field,
                displayLabel: checked,
              })
            }
          />
          <span className="text-xs text-muted-foreground">
            {t("customFields.displayLabel")}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "shrink-0 h-8 px-2",
              "text-muted-foreground",
              "hover:text-foreground"
            )}
            onClick={() => onUpdate({ ...field, visible: !field.visible })}
          >
            {field.visible ? (
              <Eye className="w-4 h-4 text-primary" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(field.id)}
            className={cn(
              "shrink-0 h-8 px-2",
              "text-neutral-500 dark:text-neutral-400",
              "hover:text-red-600 dark:hover:text-red-400"
            )}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
        </div>
      </motion.div>
    </Reorder.Item>
  );
};

const BasicPanel: React.FC = () => {
  const { activeResume, updateBasicInfo } = useResumeStore();
  const { basic } = activeResume || {};
  const [customFields, setCustomFields] = useState<CustomFieldType[]>(
    basic?.customFields?.map((field) => ({
      ...field,
      visible: field.visible ?? true,
    })) || []
  );
  const [basicFields, setBasicFields] = useState<BasicFieldType[]>(() => {
    if (!basic?.fieldOrder) {
      return DEFAULT_FIELD_ORDER;
    }
    return basic.fieldOrder.map((field) => ({
      ...field,
      visible: field.visible ?? true,
    }));
  });
  const basicFieldsRef = useRef(basicFields);
  const customFieldsRef = useRef(customFields);
  const t = useTranslations("workbench.basicPanel");
  const defaultNameFontSize =
    activeResume?.templateId === "swiss"
      ? 38
      : activeResume?.templateId === "editorial"
        ? (activeResume.globalSettings?.headerSize || 20) * 2
        : 30;
  const defaultTitleFontSize =
    activeResume?.templateId === "swiss"
      ? 12
      : activeResume?.templateId === "editorial"
        ? activeResume.globalSettings?.subheaderSize || 16
        : 18;
  const defaultContactFontSize = activeResume?.globalSettings?.baseFontSize || 14;
  const currentPhotoWidth = basic?.photoConfig?.width || DEFAULT_CONFIG.width;
  const currentPhotoHeight = basic?.photoConfig?.height || DEFAULT_CONFIG.height;
  const currentNameFontSize = basic?.nameFontSize || defaultNameFontSize;
  const currentTitleFontSize = basic?.titleFontSize || defaultTitleFontSize;
  const currentContactFontSize = basic?.contactFontSize || defaultContactFontSize;
  const sizeLabels = {
    small: t("appearance.sizes.small"),
    medium: t("appearance.sizes.medium"),
    large: t("appearance.sizes.large"),
  };

  const updateSizeSetting = (
    key: "nameFontSize" | "titleFontSize" | "contactFontSize",
    value: number,
    min: number,
    max: number
  ) => {
    updateBasicInfo({ [key]: Math.min(max, Math.max(min, value)) });
  };

  const updatePhotoSize = (width: number) => {
    const aspectRatio = currentPhotoHeight / currentPhotoWidth;
    updateBasicInfo({
      photoConfig: {
        ...(basic?.photoConfig || DEFAULT_CONFIG),
        width,
        height: Math.round(width * aspectRatio),
      },
    });
  };

  const resetSizes = () => {
    updateBasicInfo({
      photoConfig: {
        ...(basic?.photoConfig || DEFAULT_CONFIG),
        width: DEFAULT_CONFIG.width,
        height: DEFAULT_CONFIG.height,
      },
      nameFontSize: defaultNameFontSize,
      titleFontSize: defaultTitleFontSize,
      contactFontSize: defaultContactFontSize,
    });
  };

  useEffect(() => {
    basicFieldsRef.current = basicFields;
  }, [basicFields]);

  useEffect(() => {
    customFieldsRef.current = customFields;
  }, [customFields]);

  const handleBasicReorder = (newOrder: BasicFieldType[]) => {
    basicFieldsRef.current = newOrder;
    setBasicFields(newOrder);
  };

  const commitBasicReorder = useCallback(() => {
    updateBasicInfo({
      fieldOrder: basicFieldsRef.current,
    });
  }, [updateBasicInfo]);

  const toggleFieldVisibility = (fieldId: string, isVisible: boolean) => {
    const newFields = basicFields.map((field) =>
      field.id === fieldId ? { ...field, visible: isVisible } : field
    );
    setBasicFields(newFields);
    updateBasicInfo({
      ...basic,
      fieldOrder: newFields,
    });
  };

  const deleteBasicField = (fieldId: string) => {
    const fieldToDelete = basicFields.find((field) => field.id === fieldId);
    if (
      fieldToDelete &&
      (fieldToDelete.key === "name" || fieldToDelete.key === "title")
    ) {
      return;
    }

    const updatedFields = basicFields.filter((field) => field.id !== fieldId);
    setBasicFields(updatedFields);
    updateBasicInfo({
      ...basic,
      fieldOrder: updatedFields,
    });
  };

  const addCustomField = () => {
    const fieldToAdd: CustomFieldType = {
      id: generateUUID(),
      label: "",
      value: "",
      icon: "User",
      visible: true,
      displayLabel: false,
    };
    const updatedFields = [...customFields, fieldToAdd];
    setCustomFields(updatedFields);
    updateBasicInfo({
      ...basic,
      customFields: updatedFields,
    });
  };

  const updateCustomField = (updatedField: CustomFieldType) => {
    const updatedFields = customFields.map((field) =>
      field.id === updatedField.id ? updatedField : field
    );
    setCustomFields(updatedFields);
    updateBasicInfo({
      ...basic,
      customFields: updatedFields,
    });
  };

  const deleteCustomField = (id: string) => {
    const updatedFields = customFields.filter((field) => field.id !== id);
    setCustomFields(updatedFields);
    updateBasicInfo({
      ...basic,
      customFields: updatedFields,
    });
  };

  const handleCustomFieldsReorder = (newOrder: CustomFieldType[]) => {
    customFieldsRef.current = newOrder;
    setCustomFields(newOrder);
  };

  const commitCustomFieldsReorder = useCallback(() => {
    updateBasicInfo({
      customFields: customFieldsRef.current,
    });
  }, [updateBasicInfo]);

  const renderBasicField = (field: BasicFieldType) => {
    const selectedIcon = basic?.icons?.[field.key] || "User";

    return (
      <Reorder.Item
        value={field}
        id={field.id}
        key={field.id}
        className="group touch-none list-none"
        dragListener={field.key !== "name" && field.key !== "title"}
        onDragEnd={commitBasicReorder}
      >
        <motion.div
          {...itemAnimations}
          className={cn(
            "flex items-center gap-4 p-4 pr-3",
            "bg-card",
            "rounded-lg ",
            "transition-all duration-200",
            !field.visible && "opacity-75"
          )}
        >
          {field.key !== "name" && field.key !== "title" && (
            <div className="shrink-0">
              <GripVertical
                className={cn(
                  "w-5 h-5 cursor-grab active:cursor-grabbing",
                  "text-muted-foreground",
                  "hover:text-foreground",
                  "transition-colors duration-200"
                )}
              />
            </div>
          )}

          <div className="flex flex-1 min-w-0 items-center">
            {field.key !== "name" && field.key !== "title" && (
              <IconSelector
                value={selectedIcon}
                onChange={(value) => {
                  updateBasicInfo({
                    ...basic,
                    icons: {
                      ...(basic?.icons || {}),
                      [field.key]: value,
                    },
                  });
                }}
              />
            )}
            <div className=" w-[80px] ml-[4px] text-sm font-medium text-foreground">
              {t(`basicFields.${field.key}`)}
            </div>
            <div className="flex-1">
              <Field
                label=""
                value={(basic?.[field.key] as string) ?? ""}
                onChange={(value) =>
                  updateBasicInfo({
                    ...basic,
                    [field.key]: value,
                  })
                }
                placeholder={`请输入${field.label}`}
                type={field.type}
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "shrink-0 h-8 px-2",
                "text-neutral-500 dark:text-neutral-400",
                "hover:text-neutral-700 dark:hover:text-neutral-200"
              )}
              onClick={() => toggleFieldVisibility(field.id, !field.visible)}
            >
              {field.visible ? (
                <Eye className="w-4 h-4 text-primary" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </Button>

            {field.key !== "name" && field.key !== "title" && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "shrink-0 h-8 px-2",
                  "text-neutral-500 dark:text-neutral-400",
                  "hover:text-red-600 dark:hover:text-red-400"
                )}
                onClick={() => deleteBasicField(field.id)}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            )}
          </div>
        </motion.div>
      </Reorder.Item>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">{t("layout")}</h2>
          <div className=" bg-card rounded-lg">
            <AlignSelector
              value={basic?.layout || "left"}
              onChange={(value) =>
                updateBasicInfo({
                  ...basic,
                  layout: value,
                })
              }
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">{t("appearance.title")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("appearance.description")}
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={resetSizes}>
              {t("appearance.reset")}
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t("appearance.photo")}</h3>
            <SizeControl
              label={t("appearance.photoSize")}
              value={currentPhotoWidth}
              min={24}
              max={200}
              presets={[
                { label: sizeLabels.small, value: 70 },
                { label: sizeLabels.medium, value: 90 },
                { label: sizeLabels.large, value: 120 },
              ]}
              onChange={updatePhotoSize}
            />
            <div className="grid grid-cols-2 gap-2">
              {(["left", "right", "top", "topRight"] as const).map((position) => (
                <Button
                  key={position}
                  type="button"
                  size="sm"
                  variant={
                    (basic?.photoPosition ||
                      (basic?.layout === "right"
                        ? "right"
                        : basic?.layout === "center"
                          ? "top"
                          : "left")) === position
                      ? "default"
                      : "outline"
                  }
                  onClick={() => updateBasicInfo({ photoPosition: position })}
                >
                  {t(`appearance.photoPositions.${position}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t pt-3">
            <h3 className="text-sm font-medium">{t("appearance.nameAndTitle")}</h3>
            <SizeControl
              label={t("appearance.nameSize")}
              value={currentNameFontSize}
              min={20}
              max={56}
              presets={[
                { label: sizeLabels.small, value: Math.max(20, defaultNameFontSize - 6) },
                { label: sizeLabels.medium, value: defaultNameFontSize },
                { label: sizeLabels.large, value: Math.min(56, defaultNameFontSize + 8) },
              ]}
              onChange={(value) => updateSizeSetting("nameFontSize", value, 20, 56)}
            />
            <SizeControl
              label={t("appearance.titleSize")}
              value={currentTitleFontSize}
              min={10}
              max={32}
              presets={[
                { label: sizeLabels.small, value: Math.max(10, defaultTitleFontSize - 3) },
                { label: sizeLabels.medium, value: defaultTitleFontSize },
                { label: sizeLabels.large, value: Math.min(32, defaultTitleFontSize + 4) },
              ]}
              onChange={(value) => updateSizeSetting("titleFontSize", value, 10, 32)}
            />
            <div className="grid grid-cols-3 gap-2">
              {(["left", "center", "right"] as const).map((alignment) => (
                <Button
                  key={alignment}
                  type="button"
                  size="sm"
                  variant={(basic?.nameAlignment || basic?.layout || "left") === alignment ? "default" : "outline"}
                  onClick={() => updateBasicInfo({ nameAlignment: alignment })}
                >
                  {t(`appearance.alignments.${alignment}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t pt-3">
            <h3 className="text-sm font-medium">{t("appearance.contacts")}</h3>
            <SizeControl
              label={t("appearance.contactSize")}
              value={currentContactFontSize}
              min={10}
              max={24}
              presets={[
                { label: sizeLabels.small, value: Math.max(10, defaultContactFontSize - 2) },
                { label: sizeLabels.medium, value: defaultContactFontSize },
                { label: sizeLabels.large, value: Math.min(24, defaultContactFontSize + 2) },
              ]}
              onChange={(value) => updateSizeSetting("contactFontSize", value, 10, 24)}
            />
            <div className="grid grid-cols-3 gap-2">
              {(["left", "center", "right"] as const).map((alignment) => (
                <Button
                  key={alignment}
                  type="button"
                  size="sm"
                  variant={(basic?.contactAlignment || basic?.layout || "left") === alignment ? "default" : "outline"}
                  onClick={() => updateBasicInfo({ contactAlignment: alignment })}
                >
                  {t(`appearance.alignments.${alignment}`)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{t("title")}</h2>
          </div>

          <div className="space-y-4">
            <motion.div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-3 border border-border"
              >
                <PhotoUpload />
              </motion.div>

              <motion.div className="space-y-6">
                <motion.div className="space-y-3">
                  <motion.h3 className="font-medium text-neutral-900 dark:text-neutral-200 px-1">
                    {t("basicField")}
                  </motion.h3>
                  <AnimatePresence mode="popLayout">
                    <Reorder.Group
                      axis="y"
                      as="div"
                      values={basicFields}
                      onReorder={handleBasicReorder}
                      className="space-y-3"
                    >
                      {basicFields.map((field) => renderBasicField(field))}
                    </Reorder.Group>
                  </AnimatePresence>
                </motion.div>

                <motion.div className="space-y-3">
                  <motion.h3 className="font-medium text-neutral-900 dark:text-neutral-200 px-1">
                    {t("customField")}
                  </motion.h3>
                  <AnimatePresence mode="popLayout">
                    <Reorder.Group
                      axis="y"
                      as="div"
                      values={customFields}
                      onReorder={handleCustomFieldsReorder}
                      className="space-y-3"
                    >
                      {Array.isArray(customFields) &&
                        customFields.map((field) => (
                          <CustomField
                            key={field.id}
                            field={field}
                            onUpdate={updateCustomField}
                            onDelete={deleteCustomField}
                            onReorderEnd={commitCustomFieldsReorder}
                          />
                        ))}
                    </Reorder.Group>
                  </AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Button onClick={addCustomField} className="w-full mt-4">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      {t("customFields.addButton")}
                    </Button>
                  </motion.div>
                </motion.div>
                <motion.div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between">
                      <motion.h3 className="font-medium text-neutral-900 dark:text-neutral-200 px-1">
                        {t("githubContributions")}
                      </motion.h3>

                      <Switch
                        checked={basic?.githubContributionsVisible}
                        onCheckedChange={(checked) =>
                          updateBasicInfo({
                            ...basic,
                            githubContributionsVisible: checked,
                          })
                        }
                      />
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center ml-3 space-x-2">
                        <div className=" w-[110px]">Access Token</div>
                        <Input
                          placeholder="请输入github access token"
                          className="flex-1"
                          value={basic?.githubKey}
                          onChange={(e) =>
                            updateBasicInfo({
                              ...basic,
                              githubKey: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center ml-3 mt-4 space-x-2">
                        <div className="w-[110px]">UseName</div>
                        <Input
                          className="flex-1"
                          placeholder="请输入github username"
                          value={basic?.githubUseName}
                          onChange={(e) =>
                            updateBasicInfo({
                              ...basic,
                              githubUseName: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicPanel;
