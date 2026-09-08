import { motion } from "framer-motion";
import { Education, GlobalSettings } from "@/types/resume";
import { cn, formatDateRange } from "@/lib/utils";
import { hasMeaningfulRichTextContent, normalizeRichTextContent } from "@/lib/richText";

interface CompactEducationListProps {
  education?: Education[];
  globalSettings?: GlobalSettings;
  locale: string;
  sidebar?: boolean;
}

const CompactEducationList = ({ education, globalSettings, locale, sidebar = false }: CompactEducationListProps) => {
  const visibleEducation = education?.filter((edu) => edu.visible);
  const paragraphSpacing = globalSettings?.paragraphSpacing ?? 12;

  return visibleEducation?.map((edu, index) => {
    const dateRange = formatDateRange(edu.startDate, edu.endDate, locale)
      .replaceAll("/", ".")
      .replace(" - ", " – ");
    const summary = [
      edu.school,
      edu.major,
      edu.degree,
      dateRange,
      edu.gpa ? `GPA ${edu.gpa}` : "",
    ].filter(Boolean).join(" | ");

    return (
      <motion.div
        key={edu.id}
        layout="position"
        style={{ marginTop: `${index === 0 ? paragraphSpacing : Math.max(paragraphSpacing, 12)}px` }}
      >
        <div
          className={cn("font-bold", sidebar ? "text-white" : "text-baseFont")}
          style={{ fontSize: `${sidebar ? globalSettings?.baseFontSize || 14 : globalSettings?.subheaderSize || 16}px` }}
          suppressHydrationWarning
        >
          {summary}
        </div>
        {hasMeaningfulRichTextContent(edu.description) && (
          <div
            className={cn(
              "mt-3 text-baseFont [&_p]:my-0 [&_ul]:my-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-0 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0",
              sidebar && "text-white opacity-90",
            )}
            style={{
              fontSize: `${sidebar ? Math.max((globalSettings?.baseFontSize || 14) - 2, 10) : globalSettings?.baseFontSize || 14}px`,
              lineHeight: globalSettings?.lineHeight || 1.6,
            }}
            dangerouslySetInnerHTML={{ __html: normalizeRichTextContent(edu.description) }}
          />
        )}
      </motion.div>
    );
  });
};

export default CompactEducationList;
