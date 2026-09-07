import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "@/i18n/compat/client";
import { useRouter } from "@/lib/navigation";
import { Plus, Settings, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getConfig, getFileHandle } from "@/utils/fileSystem";
import { useResumeStore } from "@/store/useResumeStore";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { DEFAULT_TEMPLATES } from "@/config";
import { CreateResumeModal } from "./CreateResumeModal";
import { ImportResumeDialog } from "./ImportResumeDialog";
import { ResumeCardItem } from "./ResumeCardItem";
import { AnimatedImportButton } from "./AnimatedImportButton";
import {
    extractJsonContent,
    createResumeFromAIResult,
    toStringArray
} from "./utils";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

const MAX_PDF_IMPORT_PAGES = 3;
const PDF_IMAGE_QUALITY = 0.9;
const PDF_MAX_IMAGE_WIDTH = 2200;
const DEEPSEEK_VISION_MODEL = "deepseek-v4-flash-vision-exp";
const PHOTO_SEARCH_HEIGHT_RATIO = 0.6;

const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Unable to load image"));
        image.src = src;
    });

export const ResumeWorkbench = () => {
    const t = useTranslations();
    const locale = useLocale();
    const {
        resumes,
        setActiveResume,
        addResume,
        deleteResume,
        createResume,
    } = useResumeStore();
    const {
        deepseekApiKey,
        geminiApiKey,
        geminiModelId,
    } = useAIConfigStore();
    const router = useRouter();
    const [hasConfiguredFolder, setHasConfiguredFolder] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const jsonFileInputRef = useRef<HTMLInputElement>(null);
    const pdfFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadSavedConfig = async () => {
            try {
                const handle = await getFileHandle("syncDirectory");
                const path = await getConfig("syncDirectoryPath");
                if (handle && path) {
                    setHasConfiguredFolder(true);
                }
            } catch (error) {
                console.error("Error loading saved config:", error);
            }
        };

        loadSavedConfig();
    }, []);

    const handleCreateFromModal = (templateId: string | null) => {
        const isBlank = !templateId;
        const newId = createResume(templateId, isBlank);

        if (templateId) {
            const template = DEFAULT_TEMPLATES.find((t) => t.id === templateId);
            if (template) {
                const { resumes, updateResume } = useResumeStore.getState();
                const resume = resumes[newId];
                if (resume) {
                    updateResume(newId, {
                        globalSettings: {
                            ...resume.globalSettings,
                            themeColor: template.colorScheme.primary,
                            sectionSpacing: template.spacing.sectionGap,
                            paragraphSpacing: template.spacing.itemGap,
                            pagePadding: template.spacing.contentPadding,
                        },
                        basic: {
                            ...resume.basic,
                            layout: template.basic.layout,
                        },
                    });
                }
            }
        }

        setIsCreateModalOpen(false);
        setActiveResume(newId);
        router.push({ to: "/app/workbench/$id", params: { id: newId } });
    };

    const duplicateResume = async (resume: any) => {
        const { generateUUID } = await import("@/utils/uuid");
        const now = new Date().toISOString();
        
        const { id, ...rest } = resume;
        const newResume = {
            ...rest,
            id: generateUUID(),
            title: `${resume.title || t("dashboard.resumes.untitled")} - ${t("common.copy")}`,
            createdAt: now,
            updatedAt: now,
        };
        
        const resumeId = addResume(newResume);
        toast.success(t("previewDock.copyResume.success"));
    };

    const importResumeFromJson = async (file: File) => {
        const content = await file.text();
        const config = JSON.parse(content);
        const now = new Date().toISOString();
        const { generateUUID } = await import("@/utils/uuid");
        const { initialResumeState } = await import("@/config/initialResumeData");

        const newResume = {
            ...initialResumeState,
            ...config,
            id: generateUUID(),
            createdAt: now,
            updatedAt: now,
        };
        const resumeId = addResume(newResume);
        setActiveResume(resumeId);
        setIsImportDialogOpen(false);
        toast.success(t("dashboard.resumes.importSuccess"));
        router.push({ to: "/app/workbench/$id", params: { id: resumeId } });
    };

    const extractImagesFromPdf = async (file: File) => {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const buffer = await file.arrayBuffer();
        const typedPdfjs = pdfjs as any;

        typedPdfjs.GlobalWorkerOptions.workerSrc = `${pdfWorkerUrl}?v=2`;

        const loadingTask = typedPdfjs.getDocument({
            data: new Uint8Array(buffer),
        });
        const pdf = await loadingTask.promise;
        const pageImages: string[] = [];
        const totalPages = Math.min(pdf.numPages, MAX_PDF_IMPORT_PAGES);

        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const baseViewport = page.getViewport({ scale: 2 });
            const widthScale = Math.min(1, PDF_MAX_IMAGE_WIDTH / baseViewport.width);
            const viewport = page.getViewport({ scale: 2 * widthScale });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d", { alpha: false });

            if (!context) {
                throw new Error("Unable to create canvas context");
            }

            canvas.width = Math.max(1, Math.floor(viewport.width));
            canvas.height = Math.max(1, Math.floor(viewport.height));

            await page.render({
                canvasContext: context,
                viewport,
            }).promise;

            const imageDataUrl = canvas.toDataURL("image/jpeg", PDF_IMAGE_QUALITY);
            pageImages.push(imageDataUrl);

            canvas.width = 0;
            canvas.height = 0;
        }

        return pageImages;
    };

    const createPhotoSearchImage = async (pageImage: string) => {
        const sourceImage = await loadImage(pageImage);
        const canvas = document.createElement("canvas");
        canvas.width = sourceImage.naturalWidth;
        canvas.height = Math.max(
            1,
            Math.round(sourceImage.naturalHeight * PHOTO_SEARCH_HEIGHT_RATIO)
        );
        const context = canvas.getContext("2d", { alpha: false });

        if (!context) return pageImage;

        context.drawImage(
            sourceImage,
            0,
            0,
            sourceImage.naturalWidth,
            canvas.height,
            0,
            0,
            canvas.width,
            canvas.height
        );
        return canvas.toDataURL("image/jpeg", PDF_IMAGE_QUALITY);
    };

    const extractDetectedPhoto = async (pageImages: string[], detection: any) => {
        const pageNumber = Number(detection?.page);
        const bbox = Array.isArray(detection?.bbox)
            ? detection.bbox.map(Number)
            : [];

        if (
            !Number.isInteger(pageNumber) ||
            pageNumber < 1 ||
            pageNumber > pageImages.length ||
            bbox.length !== 4 ||
            bbox.some((value: number) => !Number.isFinite(value))
        ) {
            return null;
        }

        const coordinateScale = Math.max(...bbox) <= 1 ? 1 : 1000;
        const [rawLeft, rawTop, rawRight, rawBottom] = bbox.map(
            (value: number) => value / coordinateScale
        );

        if (rawRight <= rawLeft || rawBottom <= rawTop) {
            return null;
        }

        const left = Math.max(0, rawLeft);
        const top = Math.max(0, rawTop);
        const right = Math.min(1, rawRight);
        const bottom = Math.min(1, rawBottom);
        if (right <= left || bottom <= top) {
            return null;
        }

        const sourceImage = await loadImage(pageImages[pageNumber - 1]);
        const sourceX = Math.floor(left * sourceImage.naturalWidth);
        const sourceY = Math.floor(top * sourceImage.naturalHeight);
        const sourceWidth = Math.max(
            1,
            Math.ceil((right - left) * sourceImage.naturalWidth)
        );
        const sourceHeight = Math.max(
            1,
            Math.ceil((bottom - top) * sourceImage.naturalHeight)
        );
        const outputScale = Math.min(1, 600 / sourceWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(sourceWidth * outputScale));
        canvas.height = Math.max(1, Math.round(sourceHeight * outputScale));
        const context = canvas.getContext("2d", { alpha: false });

        if (!context) {
            return null;
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(
            sourceImage,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const sourceAspectRatio = sourceWidth / sourceHeight;
        const maxDisplayWidth = 110;
        const maxDisplayHeight = 120;
        let displayWidth = maxDisplayWidth;
        let displayHeight = displayWidth / sourceAspectRatio;

        if (displayHeight > maxDisplayHeight) {
            displayHeight = maxDisplayHeight;
            displayWidth = displayHeight * sourceAspectRatio;
        }

        const knownAspectRatios = [
            { value: "1:1" as const, ratio: 1 },
            { value: "4:3" as const, ratio: 4 / 3 },
            { value: "3:4" as const, ratio: 3 / 4 },
            { value: "16:9" as const, ratio: 16 / 9 },
        ];
        const closestAspectRatio = knownAspectRatios.reduce((closest, current) =>
            Math.abs(current.ratio - sourceAspectRatio) <
            Math.abs(closest.ratio - sourceAspectRatio)
                ? current
                : closest
        );
        const aspectRatio =
            Math.abs(closestAspectRatio.ratio - sourceAspectRatio) <= 0.08
                ? closestAspectRatio.value
                : ("custom" as const);

        return {
            dataUrl: canvas.toDataURL("image/jpeg", 0.92),
            photoConfig: {
                width: Math.max(48, Math.round(displayWidth)),
                height: Math.max(48, Math.round(displayHeight)),
                aspectRatio,
            },
        };
    };

    const importResumeFromPdf = async (file: File) => {
        const useDeepseek = !!deepseekApiKey;
        const hasGeminiFallback = !!(geminiApiKey && geminiModelId);

        if (!useDeepseek && !hasGeminiFallback) {
            toast.error(t("dashboard.resumes.importDialog.visionConfigRequired"));
            router.push("/app/dashboard/ai");
            return;
        }

        const pdfImages = await extractImagesFromPdf(file);
        if (pdfImages.length === 0) {
            throw new Error("No extractable PDF pages");
        }
        const photoSearchImage = await createPhotoSearchImage(pdfImages[0]);

        const response = await fetch("/api/resume-import", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                images: pdfImages,
                photoSearchImage,
                photoSearchHeightRatio: PHOTO_SEARCH_HEIGHT_RATIO,
                provider: useDeepseek ? "deepseek" : "gemini",
                apiKey: useDeepseek ? deepseekApiKey : geminiApiKey,
                model: useDeepseek ? DEEPSEEK_VISION_MODEL : geminiModelId,
                locale,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            const message = data?.details
                ? `${data?.error || "Resume import failed"}\n${data.details}`
                : data?.error || "Resume import failed";
            throw new Error(message);
        }

        const aiResume = data?.resume
            ? data.resume
            : data?.choices?.[0]?.message?.content
                ? extractJsonContent(data.choices[0].message.content)
                : null;

        if (!aiResume) {
            throw new Error("Invalid AI response");
        }

        const nameWithoutExt = file.name.replace(/\.[^.]+$/, "").trim();
        const importedPhoto = await extractDetectedPhoto(pdfImages, aiResume?.photo);
        const resume = createResumeFromAIResult(
            aiResume,
            nameWithoutExt,
            importedPhoto?.dataUrl || "",
            importedPhoto?.photoConfig
        );
        const resumeId = addResume(resume);
        setActiveResume(resumeId);
        setIsImportDialogOpen(false);
        toast.success(t("dashboard.resumes.importDialog.pdfSuccess"));
        router.push({ to: "/app/workbench/$id", params: { id: resumeId } });
    };

    const handleJsonFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || isImporting) return;

        try {
            setIsImporting(true);
            await importResumeFromJson(file);
        } catch (error) {
            console.error("Import JSON error:", error);
            toast.error(t("dashboard.resumes.importError"));
        } finally {
            setIsImporting(false);
        }
    };

    const handlePdfFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || isImporting) return;

        try {
            setIsImporting(true);
            await importResumeFromPdf(file);
        } catch (error) {
            console.error("Import PDF error:", error);
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : t("dashboard.resumes.importDialog.pdfError");
            toast.error(message);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <ScrollArea className="h-[calc(100vh-2rem)] w-full">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 space-y-6 py-8"
            >
                <motion.div
                    className="flex w-full items-center justify-center px-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    {hasConfiguredFolder ? (
                        <Alert className="mb-6 bg-green-50/50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                            <AlertDescription className="flex items-center justify-between">
                                <span className="text-green-700 dark:text-green-400">
                                    {t("dashboard.resumes.synced")}
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="ml-4 hover:bg-green-100 dark:hover:bg-green-900"
                                    onClick={() => {
                                        router.push("/app/dashboard/settings");
                                    }}
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    {t("dashboard.resumes.view")}
                                </Button>
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert
                            variant="destructive"
                            className="mb-6 bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
                        >
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t("dashboard.resumes.notice.title")}</AlertTitle>
                            <AlertDescription className="flex items-center justify-between">
                                <span className="text-red-700 dark:text-red-400">
                                    {t("dashboard.resumes.notice.description")}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-4 hover:bg-red-100 dark:hover:bg-red-900"
                                    onClick={() => {
                                        router.push("/app/dashboard/settings");
                                    }}
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    {t("dashboard.resumes.notice.goToSettings")}
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </motion.div>

                <motion.div
                    className="px-4 sm:px-6 flex items-center justify-between"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        {t("dashboard.resumes.myResume")}
                    </h1>
                    <div className="flex items-center space-x-2">
                        <AnimatedImportButton onClick={() => setIsImportDialogOpen(true)} t={t} />
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                            <Button
                                onClick={() => setIsCreateModalOpen(true)}
                                variant="default"
                                className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                {t("dashboard.resumes.create")}
                            </Button>
                        </motion.div>
                    </div>
                </motion.div>

                <motion.div
                    className="flex-1 w-full p-3 sm:p-6"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Card
                                className={cn(
                                    "relative border border-dashed cursor-pointer transition-all duration-200 aspect-[210/297] flex flex-col",
                                    "hover:border-gray-400 hover:bg-gray-50",
                                    "dark:hover:border-primary dark:hover:bg-primary/10"
                                )}
                            >
                                <CardContent className="flex-1 p-0 text-center flex flex-col items-center justify-center">
                                    <motion.div
                                        className="mb-4 p-4 rounded-full bg-gray-100 dark:bg-primary/10"
                                        whileHover={{ rotate: 90 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Plus className="h-8 w-8 text-gray-600 dark:text-primary" />
                                    </motion.div>
                                    <CardTitle className="text-xl text-gray-900 dark:text-gray-100 px-4">
                                        {t("dashboard.resumes.newResume")}
                                    </CardTitle>
                                    <CardDescription className="mt-2 text-gray-600 dark:text-gray-400 px-4">
                                        {t("dashboard.resumes.newResumeDescription")}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <AnimatePresence>
                            {Object.entries(resumes)
                                .sort(([, a], [, b]) => {
                                    const dateA = new Date(a.createdAt || 0).getTime();
                                    const dateB = new Date(b.createdAt || 0).getTime();
                                    return dateB - dateA;
                                })
                                .map(([id, resume], index) => (
                                    <ResumeCardItem
                                        key={id}
                                        id={id}
                                        resume={resume}
                                        t={t}
                                        locale={locale}
                                        setActiveResume={setActiveResume}
                                        router={router}
                                        deleteResume={deleteResume}
                                        duplicateResume={duplicateResume}
                                        index={index}
                                    />
                                ))}
                        </AnimatePresence>
                    </div>
                </motion.div>

                <CreateResumeModal
                    open={isCreateModalOpen}
                    onOpenChange={setIsCreateModalOpen}
                    onCreate={handleCreateFromModal}
                />

                <ImportResumeDialog
                    open={isImportDialogOpen}
                    isImporting={isImporting}
                    onOpenChange={setIsImportDialogOpen}
                    jsonFileInputRef={jsonFileInputRef}
                    pdfFileInputRef={pdfFileInputRef}
                    onJsonFileChange={handleJsonFileChange}
                    onPdfFileChange={handlePdfFileChange}
                />
            </motion.div>
        </ScrollArea>
    );
};
