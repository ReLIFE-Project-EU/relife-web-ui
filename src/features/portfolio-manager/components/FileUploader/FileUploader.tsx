/**
 * File uploader component with drag & drop support.
 */

import { Group, Stack, Text, rem } from "@mantine/core";
import { Dropzone, type FileRejection } from "@mantine/dropzone";
import { IconFile, IconUpload, IconX } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { FILE_UPLOAD_CONFIG } from "../../constants";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useQuota } from "../../hooks/useQuota";
import { UploadProgress } from "./UploadProgress";

export function FileUploader() {
  const { uploadFiles, uploads, clearCompletedUploads, isUploading } =
    useFileUpload();
  const { checkUploadAllowed, formatBytes } = useQuota();
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (files: File[]) => {
      setError(null);

      // Check total size against quota
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (!checkUploadAllowed(totalSize)) {
        setError("Not enough storage space for these files");
        return;
      }

      await uploadFiles(files);
    },
    [uploadFiles, checkUploadAllowed],
  );

  const handleReject = useCallback((fileRejections: FileRejection[]) => {
    const errors = fileRejections.map((rejection) => {
      const reasons = rejection.errors.map((e) => {
        if (e.code === "file-invalid-type") {
          return "Invalid file type";
        }
        if (e.code === "file-too-large") {
          return "File too large (max 50MB)";
        }
        return e.message;
      });
      return `${rejection.file.name}: ${reasons.join(", ")}`;
    });
    setError(errors.join("; "));
  }, []);

  return (
    <Stack gap="sm">
      <Dropzone
        onDrop={handleDrop}
        onReject={handleReject}
        maxSize={FILE_UPLOAD_CONFIG.MAX_FILE_SIZE}
        accept={[...FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES]}
        loading={isUploading}
      >
        <Group
          justify="center"
          gap="xl"
          mih={120}
          style={{ pointerEvents: "none" }}
        >
          <Dropzone.Accept>
            <IconUpload
              style={{
                width: rem(52),
                height: rem(52),
                color: "var(--mantine-color-blue-6)",
              }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{
                width: rem(52),
                height: rem(52),
                color: "var(--mantine-color-red-6)",
              }}
              stroke={1.5}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFile
              style={{
                width: rem(52),
                height: rem(52),
                color: "var(--mantine-color-dimmed)",
              }}
              stroke={1.5}
            />
          </Dropzone.Idle>

          <div>
            <Text size="lg" inline>
              Drag files here or click to select
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Supported: CSV, Excel (.xlsx, .xls), JSON
            </Text>
            <Text size="xs" c="dimmed" inline mt={4}>
              Max {formatBytes(FILE_UPLOAD_CONFIG.MAX_FILE_SIZE)} per file
            </Text>
          </div>
        </Group>
      </Dropzone>

      {error && (
        <Text size="sm" c="red">
          {error}
        </Text>
      )}

      <UploadProgress uploads={uploads} onClear={clearCompletedUploads} />
    </Stack>
  );
}
