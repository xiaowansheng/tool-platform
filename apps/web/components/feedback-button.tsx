"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Send, Copy, Mail, Check, AlertCircle, RefreshCw } from "lucide-react";
import { getAllTools } from "@tool-platform/tool-sdk";

const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || "xiaowansheng@foxmail.com";

export function FeedbackButton({
  className,
  children,
  variant = "button"
}: {
  className?: string;
  children?: React.ReactNode;
  variant?: "button" | "link";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("bug");
  const [isManualTool, setIsManualTool] = useState(true);
  const [selectedTool, setSelectedTool] = useState("general");
  const [manualToolText, setManualToolText] = useState("");
  const [env, setEnv] = useState("");
  const [content, setContent] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);

  const t = useTranslations("feedback");
  const tools = getAllTools();

  const types = [
    { id: "bug", label: t("typeBug") },
    { id: "feature", label: t("typeFeature") },
    { id: "tool", label: t("typeTool") },
    { id: "other", label: t("typeOther") }
  ];

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(FEEDBACK_EMAIL);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (err) {
      console.error("Failed to copy email address", err);
    }
  };

  const getTemplateContent = () => {
    const typeLabel = types.find((t) => t.id === type)?.label || type;
    const toolLabel = isManualTool
      ? manualToolText || "Not specified"
      : selectedTool === "general"
      ? t("toolAll")
      : tools.find((t) => t.id === selectedTool)?.name + ` (${selectedTool})`;

    return `## Tool Platform Feedback

- **Feedback Type**: ${typeLabel}
- **Target Tool**: ${toolLabel}
- **Environment**: ${env || "Not specified"}

### Details
${content}
`;
  };

  const handleCopyTemplate = async () => {
    if (!content.trim()) {
      setShowValidationError(true);
      return;
    }
    setShowValidationError(false);

    try {
      await navigator.clipboard.writeText(getTemplateContent());
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 3000);
    } catch (err) {
      console.error("Failed to copy template", err);
    }
  };

  const handleSendEmail = () => {
    if (!content.trim()) {
      setShowValidationError(true);
      return;
    }
    setShowValidationError(false);

    const typeLabel = types.find((t) => t.id === type)?.label.replace(/^[^\s]+\s/, "") || type;
    const toolLabel = isManualTool ? manualToolText || "Custom" : selectedTool;
    const subject = encodeURIComponent(`[Tool Platform Feedback] ${typeLabel} - ${toolLabel}`);
    const body = encodeURIComponent(getTemplateContent());
    window.open(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`, "_blank");
  };

  const triggerModal = () => {
    setIsOpen(true);
    setShowValidationError(false);
    setCopiedTemplate(false);
    setCopiedEmail(false);
    setIsManualTool(true);
    setSelectedTool("general");
    setManualToolText("");
    setEnv("");
    setContent("");
  };

  if (variant === "link") {
    return (
      <>
        <button
          type="button"
          onClick={triggerModal}
          className="text-left bg-transparent border-none p-0 m-0 font-inherit text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer block py-1"
        >
          {children || t("title")}
        </button>
        {isOpen && renderModal()}
      </>
    );
  }

  return (
    <>
      <button type="button" className={className} onClick={triggerModal}>
        {children}
      </button>
      {isOpen && renderModal()}
    </>
  );

  function renderModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-all duration-300">
        {/* Backdrop overlay */}
        <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

        {/* Modal content */}
        <div className="relative w-full max-w-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-lg)] dark:shadow-black/40 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 z-10 text-[var(--text-primary)]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("title")}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t("description")}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-emphasis)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Type */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                {t("type")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {types.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                      type === item.id
                        ? "bg-[var(--accent-primary-dim)] border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-[var(--shadow-glow)]"
                        : "bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Tool */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {t("tool")}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualTool(!isManualTool);
                    if (isManualTool) {
                      setSelectedTool("general");
                    } else {
                      setManualToolText("");
                    }
                  }}
                  className="text-xs text-[var(--accent-primary)] hover:underline cursor-pointer flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  {isManualTool ? t("selectFromList") : t("inputManually")}
                </button>
              </div>

              {isManualTool ? (
                <input
                  type="text"
                  value={manualToolText}
                  onChange={(e) => setManualToolText(e.target.value)}
                  placeholder={t("manualToolPlaceholder")}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--input-focus-ring)] transition-all"
                />
              ) : (
                <select
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--input-focus-ring)] transition-all cursor-pointer"
                >
                  <option value="general">{t("toolAll")}</option>
                  {tools.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Environment */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                {t("environment")}
              </label>
              <input
                type="text"
                value={env}
                onChange={(e) => setEnv(e.target.value)}
                placeholder={t("envPlaceholder")}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--input-focus-ring)] transition-all"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                <span className="text-[var(--text-tertiary)]">{t("envQuickTags")}</span>
                {["Chrome", "Safari", "Edge", "Firefox", "macOS", "Windows", "Linux", "Mobile"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setEnv((prev) => (prev ? `${prev} / ${tag}` : tag));
                    }}
                    className="px-2 py-0.5 rounded bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-emphasis)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Content */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center justify-between">
                <span>{t("content")}</span>
                <span className="text-[var(--accent-danger)] text-xs font-normal">*</span>
              </label>
              <textarea
                required
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (e.target.value.trim()) {
                    setShowValidationError(false);
                  }
                }}
                placeholder={t("contentPlaceholder")}
                rows={4}
                className={`w-full bg-[var(--input-bg)] border rounded-lg p-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] transition-all resize-none ${
                  showValidationError
                    ? "border-[var(--accent-danger)] focus:border-[var(--accent-danger)]"
                    : "border-[var(--input-border)] focus:border-[var(--accent-primary)]"
                }`}
              />
              {showValidationError && (
                <span className="text-xs text-[var(--accent-danger)] flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t("requiredField")}
                </span>
              )}
            </div>

            {/* Email Notice Card */}
            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Mail className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>
                  {t("emailNotice")}: <strong className="text-[var(--text-primary)]">{FEEDBACK_EMAIL}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="text-xs px-2.5 py-1.5 rounded-md bg-[var(--bg-emphasis)] hover:bg-[var(--accent-primary-dim)] hover:text-[var(--accent-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all cursor-pointer font-medium"
              >
                {copiedEmail ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border-default)] bg-[var(--bg-inset)]">
            {copiedTemplate && (
              <span className="text-xs text-[var(--accent-success)] flex items-center gap-1 mr-auto animate-in fade-in duration-200">
                <Check className="w-4 h-4" />
                {t("copied")}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="feedback-dialog__btn-close"
            >
              {t("close")}
            </button>
            <button
              type="button"
              onClick={handleCopyTemplate}
              className="feedback-dialog__btn-secondary"
            >
              <Copy className="w-4 h-4" />
              {t("copyTemplate")}
            </button>
            <button
              type="button"
              onClick={handleSendEmail}
              className="feedback-dialog__btn-primary"
            >
              <Send className="w-4 h-4" />
              {t("sendEmail")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
