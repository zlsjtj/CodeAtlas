"use client";

import { FormEvent, useState } from "react";

import type { RepositoryCreatePayload, RepositorySourceType } from "@/lib/types";
import { getWorkspaceCopy, type WorkspaceLocale } from "@/lib/workspace-i18n";

type RepositoryImportFormProps = {
  isSubmitting: boolean;
  locale: WorkspaceLocale;
  onSubmit: (payload: RepositoryCreatePayload) => Promise<void> | void;
};

type FormState = {
  name: string;
  source_type: RepositorySourceType;
  root_path: string;
  source_url: string;
  default_branch: string;
};

const initialState: FormState = {
  name: "",
  source_type: "local",
  root_path: "",
  source_url: "",
  default_branch: "main",
};

export function RepositoryImportForm({
  isSubmitting,
  locale,
  onSubmit,
}: RepositoryImportFormProps) {
  const copy = getWorkspaceCopy(locale);
  const [form, setForm] = useState<FormState>(initialState);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: RepositoryCreatePayload = {
      name: form.name.trim() || undefined,
      source_type: form.source_type,
    };

    if (form.source_type === "local") {
      payload.root_path = form.root_path.trim();
    } else {
      payload.source_url = form.source_url.trim();
      payload.default_branch = form.default_branch.trim() || undefined;
    }

    await onSubmit(payload);
  }

  return (
    <section className="panel-card">
      <h2 className="panel-title">{copy.repositoryImport.title}</h2>
      <p className="panel-copy">{copy.repositoryImport.description}</p>
      <form className="field-grid" onSubmit={handleSubmit}>
        <div className="field-row">
          <label className="field-label">
            {copy.repositoryImport.name}
            <input
              onChange={(event) => updateField("name", event.target.value)}
              placeholder={copy.repositoryImport.namePlaceholder}
              value={form.name}
            />
          </label>
          <label className="field-label">
            {copy.repositoryImport.sourceType}
            <select
              onChange={(event) =>
                updateField("source_type", event.target.value as RepositorySourceType)
              }
              value={form.source_type}
            >
              <option value="local">{copy.repositoryImport.localOption}</option>
              <option value="github">{copy.repositoryImport.githubOption}</option>
            </select>
          </label>
        </div>

        {form.source_type === "local" ? (
          <label className="field-label">
            {copy.repositoryImport.localPath}
            <input
              onChange={(event) => updateField("root_path", event.target.value)}
              placeholder={copy.repositoryImport.localPathPlaceholder}
              value={form.root_path}
            />
          </label>
        ) : (
          <div className="field-row">
            <label className="field-label">
              {copy.repositoryImport.githubUrl}
              <input
                onChange={(event) => updateField("source_url", event.target.value)}
                placeholder={copy.repositoryImport.githubUrlPlaceholder}
                value={form.source_url}
              />
            </label>
            <label className="field-label">
              {copy.repositoryImport.defaultBranch}
              <input
                onChange={(event) => updateField("default_branch", event.target.value)}
                placeholder={copy.repositoryImport.defaultBranchPlaceholder}
                value={form.default_branch}
              />
            </label>
          </div>
        )}

        <p className="field-help">{copy.repositoryImport.help}</p>

        <div className="button-row">
          <button className="button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? copy.repositoryImport.submitting : copy.repositoryImport.submit}
          </button>
          <button
            className="button-secondary"
            disabled={isSubmitting}
            onClick={() => setForm(initialState)}
            type="button"
          >
            {copy.repositoryImport.reset}
          </button>
        </div>
      </form>
    </section>
  );
}
