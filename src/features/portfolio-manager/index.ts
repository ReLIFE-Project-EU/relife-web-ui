/**
 * Portfolio Manager feature exports.
 * Provides file upload and portfolio management for building data.
 */

// Types
export type {
  Portfolio,
  PortfolioFile,
  StorageQuota,
  UploadProgress,
  UploadStatus,
} from "./types";

// Constants
export {
  FILE_UPLOAD_CONFIG,
  STORAGE_BUCKET,
  FILE_TYPE_LABELS,
  getFileTypeLabel,
} from "./constants";

// Context and Provider
export { PortfolioProvider } from "./context/PortfolioContext";
export type { PortfolioState, PortfolioAction } from "./context/types";

// Hooks
export {
  usePortfolio,
  usePortfolios,
  useCurrentPortfolioId,
  usePortfoliosLoading,
} from "./hooks/usePortfolio";
export { useFileUpload } from "./hooks/useFileUpload";
export { useQuota } from "./hooks/useQuota";

// Components
export { PortfolioManager } from "./components/PortfolioManager";
export {
  PortfolioSelector,
  CreatePortfolioModal,
} from "./components/PortfolioSelector";
export {
  FileUploader,
  UploadProgress as UploadProgressComponent,
} from "./components/FileUploader";
export { FileList, FileActions } from "./components/FileList";
export { QuotaIndicator } from "./components/QuotaIndicator";
export { FileIcon, ConfirmDeleteModal } from "./components/shared";
