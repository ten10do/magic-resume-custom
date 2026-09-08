import { motion } from "framer-motion";
import { GlobalSettings } from "@/types/resume";
import { cn, formatDateString } from "@/lib/utils";

interface DateRoleHeaderProps {
  title: string;
  date?: string;
  role?: string;
  locale: string;
  globalSettings?: GlobalSettings;
  sidebar?: boolean;
}

const DateRoleHeader = ({ title, date, role, locale, globalSettings, sidebar = false }: DateRoleHeaderProps) => {
  const formattedDate = formatDateString(date, locale)
    .replaceAll("/", ".")
    .replace(" - ", "-");
  const meta = [formattedDate, role].filter(Boolean).join(" | ");

  return (
    <motion.div layout="position" className="flex items-baseline justify-between gap-x-4 gap-y-1">
      <h3
        className={cn("min-w-0 font-bold", sidebar ? "text-white" : "text-baseFont")}
        style={{ fontSize: `${sidebar ? globalSettings?.baseFontSize || 14 : globalSettings?.subheaderSize || 16}px` }}
      >
        {title}
      </h3>
      <div
        className={cn("ml-auto shrink-0 whitespace-nowrap text-subtitleFont", sidebar && "text-white opacity-90")}
        style={{ fontSize: `${sidebar ? Math.max((globalSettings?.baseFontSize || 14) - 2, 10) : globalSettings?.subheaderSize || 16}px` }}
        suppressHydrationWarning
      >
        {meta}
      </div>
    </motion.div>
  );
};

export default DateRoleHeader;
