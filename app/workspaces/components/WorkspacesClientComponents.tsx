"use client";
import dynamic from "next/dynamic";
import WorkspaceGridSkeleton from "../workspace-grid-skeleton";

export const CreateWorkspaceDialog = dynamic(
  () => import("@/components/CreateWorkspaceDialog").then(mod => ({ default: mod.CreateWorkspaceDialog })),
  {
    loading: () => null,
    ssr: false,
  }
);

export const WorkspaceGrid = dynamic(() => import("../workspace-grid"), {
  loading: WorkspaceGridSkeleton,
  ssr: false,
});

export const WorkspaceEmptyState = dynamic(() => import("../workspace-empty-state"), {
  loading: () => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center animate-pulse">
      <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto"></div>
    </div>
  ),
  ssr: false,
});
